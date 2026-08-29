package com.contractauditor.domain.entity;

import com.contractauditor.domain.enums.EmailDiscoveryRunStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "email_discovery_runs")
public class EmailDiscoveryRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmailDiscoveryRunStatus status;

    @Column(name = "messages_scanned", nullable = false)
    private int messagesScanned;

    @Column(name = "suggestions_found", nullable = false)
    private int suggestionsFound;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public EmailDiscoveryRunStatus getStatus() {
        return status;
    }

    public void setStatus(EmailDiscoveryRunStatus status) {
        this.status = status;
    }

    public int getMessagesScanned() {
        return messagesScanned;
    }

    public void setMessagesScanned(int messagesScanned) {
        this.messagesScanned = messagesScanned;
    }

    public int getSuggestionsFound() {
        return suggestionsFound;
    }

    public void setSuggestionsFound(int suggestionsFound) {
        this.suggestionsFound = suggestionsFound;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
