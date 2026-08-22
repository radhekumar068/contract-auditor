package com.contractauditor.repository;

import com.contractauditor.domain.entity.CostSummary;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CostSummaryRepository extends JpaRepository<CostSummary, Long> {

    Optional<CostSummary> findBySubscriptionIdAndYearAndMonth(Long subscriptionId, Integer year, Integer month);

    @Query("""
            SELECT cs.category, SUM(cs.amount)
            FROM CostSummary cs
            WHERE cs.subscription.user.id = :userId
            AND cs.year = :year
            GROUP BY cs.category
            """)
    List<Object[]> sumByCategoryForYear(@Param("userId") Long userId, @Param("year") int year);

    @Query("""
            SELECT cs.year, cs.month, SUM(cs.amount)
            FROM CostSummary cs
            WHERE cs.subscription.user.id = :userId
            AND cs.year = :year
            GROUP BY cs.year, cs.month
            ORDER BY cs.month
            """)
    List<Object[]> sumByMonthForYear(@Param("userId") Long userId, @Param("year") int year);

    @Query("""
            SELECT COALESCE(SUM(cs.amount), 0)
            FROM CostSummary cs
            WHERE cs.subscription.user.id = :userId
            AND cs.year = :year
            """)
    BigDecimal sumTotalForYear(@Param("userId") Long userId, @Param("year") int year);
}
