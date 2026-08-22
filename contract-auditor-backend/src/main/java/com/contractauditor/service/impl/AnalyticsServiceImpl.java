package com.contractauditor.service.impl;

import com.contractauditor.domain.entity.ContractTerm;
import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.entity.User;
import com.contractauditor.domain.enums.BillingFrequency;
import com.contractauditor.domain.enums.NotificationEventType;
import com.contractauditor.domain.enums.SubscriptionStatus;
import com.contractauditor.dto.response.AnalyticsResponse;
import com.contractauditor.dto.response.CalendarDayResponse;
import com.contractauditor.dto.response.DashboardResponse;
import com.contractauditor.dto.response.TimelineEventResponse;
import com.contractauditor.dto.response.UrgentActionResponse;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.repository.CostSummaryRepository;
import com.contractauditor.repository.RenewalHistoryRepository;
import com.contractauditor.repository.SubscriptionRepository;
import com.contractauditor.security.SecurityUtils;
import com.contractauditor.service.AnalyticsService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsServiceImpl.class);

    private static final List<String> MONTH_LABELS = List.of(
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");

    private final SubscriptionRepository subscriptionRepository;
    private final CostSummaryRepository costSummaryRepository;
    private final RenewalHistoryRepository renewalHistoryRepository;
    private final SecurityUtils securityUtils;

    public AnalyticsServiceImpl(
            SubscriptionRepository subscriptionRepository,
            CostSummaryRepository costSummaryRepository,
            RenewalHistoryRepository renewalHistoryRepository,
            SecurityUtils securityUtils) {
        this.subscriptionRepository = subscriptionRepository;
        this.costSummaryRepository = costSummaryRepository;
        this.renewalHistoryRepository = renewalHistoryRepository;
        this.securityUtils = securityUtils;
    }

    @Override
    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics(int year) {
        log.info("AnalyticsServiceImpl.getAnalytics entered year={}", year);
        validateYear(year);
        User user = securityUtils.getCurrentUser();
        log.debug("AnalyticsServiceImpl.getAnalytics loaded userId={}", user.getId());

        BigDecimal totalAnnualCost = costSummaryRepository.sumTotalForYear(user.getId(), year);
        if (totalAnnualCost == null) {
            totalAnnualCost = BigDecimal.ZERO;
        }

        BigDecimal monthlyAverage = totalAnnualCost.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        BigDecimal financialLeakage = calculateFinancialLeakage(user.getId());
        BigDecimal potentialSavings = calculatePotentialSavings(user.getId());
        int healthScore = calculateHealthScore(user.getId(), financialLeakage, totalAnnualCost);

        List<AnalyticsResponse.CategoryCostResponse> categoryBreakdown =
                buildCategoryBreakdown(user.getId(), year, totalAnnualCost);
        List<AnalyticsResponse.MonthlyCostResponse> monthlyTrend = buildMonthlyTrend(user.getId(), year);

        AnalyticsResponse response = new AnalyticsResponse(
                year,
                healthScore,
                totalAnnualCost,
                monthlyAverage,
                potentialSavings,
                financialLeakage,
                categoryBreakdown,
                monthlyTrend
        );
        log.info(
                "AnalyticsServiceImpl.getAnalytics completed userId={} year={} healthScore={} categories={} months={}",
                user.getId(),
                year,
                healthScore,
                categoryBreakdown.size(),
                monthlyTrend.size());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(int year) {
        log.info("AnalyticsServiceImpl.getDashboard entered year={}", year);
        AnalyticsResponse analytics = getAnalytics(year);
        List<UrgentActionResponse> urgentActions = buildUrgentActions();
        UrgentActionResponse mostUrgent = urgentActions.isEmpty() ? null : urgentActions.get(0);

        DashboardResponse response = new DashboardResponse(
                analytics.healthScore(),
                analytics.totalAnnualCost(),
                analytics.monthlyAverage(),
                analytics.financialLeakage(),
                analytics.potentialSavings(),
                analytics.categoryBreakdown(),
                analytics.monthlyTrend(),
                mostUrgent,
                urgentActions
        );
        log.info(
                "AnalyticsServiceImpl.getDashboard completed year={} urgentActions={}",
                year,
                urgentActions.size());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarDayResponse> getCalendar(int year, int month) {
        log.info("AnalyticsServiceImpl.getCalendar entered year={} month={}", year, month);
        validateYear(year);
        validateMonth(month);
        User user = securityUtils.getCurrentUser();
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        List<Subscription> subscriptions = subscriptionRepository.findUpcomingByUserId(user.getId());
        log.debug(
                "AnalyticsServiceImpl.getCalendar loaded subscriptions={} userId={}",
                subscriptions.size(),
                user.getId());

        Map<LocalDate, List<CalendarDayResponse.CalendarEventResponse>> eventsByDate = new HashMap<>();

        for (Subscription subscription : subscriptions) {
            ContractTerm term = subscription.getContractTerm();
            if (term == null) {
                continue;
            }

            if (term.getRenewalDate() != null
                    && !term.getRenewalDate().isBefore(monthStart)
                    && !term.getRenewalDate().isAfter(monthEnd)) {
                addCalendarEvent(eventsByDate, term.getRenewalDate(), subscription, term, "RENEWAL");
            }

            if (term.getTrialEndDate() != null
                    && !term.getTrialEndDate().isBefore(monthStart)
                    && !term.getTrialEndDate().isAfter(monthEnd)) {
                addCalendarEvent(eventsByDate, term.getTrialEndDate(), subscription, term, "TRIAL_END");
            }

            if (term.getRenewalDate() != null) {
                LocalDate cancellationDeadline = term.getRenewalDate().minusDays(term.getCancellationDeadlineDays());
                if (!cancellationDeadline.isBefore(monthStart) && !cancellationDeadline.isAfter(monthEnd)) {
                    addCalendarEvent(eventsByDate, cancellationDeadline, subscription, term, "CANCELLATION_DEADLINE");
                }
            }
        }

        List<CalendarDayResponse> result = new ArrayList<>();
        for (Map.Entry<LocalDate, List<CalendarDayResponse.CalendarEventResponse>> entry : eventsByDate.entrySet()) {
            BigDecimal total = entry.getValue().stream()
                    .map(CalendarDayResponse.CalendarEventResponse::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(new CalendarDayResponse(entry.getKey(), total, user.getPreferredCurrency(), entry.getValue()));
        }

        result.sort(Comparator.comparing(CalendarDayResponse::date));
        log.info("AnalyticsServiceImpl.getCalendar completed userId={} daysWithEvents={}", user.getId(), result.size());
        return result;
    }

    private void addCalendarEvent(
            Map<LocalDate, List<CalendarDayResponse.CalendarEventResponse>> eventsByDate,
            LocalDate date,
            Subscription subscription,
            ContractTerm term,
            String eventType) {
        log.debug(
                "AnalyticsServiceImpl.addCalendarEvent date={} subscriptionId={} eventType={}",
                date,
                subscription.getId(),
                eventType);
        CalendarDayResponse.CalendarEventResponse event = new CalendarDayResponse.CalendarEventResponse(
                subscription.getId(),
                subscription.getName(),
                subscription.getProvider(),
                eventType,
                term.getAmount(),
                term.getCurrency()
        );
        eventsByDate.computeIfAbsent(date, ignored -> new ArrayList<>()).add(event);
    }

    private List<UrgentActionResponse> buildUrgentActions() {
        log.debug("AnalyticsServiceImpl.buildUrgentActions entered");
        User user = securityUtils.getCurrentUser();
        LocalDate today = LocalDate.now();
        List<Subscription> subscriptions = subscriptionRepository.findUpcomingByUserId(user.getId());
        List<UrgentActionResponse> actions = new ArrayList<>();

        for (Subscription subscription : subscriptions) {
            if (subscription.getSnoozedUntil() != null && !subscription.getSnoozedUntil().isBefore(today)) {
                continue;
            }

            ContractTerm term = subscription.getContractTerm();
            if (term == null || term.getRenewalDate() == null) {
                continue;
            }

            LocalDate cancellationDeadline = term.getRenewalDate().minusDays(term.getCancellationDeadlineDays());
            int daysUntil = (int) ChronoUnit.DAYS.between(today, cancellationDeadline);
            if (daysUntil > 7) {
                continue;
            }

            actions.add(new UrgentActionResponse(
                    subscription.getId(),
                    subscription.getName(),
                    subscription.getProvider(),
                    subscription.getCategory(),
                    subscription.getStatus(),
                    cancellationDeadline,
                    term.getRenewalDate(),
                    daysUntil,
                    resolveUrgencyLevel(daysUntil),
                    term.getAmount(),
                    term.getCurrency(),
                    subscription.getCancellationWorkflow()
            ));
        }

        actions.sort(Comparator.comparingInt(UrgentActionResponse::daysUntilDeadline));
        log.debug("AnalyticsServiceImpl.buildUrgentActions completed count={}", actions.size());
        return actions;
    }

    private String resolveUrgencyLevel(int daysUntil) {
        log.debug("AnalyticsServiceImpl.resolveUrgencyLevel daysUntil={}", daysUntil);
        if (daysUntil <= 3) {
            return "RED";
        }
        if (daysUntil <= 7) {
            return "YELLOW";
        }
        return "GREEN";
    }

    private int calculateHealthScore(Long userId, BigDecimal financialLeakage, BigDecimal totalAnnualCost) {
        log.debug(
                "AnalyticsServiceImpl.calculateHealthScore userId={} leakage={} totalAnnualCost={}",
                userId,
                financialLeakage,
                totalAnnualCost);
        int score = 100;
        List<Subscription> subscriptions = subscriptionRepository.findByUserId(userId);
        LocalDate today = LocalDate.now();

        long activeTrials = subscriptions.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.TRIAL)
                .count();
        score -= (int) Math.min(activeTrials * 8, 24);

        long upcomingRenewals = subscriptions.stream()
                .filter(s -> s.getStatus() == SubscriptionStatus.ACTIVE || s.getStatus() == SubscriptionStatus.TRIAL)
                .filter(s -> s.getContractTerm() != null)
                .filter(s -> {
                    LocalDate renewal = s.getContractTerm().getRenewalDate();
                    return renewal != null && !renewal.isBefore(today) && renewal.isBefore(today.plusDays(30));
                })
                .count();
        score -= (int) Math.min(upcomingRenewals * 5, 20);

        if (totalAnnualCost.compareTo(BigDecimal.ZERO) > 0) {
            double leakageRatio = financialLeakage.divide(totalAnnualCost, 4, RoundingMode.HALF_UP).doubleValue();
            score -= (int) Math.min(leakageRatio * 100, 30);
        }

        long urgentCount = subscriptions.stream()
                .filter(s -> s.getContractTerm() != null)
                .filter(s -> {
                    if (s.getContractTerm().getRenewalDate() == null) {
                        return false;
                    }
                    LocalDate deadline = s.getContractTerm().getRenewalDate()
                            .minusDays(s.getContractTerm().getCancellationDeadlineDays());
                    int days = (int) ChronoUnit.DAYS.between(today, deadline);
                    return days >= 0 && days <= 7;
                })
                .count();
        score -= (int) Math.min(urgentCount * 6, 18);

        int bounded = Math.max(0, Math.min(100, score));
        log.debug("AnalyticsServiceImpl.calculateHealthScore completed score={}", bounded);
        return bounded;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TimelineEventResponse> getTimeline(int year) {
        log.info("AnalyticsServiceImpl.getTimeline entered year={}", year);
        validateYear(year);
        User user = securityUtils.getCurrentUser();
        LocalDate today = LocalDate.now();
        List<Subscription> subscriptions = subscriptionRepository.findUpcomingByUserId(user.getId());
        List<TimelineEventResponse> events = new ArrayList<>();

        for (Subscription subscription : subscriptions) {
            ContractTerm term = subscription.getContractTerm();
            if (term == null) {
                continue;
            }

            if (term.getTrialEndDate() != null && term.getTrialEndDate().getYear() == year) {
                events.add(buildEvent(
                        subscription, term, NotificationEventType.TRIAL_END, term.getTrialEndDate(), term.getTrialEndDate(), today));
            }

            if (term.getRenewalDate() != null) {
                LocalDate cancellationDeadline = term.getRenewalDate().minusDays(term.getCancellationDeadlineDays());
                if (cancellationDeadline.getYear() == year) {
                    events.add(buildEvent(
                            subscription, term, NotificationEventType.RENEWAL_LOCK, term.getRenewalDate(), cancellationDeadline, today));
                }

                if (term.getRenewalDate().getYear() == year) {
                    events.add(buildEvent(
                            subscription,
                            term,
                            NotificationEventType.RENEWAL_UPCOMING,
                            term.getRenewalDate(),
                            cancellationDeadline,
                            today));
                }
            }

            if (term.getContractEndDate() != null && term.getContractEndDate().getYear() == year) {
                events.add(buildEvent(
                        subscription,
                        term,
                        NotificationEventType.WARRANTY_EXPIRY,
                        term.getContractEndDate(),
                        term.getContractEndDate(),
                        today));
            }
        }

        events.sort(Comparator.comparing(TimelineEventResponse::eventDate));
        log.info("AnalyticsServiceImpl.getTimeline completed userId={} events={}", user.getId(), events.size());
        return events;
    }

    private TimelineEventResponse buildEvent(
            Subscription subscription,
            ContractTerm term,
            NotificationEventType eventType,
            LocalDate eventDate,
            LocalDate actionDeadline,
            LocalDate today) {
        log.debug(
                "AnalyticsServiceImpl.buildEvent subscriptionId={} eventType={} eventDate={}",
                subscription.getId(),
                eventType,
                eventDate);
        int daysRemaining = (int) ChronoUnit.DAYS.between(today, eventDate);
        return new TimelineEventResponse(
                subscription.getId(),
                subscription.getName(),
                subscription.getCategory(),
                subscription.getProvider(),
                eventType,
                eventDate,
                actionDeadline,
                term.getAmount(),
                term.getCurrency(),
                subscription.getCancellationWorkflow(),
                subscription.getNegotiationWorkflow(),
                daysRemaining
        );
    }

    private BigDecimal calculateFinancialLeakage(Long userId) {
        log.debug("AnalyticsServiceImpl.calculateFinancialLeakage userId={}", userId);
        BigDecimal leakage = renewalHistoryRepository.findBySubscriptionUserIdOrderByRenewalDateDesc(userId).stream()
                .map(history -> history.getNewAmount().subtract(history.getPreviousAmount()))
                .filter(delta -> delta.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        log.debug("AnalyticsServiceImpl.calculateFinancialLeakage completed leakage={}", leakage);
        return leakage;
    }

    private BigDecimal calculatePotentialSavings(Long userId) {
        log.debug("AnalyticsServiceImpl.calculatePotentialSavings userId={}", userId);
        List<Subscription> subscriptions = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.TRIAL);
        BigDecimal trialSavings = subscriptions.stream()
                .filter(s -> s.getContractTerm() != null)
                .map(s -> normalizeToMonthly(s.getContractTerm().getAmount(), s.getContractTerm().getBillingFrequency()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Subscription> active = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
        BigDecimal negotiableSavings = active.stream()
                .filter(s -> s.getContractTerm() != null && Boolean.TRUE.equals(s.getContractTerm().getAutoRenew()))
                .map(s -> normalizeToMonthly(s.getContractTerm().getAmount(), s.getContractTerm().getBillingFrequency())
                        .multiply(BigDecimal.valueOf(0.15)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal total = trialSavings.add(negotiableSavings).setScale(2, RoundingMode.HALF_UP);
        log.debug("AnalyticsServiceImpl.calculatePotentialSavings completed savings={}", total);
        return total;
    }

    private List<AnalyticsResponse.CategoryCostResponse> buildCategoryBreakdown(Long userId, int year, BigDecimal total) {
        log.debug("AnalyticsServiceImpl.buildCategoryBreakdown userId={} year={}", userId, year);
        List<Object[]> rows = costSummaryRepository.sumByCategoryForYear(userId, year);
        List<AnalyticsResponse.CategoryCostResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            String category = (String) row[0];
            BigDecimal amount = (BigDecimal) row[1];
            double percentage = total.compareTo(BigDecimal.ZERO) > 0
                    ? amount.divide(total, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                    : 0.0;
            result.add(new AnalyticsResponse.CategoryCostResponse(category, amount, percentage));
        }
        log.debug("AnalyticsServiceImpl.buildCategoryBreakdown completed categories={}", result.size());
        return result;
    }

    private List<AnalyticsResponse.MonthlyCostResponse> buildMonthlyTrend(Long userId, int year) {
        log.debug("AnalyticsServiceImpl.buildMonthlyTrend userId={} year={}", userId, year);
        List<Object[]> rows = costSummaryRepository.sumByMonthForYear(userId, year);
        List<AnalyticsResponse.MonthlyCostResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            int month = (Integer) row[1];
            BigDecimal amount = (BigDecimal) row[2];
            result.add(new AnalyticsResponse.MonthlyCostResponse(month, MONTH_LABELS.get(month - 1), amount));
        }
        log.debug("AnalyticsServiceImpl.buildMonthlyTrend completed months={}", result.size());
        return result;
    }

    private void validateYear(int year) {
        int currentYear = LocalDate.now().getYear();
        int maxYear = currentYear + 5;
        if (year < 2000 || year > maxYear) {
            throw new BadRequestException("Year must be between 2000 and " + maxYear);
        }
    }

    private void validateMonth(int month) {
        if (month < 1 || month > 12) {
            throw new BadRequestException("Month must be between 1 and 12");
        }
    }

    private BigDecimal normalizeToMonthly(BigDecimal amount, BillingFrequency frequency) {
        log.debug("AnalyticsServiceImpl.normalizeToMonthly frequency={}", frequency);
        return switch (frequency) {
            case WEEKLY -> amount.multiply(BigDecimal.valueOf(52)).divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case MONTHLY -> amount;
            case QUARTERLY -> amount.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            case SEMI_ANNUAL -> amount.divide(BigDecimal.valueOf(6), 2, RoundingMode.HALF_UP);
            case ANNUAL -> amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case ONE_TIME -> amount.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        };
    }
}
