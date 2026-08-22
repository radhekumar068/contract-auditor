package com.contractauditor.service.impl;

import com.contractauditor.domain.entity.ContractTerm;
import com.contractauditor.domain.entity.NotificationSchedule;
import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.enums.NotificationEventType;
import com.contractauditor.repository.NotificationScheduleRepository;
import com.contractauditor.service.NotificationSchedulerService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationSchedulerServiceImpl implements NotificationSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationSchedulerServiceImpl.class);

    private final NotificationScheduleRepository notificationScheduleRepository;
    private final JavaMailSender mailSender;

    public NotificationSchedulerServiceImpl(
            NotificationScheduleRepository notificationScheduleRepository,
            JavaMailSender mailSender) {
        this.notificationScheduleRepository = notificationScheduleRepository;
        this.mailSender = mailSender;
    }

    @Override
    @Scheduled(cron = "${app.notification.scheduler-cron}")
    @Transactional
    public void processDueNotifications() {
        log.info("NotificationSchedulerServiceImpl.processDueNotifications entered");
        LocalDate today = LocalDate.now();
        List<NotificationSchedule> schedules = notificationScheduleRepository.findAllEnabledWithSubscriptionDetails();
        log.debug("NotificationSchedulerServiceImpl.processDueNotifications loaded schedules={}", schedules.size());

        int sent = 0;
        for (NotificationSchedule schedule : schedules) {
            Subscription subscription = schedule.getSubscription();
            ContractTerm term = subscription.getContractTerm();
            if (term == null) {
                continue;
            }

            LocalDate eventDate = resolveEventDate(schedule.getEventType(), term);
            if (eventDate == null) {
                continue;
            }

            LocalDate notifyDate = eventDate.minusDays(schedule.getDaysBeforeEvent());
            if (!today.equals(notifyDate)) {
                continue;
            }

            if (schedule.getLastSentAt() != null
                    && schedule.getLastSentAt().isAfter(Instant.now().minus(20, ChronoUnit.HOURS))) {
                continue;
            }

            sendNotification(subscription, schedule, eventDate);
            schedule.setLastSentAt(Instant.now());
            notificationScheduleRepository.save(schedule);
            sent++;
        }
        log.info("NotificationSchedulerServiceImpl.processDueNotifications completed sent={}", sent);
    }

    private LocalDate resolveEventDate(NotificationEventType eventType, ContractTerm term) {
        log.debug("NotificationSchedulerServiceImpl.resolveEventDate eventType={}", eventType);
        return switch (eventType) {
            case TRIAL_END -> term.getTrialEndDate();
            case RENEWAL_LOCK -> term.getRenewalDate() == null
                    ? null
                    : term.getRenewalDate().minusDays(term.getCancellationDeadlineDays());
            case RENEWAL_UPCOMING -> term.getRenewalDate();
            case WARRANTY_EXPIRY, CONTRACT_END -> term.getContractEndDate();
        };
    }

    private void sendNotification(Subscription subscription, NotificationSchedule schedule, LocalDate eventDate) {
        log.debug(
                "NotificationSchedulerServiceImpl.sendNotification subscriptionId={} eventType={}",
                subscription.getId(),
                schedule.getEventType());
        String recipient = subscription.getUser().getEmail();
        String subject = buildSubject(subscription.getName(), schedule.getEventType());
        String body = buildBody(subscription, schedule.getEventType(), eventDate);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info(
                    "NotificationSchedulerServiceImpl.sendNotification sent eventType={} subscriptionId={} recipient={}",
                    schedule.getEventType(),
                    subscription.getId(),
                    recipient);
        } catch (Exception ex) {
            log.warn(
                    "NotificationSchedulerServiceImpl.sendNotification failed subscriptionId={}: {}",
                    subscription.getId(),
                    ex.getMessage());
        }
    }

    private String buildSubject(String subscriptionName, NotificationEventType eventType) {
        log.debug("NotificationSchedulerServiceImpl.buildSubject eventType={}", eventType);
        return switch (eventType) {
            case TRIAL_END -> "Trial ending soon: " + subscriptionName;
            case RENEWAL_LOCK -> "Cancellation window closing: " + subscriptionName;
            case RENEWAL_UPCOMING -> "Renewal approaching: " + subscriptionName;
            case WARRANTY_EXPIRY -> "Warranty expiring: " + subscriptionName;
            case CONTRACT_END -> "Contract ending: " + subscriptionName;
        };
    }

    private String buildBody(Subscription subscription, NotificationEventType eventType, LocalDate eventDate) {
        log.debug(
                "NotificationSchedulerServiceImpl.buildBody subscriptionId={} eventType={}",
                subscription.getId(),
                eventType);
        StringBuilder body = new StringBuilder();
        body.append("Hello ").append(subscription.getUser().getFullName()).append(",\n\n");
        body.append("Your commitment '").append(subscription.getName()).append("' (").append(subscription.getProvider()).append(") ");
        body.append("has an upcoming ").append(formatEventType(eventType)).append(" on ").append(eventDate).append(".\n\n");

        if (subscription.getCancellationWorkflow() != null && !subscription.getCancellationWorkflow().isBlank()) {
            body.append("Cancellation steps:\n").append(subscription.getCancellationWorkflow()).append("\n\n");
        }
        if (subscription.getNegotiationWorkflow() != null && !subscription.getNegotiationWorkflow().isBlank()) {
            body.append("Negotiation steps:\n").append(subscription.getNegotiationWorkflow()).append("\n\n");
        }

        body.append("Amount: ").append(subscription.getContractTerm().getAmount())
                .append(" ").append(subscription.getContractTerm().getCurrency()).append("\n");
        body.append("\n— Contract Life Cycle Auditor");
        return body.toString();
    }

    private String formatEventType(NotificationEventType eventType) {
        log.debug("NotificationSchedulerServiceImpl.formatEventType eventType={}", eventType);
        return switch (eventType) {
            case TRIAL_END -> "trial end date";
            case RENEWAL_LOCK -> "cancellation deadline";
            case RENEWAL_UPCOMING -> "renewal date";
            case WARRANTY_EXPIRY -> "warranty expiration";
            case CONTRACT_END -> "contract end date";
        };
    }
}
