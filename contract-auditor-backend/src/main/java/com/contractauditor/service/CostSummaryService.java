package com.contractauditor.service;

import com.contractauditor.domain.entity.Subscription;

public interface CostSummaryService {

    void generateMonthlySummary(Subscription subscription);

    void backfillYear(Subscription subscription, int year);
}
