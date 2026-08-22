package com.contractauditor.service.impl;

import com.contractauditor.domain.entity.ContractTerm;
import com.contractauditor.domain.entity.CostSummary;
import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.enums.BillingFrequency;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.repository.CostSummaryRepository;
import com.contractauditor.service.CostSummaryService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CostSummaryServiceImpl implements CostSummaryService {

    private static final Logger log = LoggerFactory.getLogger(CostSummaryServiceImpl.class);

    private final CostSummaryRepository costSummaryRepository;

    public CostSummaryServiceImpl(CostSummaryRepository costSummaryRepository) {
        this.costSummaryRepository = costSummaryRepository;
    }

    @Override
    @Transactional
    public void generateMonthlySummary(Subscription subscription) {
        log.info("CostSummaryServiceImpl.generateMonthlySummary entered subscriptionId={}",
                subscription == null ? null : subscription.getId());
        if (subscription == null) {
            throw new BadRequestException("Subscription is required to generate a cost summary");
        }
        ContractTerm contractTerm = subscription.getContractTerm();
        if (contractTerm == null || contractTerm.getAmount() == null) {
            log.debug(
                    "CostSummaryServiceImpl.generateMonthlySummary skipped missing contract term subscriptionId={}",
                    subscription.getId());
            return;
        }

        LocalDate now = LocalDate.now();
        BigDecimal monthlyAmount = normalizeToMonthly(contractTerm.getAmount(), contractTerm.getBillingFrequency());

        Optional<CostSummary> existing = costSummaryRepository
                .findBySubscriptionIdAndYearAndMonth(subscription.getId(), now.getYear(), now.getMonthValue());

        CostSummary summary = existing.orElseGet(CostSummary::new);
        summary.setSubscription(subscription);
        summary.setYear(now.getYear());
        summary.setMonth(now.getMonthValue());
        summary.setAmount(monthlyAmount);
        summary.setCategory(subscription.getCategory());
        costSummaryRepository.save(summary);
        log.info(
                "CostSummaryServiceImpl.generateMonthlySummary completed subscriptionId={} year={} month={}",
                subscription.getId(),
                now.getYear(),
                now.getMonthValue());
    }

    @Override
    @Transactional
    public void backfillYear(Subscription subscription, int year) {
        log.info("CostSummaryServiceImpl.backfillYear entered subscriptionId={} year={}",
                subscription == null ? null : subscription.getId(), year);
        if (subscription == null) {
            throw new BadRequestException("Subscription is required to backfill cost summaries");
        }
        if (year < 2000 || year > LocalDate.now().getYear() + 5) {
            throw new BadRequestException("Year is outside the supported range");
        }
        ContractTerm contractTerm = subscription.getContractTerm();
        if (contractTerm == null) {
            log.debug(
                    "CostSummaryServiceImpl.backfillYear skipped missing contract term subscriptionId={}",
                    subscription.getId());
            return;
        }
        BigDecimal monthlyAmount = normalizeToMonthly(contractTerm.getAmount(), contractTerm.getBillingFrequency());
        if (subscription.getStartDate() == null) {
            throw new BadRequestException("Subscription start date is required to backfill cost summaries");
        }
        int savedMonths = 0;
        for (int month = 1; month <= 12; month++) {
            YearMonth yearMonth = YearMonth.of(year, month);
            if (yearMonth.isAfter(YearMonth.from(subscription.getStartDate()))
                    || yearMonth.equals(YearMonth.from(subscription.getStartDate()))) {
                CostSummary summary = new CostSummary();
                summary.setSubscription(subscription);
                summary.setYear(year);
                summary.setMonth(month);
                summary.setAmount(monthlyAmount);
                summary.setCategory(subscription.getCategory());
                costSummaryRepository.save(summary);
                savedMonths++;
            }
        }
        log.info(
                "CostSummaryServiceImpl.backfillYear completed subscriptionId={} year={} monthsSaved={}",
                subscription.getId(),
                year,
                savedMonths);
    }

    private BigDecimal normalizeToMonthly(BigDecimal amount, BillingFrequency frequency) {
        log.debug("CostSummaryServiceImpl.normalizeToMonthly frequency={}", frequency);
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
