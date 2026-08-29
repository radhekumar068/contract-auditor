package com.contractauditor.service.impl;

import com.contractauditor.config.EmailDiscoveryProperties;
import com.contractauditor.domain.entity.EmailConnection;
import com.contractauditor.domain.entity.EmailDiscoveryRun;
import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.entity.User;
import com.contractauditor.domain.enums.CommitmentType;
import com.contractauditor.domain.enums.EmailDiscoveryRunStatus;
import com.contractauditor.domain.enums.EmailProvider;
import com.contractauditor.domain.enums.SubscriptionStatus;
import com.contractauditor.dto.request.ConnectEmailRequest;
import com.contractauditor.dto.request.CreateSubscriptionRequest;
import com.contractauditor.dto.request.ImportDiscoveredRequest;
import com.contractauditor.dto.response.DiscoveredSubscriptionResponse;
import com.contractauditor.dto.response.EmailConnectionStatusResponse;
import com.contractauditor.dto.response.EmailDiscoveryAuthUrlResponse;
import com.contractauditor.dto.response.EmailDiscoveryImportResponse;
import com.contractauditor.dto.response.EmailDiscoveryScanResponse;
import com.contractauditor.dto.response.SubscriptionResponse;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.exception.ServiceUnavailableException;
import com.contractauditor.repository.EmailConnectionRepository;
import com.contractauditor.repository.EmailDiscoveryRunRepository;
import com.contractauditor.repository.SubscriptionRepository;
import com.contractauditor.security.SecurityUtils;
import com.contractauditor.service.EmailDiscoveryService;
import com.contractauditor.service.SubscriptionService;
import com.contractauditor.service.emaildiscovery.GmailScanService;
import com.contractauditor.service.emaildiscovery.GoogleOAuthService;
import com.contractauditor.service.emaildiscovery.GoogleTokenResult;
import com.contractauditor.service.emaildiscovery.OAuthStateService;
import com.contractauditor.service.emaildiscovery.SubscriptionEmailParser;
import com.contractauditor.service.emaildiscovery.TokenEncryptionService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmailDiscoveryServiceImpl implements EmailDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(EmailDiscoveryServiceImpl.class);

    private final EmailDiscoveryProperties properties;
    private final SecurityUtils securityUtils;
    private final EmailConnectionRepository emailConnectionRepository;
    private final EmailDiscoveryRunRepository emailDiscoveryRunRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final GoogleOAuthService googleOAuthService;
    private final OAuthStateService oAuthStateService;
    private final TokenEncryptionService tokenEncryptionService;
    private final GmailScanService gmailScanService;

    public EmailDiscoveryServiceImpl(
            EmailDiscoveryProperties properties,
            SecurityUtils securityUtils,
            EmailConnectionRepository emailConnectionRepository,
            EmailDiscoveryRunRepository emailDiscoveryRunRepository,
            SubscriptionRepository subscriptionRepository,
            SubscriptionService subscriptionService,
            GoogleOAuthService googleOAuthService,
            OAuthStateService oAuthStateService,
            TokenEncryptionService tokenEncryptionService,
            GmailScanService gmailScanService) {
        this.properties = properties;
        this.securityUtils = securityUtils;
        this.emailConnectionRepository = emailConnectionRepository;
        this.emailDiscoveryRunRepository = emailDiscoveryRunRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.googleOAuthService = googleOAuthService;
        this.oAuthStateService = oAuthStateService;
        this.tokenEncryptionService = tokenEncryptionService;
        this.gmailScanService = gmailScanService;
    }

    @Override
    @Transactional(readOnly = true)
    public EmailConnectionStatusResponse getStatus() {
        User user = securityUtils.getCurrentUser();
        Optional<EmailConnection> connection = emailConnectionRepository.findByUserIdAndRevokedAtIsNull(user.getId());
        return new EmailConnectionStatusResponse(
                properties.isConfigured(),
                connection.isPresent(),
                connection.map(EmailConnection::getEmailAddress).orElse(null),
                connection.map(EmailConnection::getConnectedAt).orElse(null),
                connection.map(EmailConnection::getLastSyncAt).orElse(null));
    }

    @Override
    public EmailDiscoveryAuthUrlResponse getAuthUrl() {
        ensureFeatureEnabled();
        User user = securityUtils.getCurrentUser();
        String state = oAuthStateService.createState(user.getId());
        String authUrl = googleOAuthService.buildAuthorizationUrl(state);
        return new EmailDiscoveryAuthUrlResponse(authUrl, state);
    }

    @Override
    @Transactional
    public EmailConnectionStatusResponse connect(ConnectEmailRequest request) {
        ensureFeatureEnabled();
        User user = securityUtils.getCurrentUser();
        oAuthStateService.validateState(request.state(), user.getId());

        GoogleTokenResult tokenResult = googleOAuthService.exchangeCode(request.code());
        EmailConnection connection = emailConnectionRepository.findByUserId(user.getId())
                .orElseGet(EmailConnection::new);
        connection.setUser(user);
        connection.setProvider(EmailProvider.GMAIL);
        connection.setEmailAddress(tokenResult.emailAddress());
        connection.setEncryptedRefreshToken(tokenEncryptionService.encrypt(tokenResult.refreshToken()));
        connection.setEncryptedAccessToken(tokenEncryptionService.encrypt(tokenResult.accessToken()));
        connection.setTokenExpiresAt(tokenResult.expiresAt());
        connection.setScopes(tokenResult.scopes());
        connection.setConnectedAt(connection.getConnectedAt() != null ? connection.getConnectedAt() : Instant.now());
        connection.setRevokedAt(null);
        emailConnectionRepository.save(connection);

        log.info("EmailDiscoveryServiceImpl.connect completed userId={} email={}", user.getId(), tokenResult.emailAddress());
        return getStatus();
    }

    @Override
    @Transactional
    public EmailDiscoveryScanResponse scan() {
        ensureFeatureEnabled();
        User user = securityUtils.getCurrentUser();
        EmailConnection connection = requireActiveConnection(user.getId());
        String accessToken = resolveAccessToken(connection);

        EmailDiscoveryRun run = new EmailDiscoveryRun();
        run.setUser(user);
        run.setStatus(EmailDiscoveryRunStatus.RUNNING);
        run.setStartedAt(Instant.now());
        emailDiscoveryRunRepository.save(run);

        try {
            GmailScanService.ScanResult scanResult = gmailScanService.scanInbox(accessToken);
            Set<String> existingProviders = loadExistingProviders(user.getId());
            List<DiscoveredSubscriptionResponse> suggestions = scanResult.suggestions().stream()
                    .map(parsed -> toDiscoveredResponse(parsed, existingProviders, user.getPreferredCurrency()))
                    .toList();

            connection.setLastSyncAt(Instant.now());
            emailConnectionRepository.save(connection);

            run.setMessagesScanned(scanResult.messagesScanned());
            run.setSuggestionsFound(suggestions.size());
            run.setStatus(EmailDiscoveryRunStatus.COMPLETED);
            run.setCompletedAt(Instant.now());
            emailDiscoveryRunRepository.save(run);

            log.info(
                    "EmailDiscoveryServiceImpl.scan completed userId={} messagesScanned={} suggestions={}",
                    user.getId(),
                    scanResult.messagesScanned(),
                    suggestions.size());
            return new EmailDiscoveryScanResponse(scanResult.messagesScanned(), suggestions);
        } catch (RuntimeException ex) {
            run.setStatus(EmailDiscoveryRunStatus.FAILED);
            run.setCompletedAt(Instant.now());
            emailDiscoveryRunRepository.save(run);
            throw ex;
        }
    }

    @Override
    public EmailDiscoveryImportResponse importSelected(ImportDiscoveredRequest request) {
        ensureFeatureEnabled();
        User user = securityUtils.getCurrentUser();
        requireActiveConnection(user.getId());
        Set<String> existingProviders = loadExistingProviders(user.getId());

        List<SubscriptionResponse> imported = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<EmailDiscoveryImportResponse.ImportError> errors = new ArrayList<>();

        for (ImportDiscoveredRequest.ImportDiscoveredItem item : request.suggestions()) {
            String providerKey = item.provider().trim().toLowerCase(Locale.ROOT);
            if (existingProviders.contains(providerKey)) {
                skipped.add(item.vendorKey() + " (already exists)");
                continue;
            }
            try {
                CreateSubscriptionRequest createRequest = buildCreateRequest(item);
                SubscriptionResponse created = subscriptionService.create(createRequest);
                imported.add(created);
                existingProviders.add(providerKey);
            } catch (RuntimeException ex) {
                log.warn("EmailDiscoveryServiceImpl.importSelected failed vendorKey={} message={}", item.vendorKey(), ex.getMessage());
                errors.add(new EmailDiscoveryImportResponse.ImportError(item.vendorKey(), ex.getMessage()));
            }
        }

        return new EmailDiscoveryImportResponse(imported, skipped, errors);
    }

    @Override
    @Transactional
    public void disconnect() {
        User user = securityUtils.getCurrentUser();
        emailConnectionRepository.findByUserIdAndRevokedAtIsNull(user.getId()).ifPresent(connection -> {
            try {
                String accessToken = tokenEncryptionService.decrypt(connection.getEncryptedAccessToken());
                googleOAuthService.revokeToken(accessToken);
            } catch (RuntimeException ex) {
                log.warn("EmailDiscoveryServiceImpl.disconnect revoke failed userId={}", user.getId());
            }
            connection.setRevokedAt(Instant.now());
            emailConnectionRepository.save(connection);
        });
    }

    private void ensureFeatureEnabled() {
        if (!properties.isConfigured()) {
            throw new ServiceUnavailableException("Email-based subscription discovery is not enabled");
        }
    }

    private EmailConnection requireActiveConnection(Long userId) {
        return emailConnectionRepository.findByUserIdAndRevokedAtIsNull(userId)
                .orElseThrow(() -> new BadRequestException("Connect Gmail before scanning your inbox"));
    }

    private String resolveAccessToken(EmailConnection connection) {
        if (connection.getTokenExpiresAt() != null && connection.getTokenExpiresAt().isAfter(Instant.now().plusSeconds(60))) {
            return tokenEncryptionService.decrypt(connection.getEncryptedAccessToken());
        }
        String refreshToken = tokenEncryptionService.decrypt(connection.getEncryptedRefreshToken());
        GoogleTokenResult refreshed = googleOAuthService.refreshAccessToken(refreshToken);
        connection.setEncryptedAccessToken(tokenEncryptionService.encrypt(refreshed.accessToken()));
        connection.setTokenExpiresAt(refreshed.expiresAt());
        emailConnectionRepository.save(connection);
        return refreshed.accessToken();
    }

    private Set<String> loadExistingProviders(Long userId) {
        Set<String> providers = new HashSet<>();
        for (Subscription subscription : subscriptionRepository.findByUserId(userId)) {
            providers.add(subscription.getProvider().trim().toLowerCase(Locale.ROOT));
        }
        return providers;
    }

    private DiscoveredSubscriptionResponse toDiscoveredResponse(
            SubscriptionEmailParser.ParsedSubscriptionEmail parsed,
            Set<String> existingProviders,
            String preferredCurrency) {
        boolean alreadyExists = existingProviders.contains(parsed.provider().toLowerCase(Locale.ROOT));
        BigDecimal amount = parsed.amount().compareTo(BigDecimal.ZERO) > 0
                ? parsed.amount()
                : BigDecimal.ZERO;
        return new DiscoveredSubscriptionResponse(
                parsed.vendorKey(),
                parsed.name(),
                parsed.provider(),
                parsed.category(),
                amount,
                preferredCurrency != null ? preferredCurrency.toUpperCase(Locale.ROOT) : "INR",
                parsed.billingFrequency(),
                parsed.renewalDate(),
                parsed.confidence(),
                alreadyExists,
                parsed.sourceSubject());
    }

    private CreateSubscriptionRequest buildCreateRequest(ImportDiscoveredRequest.ImportDiscoveredItem item) {
        LocalDate startDate = inferStartDate(item.renewalDate(), item.billingFrequency());
        LocalDate cancellationDeadline = item.renewalDate().minusDays(7);
        if (cancellationDeadline.isAfter(item.renewalDate())) {
            cancellationDeadline = item.renewalDate();
        }

        return new CreateSubscriptionRequest(
                item.name(),
                item.category(),
                item.provider(),
                SubscriptionStatus.ACTIVE,
                CommitmentType.SUBSCRIPTION,
                startDate,
                "Imported from Gmail discovery",
                null,
                null,
                new CreateSubscriptionRequest.ContractTermRequest(
                        item.billingFrequency(),
                        item.amount(),
                        item.currency().toUpperCase(Locale.ROOT),
                        null,
                        item.renewalDate(),
                        7,
                        true,
                        null,
                        false),
                null);
    }

    private LocalDate inferStartDate(LocalDate renewalDate, com.contractauditor.domain.enums.BillingFrequency frequency) {
        return switch (frequency) {
            case WEEKLY -> renewalDate.minusWeeks(1);
            case MONTHLY -> renewalDate.minusMonths(1);
            case QUARTERLY -> renewalDate.minusMonths(3);
            case SEMI_ANNUAL -> renewalDate.minusMonths(6);
            case ANNUAL -> renewalDate.minusYears(1);
            case ONE_TIME -> renewalDate;
        };
    }
}
