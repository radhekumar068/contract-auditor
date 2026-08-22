package com.contractauditor.repository;

import com.contractauditor.domain.entity.NotificationSchedule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NotificationScheduleRepository extends JpaRepository<NotificationSchedule, Long> {

    @Query("""
            SELECT ns FROM NotificationSchedule ns
            JOIN FETCH ns.subscription s
            JOIN FETCH s.contractTerm ct
            JOIN FETCH s.user u
            WHERE ns.enabled = true
            AND s.status IN ('ACTIVE', 'TRIAL')
            """)
    List<NotificationSchedule> findAllEnabledWithSubscriptionDetails();
}
