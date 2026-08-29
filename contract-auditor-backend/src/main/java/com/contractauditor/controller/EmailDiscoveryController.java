package com.contractauditor.controller;

import com.contractauditor.dto.request.ConnectEmailRequest;
import com.contractauditor.dto.request.ImportDiscoveredRequest;
import com.contractauditor.dto.response.EmailConnectionStatusResponse;
import com.contractauditor.dto.response.EmailDiscoveryAuthUrlResponse;
import com.contractauditor.dto.response.EmailDiscoveryImportResponse;
import com.contractauditor.dto.response.EmailDiscoveryScanResponse;
import com.contractauditor.service.EmailDiscoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/email-discovery")
@PreAuthorize("hasRole('USER')")
@Tag(name = "Email Discovery", description = "Gmail-based subscription discovery")
public class EmailDiscoveryController {

    private static final Logger log = LoggerFactory.getLogger(EmailDiscoveryController.class);

    private final EmailDiscoveryService emailDiscoveryService;

    public EmailDiscoveryController(EmailDiscoveryService emailDiscoveryService) {
        this.emailDiscoveryService = emailDiscoveryService;
    }

    @GetMapping("/status")
    @Operation(summary = "Get Gmail connection status")
    public EmailConnectionStatusResponse status() {
        log.info("EmailDiscoveryController.status received");
        return emailDiscoveryService.getStatus();
    }

    @GetMapping("/auth-url")
    @Operation(summary = "Get Google OAuth authorization URL")
    public EmailDiscoveryAuthUrlResponse authUrl() {
        log.info("EmailDiscoveryController.authUrl received");
        return emailDiscoveryService.getAuthUrl();
    }

    @PostMapping("/connect")
    @Operation(summary = "Connect Gmail using OAuth authorization code")
    public EmailConnectionStatusResponse connect(@Valid @RequestBody ConnectEmailRequest request) {
        log.info("EmailDiscoveryController.connect received");
        return emailDiscoveryService.connect(request);
    }

    @PostMapping("/scan")
    @Operation(summary = "Scan connected Gmail inbox for subscription emails")
    public EmailDiscoveryScanResponse scan() {
        log.info("EmailDiscoveryController.scan received");
        return emailDiscoveryService.scan();
    }

    @PostMapping("/import")
    @Operation(summary = "Import user-confirmed discovered subscriptions")
    public EmailDiscoveryImportResponse importSelected(@Valid @RequestBody ImportDiscoveredRequest request) {
        log.info("EmailDiscoveryController.import received count={}", request.suggestions().size());
        return emailDiscoveryService.importSelected(request);
    }

    @DeleteMapping("/disconnect")
    @Operation(summary = "Disconnect Gmail and revoke tokens")
    public ResponseEntity<Void> disconnect() {
        log.info("EmailDiscoveryController.disconnect received");
        emailDiscoveryService.disconnect();
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
