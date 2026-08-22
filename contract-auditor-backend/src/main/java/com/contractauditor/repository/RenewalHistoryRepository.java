package com.contractauditor.repository;

import com.contractauditor.domain.entity.RenewalHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RenewalHistoryRepository extends JpaRepository<RenewalHistory, Long> {

    List<RenewalHistory> findBySubscriptionIdOrderByRenewalDateDesc(Long subscriptionId);

    List<RenewalHistory> findBySubscriptionUserIdOrderByRenewalDateDesc(Long userId);
}
