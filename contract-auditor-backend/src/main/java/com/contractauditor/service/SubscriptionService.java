package com.contractauditor.service;

import com.contractauditor.dto.request.CreateSubscriptionRequest;
import com.contractauditor.dto.request.RecordRenewalRequest;
import com.contractauditor.dto.request.UpdateSubscriptionRequest;
import com.contractauditor.dto.response.RenewalHistoryResponse;
import com.contractauditor.dto.response.SubscriptionResponse;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SubscriptionService {

    Page<SubscriptionResponse> findAll(Pageable pageable);

    SubscriptionResponse findById(Long id);

    SubscriptionResponse create(CreateSubscriptionRequest request);

    SubscriptionResponse update(Long id, UpdateSubscriptionRequest request);

    void delete(Long id);

    RenewalHistoryResponse recordRenewal(Long id, RecordRenewalRequest request);

    List<RenewalHistoryResponse> getRenewalHistory(Long subscriptionId);

    List<SubscriptionResponse> findAllForUser();

    SubscriptionResponse snooze(Long id, int days);

    SubscriptionResponse markRenewed(Long id);
}
