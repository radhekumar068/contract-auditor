package com.contractauditor.controller;

import com.contractauditor.dto.request.CreateSubscriptionRequest;
import com.contractauditor.dto.request.RecordRenewalRequest;
import com.contractauditor.dto.request.UpdateSubscriptionRequest;
import com.contractauditor.dto.response.RenewalHistoryResponse;
import com.contractauditor.dto.response.SubscriptionResponse;
import com.contractauditor.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
@PreAuthorize("hasRole('USER')")
@Tag(name = "Subscriptions", description = "Subscription CRUD and renewal history")
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping
    @Operation(summary = "List subscriptions (paginated)")
    public Page<SubscriptionResponse> list(Pageable pageable) {
        log.info(
                "SubscriptionController.list received page={} size={}",
                pageable.getPageNumber(),
                pageable.getPageSize());
        Page<SubscriptionResponse> response = subscriptionService.findAll(pageable);
        log.info("SubscriptionController.list returning totalElements={}", response.getTotalElements());
        return response;
    }

    @GetMapping("/all")
    @Operation(summary = "List all subscriptions for current user")
    public List<SubscriptionResponse> listAll() {
        log.info("SubscriptionController.listAll received");
        List<SubscriptionResponse> response = subscriptionService.findAllForUser();
        log.info("SubscriptionController.listAll returning count={}", response.size());
        return response;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get subscription by id")
    public SubscriptionResponse getById(@PathVariable Long id) {
        log.info("SubscriptionController.getById received id={}", id);
        SubscriptionResponse response = subscriptionService.findById(id);
        log.info("SubscriptionController.getById returning id={}", response.id());
        return response;
    }

    @PostMapping
    @Operation(summary = "Create a subscription")
    public ResponseEntity<SubscriptionResponse> create(@Valid @RequestBody CreateSubscriptionRequest request) {
        log.info("SubscriptionController.create received name={} provider={}", request.name(), request.provider());
        SubscriptionResponse response = subscriptionService.create(request);
        log.info("SubscriptionController.create returning id={}", response.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a subscription")
    public SubscriptionResponse update(@PathVariable Long id, @Valid @RequestBody UpdateSubscriptionRequest request) {
        log.info("SubscriptionController.update received id={}", id);
        SubscriptionResponse response = subscriptionService.update(id, request);
        log.info("SubscriptionController.update returning id={}", response.id());
        return response;
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a subscription")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("SubscriptionController.delete received id={}", id);
        subscriptionService.delete(id);
        log.info("SubscriptionController.delete completed id={}", id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/renewals")
    @Operation(summary = "Record a renewal for a subscription")
    public ResponseEntity<RenewalHistoryResponse> recordRenewal(
            @PathVariable Long id,
            @Valid @RequestBody RecordRenewalRequest request) {
        log.info("SubscriptionController.recordRenewal received id={}", id);
        RenewalHistoryResponse response = subscriptionService.recordRenewal(id, request);
        log.info("SubscriptionController.recordRenewal returning historyId={}", response.id());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}/renewals")
    @Operation(summary = "Get renewal history for a subscription")
    public List<RenewalHistoryResponse> getRenewalHistory(@PathVariable Long id) {
        log.info("SubscriptionController.getRenewalHistory received id={}", id);
        List<RenewalHistoryResponse> response = subscriptionService.getRenewalHistory(id);
        log.info("SubscriptionController.getRenewalHistory returning records={}", response.size());
        return response;
    }

    @PostMapping("/{id}/snooze")
    @Operation(summary = "Snooze urgent alerts for a subscription")
    public SubscriptionResponse snooze(@PathVariable Long id, @RequestParam(defaultValue = "7") int days) {
        log.info("SubscriptionController.snooze received id={} days={}", id, days);
        SubscriptionResponse response = subscriptionService.snooze(id, days);
        log.info("SubscriptionController.snooze returning id={}", response.id());
        return response;
    }

    @PostMapping("/{id}/mark-renewed")
    @Operation(summary = "Mark subscription as renewed and roll forward deadline")
    public SubscriptionResponse markRenewed(@PathVariable Long id) {
        log.info("SubscriptionController.markRenewed received id={}", id);
        SubscriptionResponse response = subscriptionService.markRenewed(id);
        log.info("SubscriptionController.markRenewed returning id={}", response.id());
        return response;
    }
}
