package com.contractauditor.domain.entity;

import com.contractauditor.domain.enums.CommitmentType;
import com.contractauditor.domain.enums.SubscriptionStatus;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "subscriptions")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "commitment_type", nullable = false, length = 50)
    private CommitmentType commitmentType = CommitmentType.SUBSCRIPTION;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "cancellation_workflow", columnDefinition = "TEXT")
    private String cancellationWorkflow;

    @Column(name = "negotiation_workflow", columnDefinition = "TEXT")
    private String negotiationWorkflow;

    @Column(name = "snoozed_until")
    private LocalDate snoozedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToOne(mappedBy = "subscription", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private ContractTerm contractTerm;

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<NotificationSchedule> notificationSchedules = new ArrayList<>();

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RenewalHistory> renewalHistories = new ArrayList<>();

    @OneToMany(mappedBy = "subscription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CostSummary> costSummaries = new ArrayList<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public SubscriptionStatus getStatus() {
        return status;
    }

    public void setStatus(SubscriptionStatus status) {
        this.status = status;
    }

    public CommitmentType getCommitmentType() {
        return commitmentType;
    }

    public void setCommitmentType(CommitmentType commitmentType) {
        this.commitmentType = commitmentType;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getCancellationWorkflow() {
        return cancellationWorkflow;
    }

    public void setCancellationWorkflow(String cancellationWorkflow) {
        this.cancellationWorkflow = cancellationWorkflow;
    }

    public String getNegotiationWorkflow() {
        return negotiationWorkflow;
    }

    public void setNegotiationWorkflow(String negotiationWorkflow) {
        this.negotiationWorkflow = negotiationWorkflow;
    }

    public LocalDate getSnoozedUntil() {
        return snoozedUntil;
    }

    public void setSnoozedUntil(LocalDate snoozedUntil) {
        this.snoozedUntil = snoozedUntil;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public ContractTerm getContractTerm() {
        return contractTerm;
    }

    public void setContractTerm(ContractTerm contractTerm) {
        this.contractTerm = contractTerm;
        if (contractTerm != null) {
            contractTerm.setSubscription(this);
        }
    }

    public List<NotificationSchedule> getNotificationSchedules() {
        return notificationSchedules;
    }

    public void setNotificationSchedules(List<NotificationSchedule> notificationSchedules) {
        this.notificationSchedules = notificationSchedules;
    }

    public List<RenewalHistory> getRenewalHistories() {
        return renewalHistories;
    }

    public void setRenewalHistories(List<RenewalHistory> renewalHistories) {
        this.renewalHistories = renewalHistories;
    }

    public List<CostSummary> getCostSummaries() {
        return costSummaries;
    }

    public void setCostSummaries(List<CostSummary> costSummaries) {
        this.costSummaries = costSummaries;
    }
}
