package com.contractauditor.service.impl;

import com.contractauditor.domain.entity.ContractTerm;
import com.contractauditor.domain.entity.NotificationSchedule;
import com.contractauditor.domain.entity.RenewalHistory;
import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.entity.User;
import com.contractauditor.domain.enums.BillingFrequency;
import com.contractauditor.domain.enums.NotificationEventType;
import com.contractauditor.domain.enums.SubscriptionStatus;
import com.contractauditor.dto.request.CreateSubscriptionRequest;
import com.contractauditor.dto.request.RecordRenewalRequest;
import com.contractauditor.dto.request.UpdateSubscriptionRequest;
import com.contractauditor.dto.response.RenewalHistoryResponse;
import com.contractauditor.dto.response.SubscriptionResponse;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.exception.ResourceNotFoundException;
import com.contractauditor.mapper.SubscriptionMapper;
import com.contractauditor.repository.RenewalHistoryRepository;
import com.contractauditor.repository.SubscriptionRepository;
import com.contractauditor.security.SecurityUtils;
import com.contractauditor.service.CostSummaryService;
import com.contractauditor.service.SubscriptionService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionServiceImpl implements SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionServiceImpl.class);

    private final SubscriptionRepository subscriptionRepository;
    private final RenewalHistoryRepository renewalHistoryRepository;
    private final SubscriptionMapper subscriptionMapper;
    private final SecurityUtils securityUtils;
    private final CostSummaryService costSummaryService;
    private final int defaultReminderDays;

    public SubscriptionServiceImpl(
            SubscriptionRepository subscriptionRepository,
            RenewalHistoryRepository renewalHistoryRepository,
            SubscriptionMapper subscriptionMapper,
            SecurityUtils securityUtils,
            CostSummaryService costSummaryService,
            @Value("${app.notification.default-reminder-days}") int defaultReminderDays) {
        this.subscriptionRepository = subscriptionRepository;
        this.renewalHistoryRepository = renewalHistoryRepository;
        this.subscriptionMapper = subscriptionMapper;
        this.securityUtils = securityUtils;
        this.costSummaryService = costSummaryService;
        this.defaultReminderDays = defaultReminderDays;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SubscriptionResponse> findAll(Pageable pageable) {
        log.info(
                "SubscriptionServiceImpl.findAll entered page={} size={}",
                pageable.getPageNumber(),
                pageable.getPageSize());
        User user = securityUtils.getCurrentUser();
        Page<SubscriptionResponse> page = subscriptionRepository.findByUserId(user.getId(), pageable)
                .map(subscriptionMapper::toResponse);
        log.info(
                "SubscriptionServiceImpl.findAll completed userId={} totalElements={}",
                user.getId(),
                page.getTotalElements());
        return page;
    }

    @Override
    @Transactional(readOnly = true)
    public SubscriptionResponse findById(Long id) {
        log.info("SubscriptionServiceImpl.findById entered id={}", id);
        User user = securityUtils.getCurrentUser();
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));
        log.info("SubscriptionServiceImpl.findById completed id={} userId={}", id, user.getId());
        return subscriptionMapper.toResponse(subscription);
    }

    @Override
    @Transactional
    public SubscriptionResponse create(CreateSubscriptionRequest request) {
        log.info("SubscriptionServiceImpl.create entered name={}", request.name());
        User user = securityUtils.getCurrentUser();
        Subscription subscription = new Subscription();
        subscription.setUser(user);
        subscription.setName(sanitize(request.name()));
        subscription.setCategory(sanitize(request.category()));
        subscription.setProvider(sanitize(request.provider()));
        subscription.setStatus(request.status());
        subscription.setCommitmentType(request.commitmentType());
        subscription.setStartDate(request.startDate());
        subscription.setNotes(sanitizeNullable(request.notes()));
        subscription.setCancellationWorkflow(sanitizeNullable(request.cancellationWorkflow()));
        subscription.setNegotiationWorkflow(sanitizeNullable(request.negotiationWorkflow()));

        ContractTerm contractTerm = mapContractTerm(request.contractTerm(), user.getPreferredCurrency());
        subscription.setContractTerm(contractTerm);

        List<NotificationSchedule> schedules = mapNotificationSchedules(request, subscription);
        subscription.setNotificationSchedules(schedules);

        Subscription saved = subscriptionRepository.save(subscription);
        log.debug("SubscriptionServiceImpl.create persisted subscriptionId={}", saved.getId());
        costSummaryService.generateMonthlySummary(saved);
        log.info("SubscriptionServiceImpl.create completed subscriptionId={} userId={}", saved.getId(), user.getId());
        return subscriptionMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public SubscriptionResponse update(Long id, UpdateSubscriptionRequest request) {
        log.info("SubscriptionServiceImpl.update entered id={}", id);
        User user = securityUtils.getCurrentUser();
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));

        subscription.setName(sanitize(request.name()));
        subscription.setCategory(sanitize(request.category()));
        subscription.setProvider(sanitize(request.provider()));
        subscription.setStatus(request.status());
        subscription.setCommitmentType(request.commitmentType());
        subscription.setStartDate(request.startDate());
        subscription.setNotes(sanitizeNullable(request.notes()));
        subscription.setCancellationWorkflow(sanitizeNullable(request.cancellationWorkflow()));
        subscription.setNegotiationWorkflow(sanitizeNullable(request.negotiationWorkflow()));

        ContractTerm contractTerm = subscription.getContractTerm();
        if (contractTerm == null) {
            contractTerm = new ContractTerm();
            subscription.setContractTerm(contractTerm);
        }
        contractTerm.setBillingFrequency(request.billingFrequency());
        contractTerm.setAmount(request.amount());
        contractTerm.setCurrency(request.currency().toUpperCase());
        contractTerm.setTrialEndDate(request.trialEndDate());
        contractTerm.setRenewalDate(request.renewalDate());
        contractTerm.setCancellationDeadlineDays(request.cancellationDeadlineDays());
        contractTerm.setAutoRenew(request.autoRenew());
        contractTerm.setContractEndDate(request.contractEndDate());
        contractTerm.setIsRefundable(request.isRefundable());

        Subscription saved = subscriptionRepository.save(subscription);
        costSummaryService.generateMonthlySummary(saved);
        log.info("SubscriptionServiceImpl.update completed id={} userId={}", id, user.getId());
        return subscriptionMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("SubscriptionServiceImpl.delete entered id={}", id);
        User user = securityUtils.getCurrentUser();
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));
        subscriptionRepository.delete(subscription);
        log.info("SubscriptionServiceImpl.delete completed id={} userId={}", id, user.getId());
    }

    @Override
    @Transactional
    public RenewalHistoryResponse recordRenewal(Long id, RecordRenewalRequest request) {
        log.info("SubscriptionServiceImpl.recordRenewal entered id={}", id);
        User user = securityUtils.getCurrentUser();
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));

        ContractTerm contractTerm = subscription.getContractTerm();
        if (contractTerm == null) {
            log.warn("SubscriptionServiceImpl.recordRenewal missing contract term id={}", id);
            throw new BadRequestException("Contract term is required to record a renewal");
        }

        BigDecimal changePercentage = BigDecimal.ZERO;
        if (request.previousAmount().compareTo(BigDecimal.ZERO) > 0) {
            changePercentage = request.newAmount()
                    .subtract(request.previousAmount())
                    .divide(request.previousAmount(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        RenewalHistory history = new RenewalHistory();
        history.setSubscription(subscription);
        history.setPreviousAmount(request.previousAmount());
        history.setNewAmount(request.newAmount());
        history.setRenewalDate(request.renewalDate());
        history.setChangePercentage(changePercentage);
        history.setNotes(sanitizeNullable(request.notes()));
        renewalHistoryRepository.save(history);

        contractTerm.setAmount(request.newAmount());
        contractTerm.setRenewalDate(
                request.renewalDate().plusMonths(monthsForFrequency(contractTerm.getBillingFrequency())));

        costSummaryService.generateMonthlySummary(subscription);
        log.info("SubscriptionServiceImpl.recordRenewal completed id={} userId={}", id, user.getId());
        return subscriptionMapper.toRenewalHistoryResponse(history);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RenewalHistoryResponse> getRenewalHistory(Long subscriptionId) {
        log.info("SubscriptionServiceImpl.getRenewalHistory entered subscriptionId={}", subscriptionId);
        User user = securityUtils.getCurrentUser();
        subscriptionRepository.findByIdAndUserId(subscriptionId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", subscriptionId));
        List<RenewalHistoryResponse> history = renewalHistoryRepository
                .findBySubscriptionIdOrderByRenewalDateDesc(subscriptionId)
                .stream()
                .map(subscriptionMapper::toRenewalHistoryResponse)
                .toList();
        log.info(
                "SubscriptionServiceImpl.getRenewalHistory completed subscriptionId={} records={}",
                subscriptionId,
                history.size());
        return history;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionResponse> findAllForUser() {
        log.info("SubscriptionServiceImpl.findAllForUser entered");
        User user = securityUtils.getCurrentUser();
        List<SubscriptionResponse> subscriptions = subscriptionRepository.findByUserId(user.getId()).stream()
                .map(subscriptionMapper::toResponse)
                .toList();
        log.info(
                "SubscriptionServiceImpl.findAllForUser completed userId={} count={}",
                user.getId(),
                subscriptions.size());
        return subscriptions;
    }

    @Override
    @Transactional
    public SubscriptionResponse snooze(Long id, int days) {
        log.info("SubscriptionServiceImpl.snooze entered id={} days={}", id, days);
        if (days < 1 || days > 90) {
            throw new BadRequestException("Snooze days must be between 1 and 90");
        }
        User user = securityUtils.getCurrentUser();
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));
        subscription.setSnoozedUntil(LocalDate.now().plusDays(days));
        SubscriptionResponse response = subscriptionMapper.toResponse(subscriptionRepository.save(subscription));
        log.info("SubscriptionServiceImpl.snooze completed id={} userId={}", id, user.getId());
        return response;
    }

    @Override
    @Transactional
    public SubscriptionResponse markRenewed(Long id) {
        log.info("SubscriptionServiceImpl.markRenewed entered id={}", id);
        User user = securityUtils.getCurrentUser();
        Subscription subscription = subscriptionRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription", id));

        ContractTerm contractTerm = subscription.getContractTerm();
        if (contractTerm == null || contractTerm.getRenewalDate() == null) {
            log.warn("SubscriptionServiceImpl.markRenewed missing contract term or renewal date id={}", id);
            throw new BadRequestException("A contract term with a renewal date is required to mark as renewed");
        }

        LocalDate previousRenewal = contractTerm.getRenewalDate();
        LocalDate nextRenewal = previousRenewal.plusMonths(monthsForFrequency(contractTerm.getBillingFrequency()));
        if (contractTerm.getBillingFrequency() == BillingFrequency.WEEKLY) {
            nextRenewal = previousRenewal.plusWeeks(1);
        }

        RenewalHistory history = new RenewalHistory();
        history.setSubscription(subscription);
        history.setPreviousAmount(contractTerm.getAmount());
        history.setNewAmount(contractTerm.getAmount());
        history.setRenewalDate(previousRenewal);
        history.setChangePercentage(BigDecimal.ZERO);
        history.setNotes("Marked renewed via dashboard");
        renewalHistoryRepository.save(history);

        contractTerm.setRenewalDate(nextRenewal);
        subscription.setSnoozedUntil(null);
        if (subscription.getStatus() == SubscriptionStatus.TRIAL) {
            subscription.setStatus(SubscriptionStatus.ACTIVE);
        }

        Subscription saved = subscriptionRepository.save(subscription);
        costSummaryService.generateMonthlySummary(saved);
        log.info("SubscriptionServiceImpl.markRenewed completed id={} nextRenewal={}", id, nextRenewal);
        return subscriptionMapper.toResponse(saved);
    }

    private ContractTerm mapContractTerm(CreateSubscriptionRequest.ContractTermRequest request, String preferredCurrency) {
        log.debug("SubscriptionServiceImpl.mapContractTerm billingFrequency={}", request.billingFrequency());
        ContractTerm contractTerm = new ContractTerm();
        contractTerm.setBillingFrequency(request.billingFrequency());
        contractTerm.setAmount(request.amount());
        String currency = request.currency() == null || request.currency().isBlank()
                ? preferredCurrency
                : request.currency().toUpperCase();
        contractTerm.setCurrency(currency);
        contractTerm.setTrialEndDate(request.trialEndDate());
        contractTerm.setRenewalDate(request.renewalDate());
        contractTerm.setCancellationDeadlineDays(request.cancellationDeadlineDays());
        contractTerm.setAutoRenew(request.autoRenew());
        contractTerm.setContractEndDate(request.contractEndDate());
        contractTerm.setIsRefundable(request.isRefundable());
        return contractTerm;
    }

    private List<NotificationSchedule> mapNotificationSchedules(
            CreateSubscriptionRequest request,
            Subscription subscription) {
        log.debug("SubscriptionServiceImpl.mapNotificationSchedules entered");
        List<NotificationSchedule> schedules = new ArrayList<>();
        if (request.notificationSchedules() != null && !request.notificationSchedules().isEmpty()) {
            for (CreateSubscriptionRequest.NotificationScheduleRequest scheduleRequest : request.notificationSchedules()) {
                NotificationSchedule schedule = new NotificationSchedule();
                schedule.setSubscription(subscription);
                schedule.setDaysBeforeEvent(scheduleRequest.daysBeforeEvent());
                schedule.setEventType(scheduleRequest.eventType());
                schedule.setEnabled(scheduleRequest.enabled());
                schedules.add(schedule);
            }
            log.debug("SubscriptionServiceImpl.mapNotificationSchedules used request schedules count={}", schedules.size());
            return schedules;
        }

        schedules.add(buildDefaultSchedule(subscription, NotificationEventType.RENEWAL_LOCK, defaultReminderDays));
        if (request.contractTerm().trialEndDate() != null) {
            schedules.add(buildDefaultSchedule(subscription, NotificationEventType.TRIAL_END, defaultReminderDays));
        }
        if (request.contractTerm().contractEndDate() != null) {
            schedules.add(buildDefaultSchedule(subscription, NotificationEventType.WARRANTY_EXPIRY, defaultReminderDays));
        }
        log.debug("SubscriptionServiceImpl.mapNotificationSchedules used defaults count={}", schedules.size());
        return schedules;
    }

    private NotificationSchedule buildDefaultSchedule(
            Subscription subscription,
            NotificationEventType eventType,
            int daysBefore) {
        log.debug(
                "SubscriptionServiceImpl.buildDefaultSchedule eventType={} daysBefore={}",
                eventType,
                daysBefore);
        NotificationSchedule schedule = new NotificationSchedule();
        schedule.setSubscription(subscription);
        schedule.setDaysBeforeEvent(daysBefore);
        schedule.setEventType(eventType);
        schedule.setEnabled(true);
        return schedule;
    }

    private int monthsForFrequency(BillingFrequency frequency) {
        log.debug("SubscriptionServiceImpl.monthsForFrequency frequency={}", frequency);
        return switch (frequency) {
            case WEEKLY -> 0;
            case MONTHLY -> 1;
            case QUARTERLY -> 3;
            case SEMI_ANNUAL -> 6;
            case ANNUAL -> 12;
            case ONE_TIME -> 0;
        };
    }

    private String sanitize(String value) {
        log.debug("SubscriptionServiceImpl.sanitize");
        return value == null ? "" : value.trim();
    }

    private String sanitizeNullable(String value) {
        log.debug("SubscriptionServiceImpl.sanitizeNullable");
        return value == null ? null : value.trim();
    }
}
