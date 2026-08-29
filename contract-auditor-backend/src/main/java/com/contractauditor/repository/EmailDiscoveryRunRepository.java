package com.contractauditor.repository;

import com.contractauditor.domain.entity.EmailDiscoveryRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailDiscoveryRunRepository extends JpaRepository<EmailDiscoveryRun, Long> {
}
