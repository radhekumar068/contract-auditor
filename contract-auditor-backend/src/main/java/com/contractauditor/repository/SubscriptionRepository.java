package com.contractauditor.repository;

import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.enums.SubscriptionStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    Page<Subscription> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"contractTerm", "notificationSchedules"})
    Optional<Subscription> findByIdAndUserId(Long id, Long userId);

    List<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);

    @EntityGraph(attributePaths = {"contractTerm", "notificationSchedules"})
    List<Subscription> findByUserId(Long userId);

    @Query("""
            SELECT s FROM Subscription s
            JOIN FETCH s.contractTerm ct
            JOIN FETCH s.user u
            WHERE s.status IN ('ACTIVE', 'TRIAL')
            """)
    List<Subscription> findAllActiveWithTerms();

    @Query("""
            SELECT s FROM Subscription s
            JOIN FETCH s.contractTerm ct
            WHERE s.user.id = :userId
            AND s.status IN ('ACTIVE', 'TRIAL', 'PENDING_CANCEL')
            ORDER BY ct.renewalDate ASC
            """)
    List<Subscription> findUpcomingByUserId(@Param("userId") Long userId);
}
