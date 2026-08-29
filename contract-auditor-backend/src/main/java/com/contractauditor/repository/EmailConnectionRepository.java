package com.contractauditor.repository;

import com.contractauditor.domain.entity.EmailConnection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailConnectionRepository extends JpaRepository<EmailConnection, Long> {

    Optional<EmailConnection> findByUserIdAndRevokedAtIsNull(Long userId);

    Optional<EmailConnection> findByUserId(Long userId);
}
