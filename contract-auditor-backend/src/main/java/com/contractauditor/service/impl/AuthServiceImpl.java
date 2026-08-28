package com.contractauditor.service.impl;

import com.contractauditor.domain.CountryCurrency;
import com.contractauditor.domain.entity.PasswordResetToken;
import com.contractauditor.domain.entity.User;
import com.contractauditor.dto.request.ForgotPasswordRequest;
import com.contractauditor.dto.request.LoginRequest;
import com.contractauditor.dto.request.RegisterRequest;
import com.contractauditor.dto.request.ResetPasswordRequest;
import com.contractauditor.dto.response.AuthResponse;
import com.contractauditor.dto.response.MessageResponse;
import com.contractauditor.dto.response.UserResponse;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.exception.ConflictException;
import com.contractauditor.exception.UnauthorizedException;
import com.contractauditor.mapper.SubscriptionMapper;
import com.contractauditor.repository.PasswordResetTokenRepository;
import com.contractauditor.repository.UserRepository;
import com.contractauditor.security.JwtTokenProvider;
import com.contractauditor.service.AuthService;
import com.contractauditor.service.EmailService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String FORGOT_PASSWORD_MESSAGE =
            "If an account exists for that email, a password reset link has been sent.";

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final SubscriptionMapper subscriptionMapper;
    private final EmailService emailService;
    private final String frontendBaseUrl;
    private final long tokenExpiryMinutes;

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            SubscriptionMapper subscriptionMapper,
            EmailService emailService,
            @Value("${app.password-reset.frontend-base-url}") String frontendBaseUrl,
            @Value("${app.password-reset.token-expiry-minutes}") long tokenExpiryMinutes) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.subscriptionMapper = subscriptionMapper;
        this.emailService = emailService;
        this.frontendBaseUrl = trimTrailingSlash(frontendBaseUrl);
        this.tokenExpiryMinutes = tokenExpiryMinutes;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        log.info("AuthServiceImpl.register entered email={}", email);

        if (userRepository.existsByEmail(email)) {
            log.warn("AuthServiceImpl.register rejected duplicate email={}", email);
            throw new ConflictException("Email already registered");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        String countryCode = CountryCurrency.normalizeCountry(request.countryCode());
        user.setCountryCode(countryCode);
        user.setPreferredCurrency(CountryCurrency.currencyFor(countryCode));
        user.setPhoneNumber(request.phoneNumber().trim());
        user.setRole(request.role());
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        log.debug("AuthServiceImpl.register persisted userId={} countryCode={}", user.getId(), countryCode);

        AuthResponse response = toAuthResponse(user);
        log.info("AuthServiceImpl.register completed userId={}", user.getId());
        return response;
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        log.info("AuthServiceImpl.login entered email={}", email);

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException ex) {
            log.warn("AuthServiceImpl.login authentication failed email={}", email);
            throw new UnauthorizedException("Invalid email or password");
        }
        log.debug("AuthServiceImpl.login authentication succeeded email={}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        AuthResponse response = toAuthResponse(user);
        log.info("AuthServiceImpl.login completed userId={}", user.getId());
        return response;
    }

    @Override
    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        log.info("AuthServiceImpl.forgotPassword entered email={}", email);

        passwordResetTokenRepository.deleteExpiredBefore(Instant.now());

        userRepository.findByEmail(email).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getId());

            String rawToken = generateRawToken();
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setTokenHash(hashToken(rawToken));
            resetToken.setExpiresAt(Instant.now().plus(tokenExpiryMinutes, ChronoUnit.MINUTES));
            passwordResetTokenRepository.save(resetToken);

            String resetUrl = frontendBaseUrl + "/reset-password?token=" + rawToken;
            try {
                emailService.sendPasswordResetEmail(user.getEmail(), resetUrl);
            } catch (Exception ex) {
                log.warn(
                        "AuthServiceImpl.forgotPassword email delivery failed userId={}: {}",
                        user.getId(),
                        ex.getMessage());
            }
        });

        log.info("AuthServiceImpl.forgotPassword completed email={}", email);
        return new MessageResponse(FORGOT_PASSWORD_MESSAGE);
    }

    @Override
    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        log.info("AuthServiceImpl.resetPassword entered");

        PasswordResetToken resetToken = findValidResetToken(request.token().trim())
                .orElseThrow(() -> new BadRequestException("This password reset link is invalid or has expired."));
        Long userId = resetToken.getUser().getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("This password reset link is invalid or has expired."));

        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            log.warn("AuthServiceImpl.resetPassword new password unchanged userId={}", user.getId());
            throw new BadRequestException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.saveAndFlush(user);
        passwordResetTokenRepository.deleteByUserId(userId);

        log.info("AuthServiceImpl.resetPassword completed userId={}", user.getId());
        return new MessageResponse("Your password has been updated. You can now sign in with your new password.");
    }

    @Override
    @Transactional(readOnly = true)
    public MessageResponse validateResetToken(String token) {
        log.debug("AuthServiceImpl.validateResetToken entered");

        if (findValidResetToken(token.trim()).isEmpty()) {
            log.warn("AuthServiceImpl.validateResetToken invalid or expired token");
            throw new BadRequestException("This password reset link is invalid or has expired.");
        }

        return new MessageResponse("Password reset link is valid.");
    }

    private Optional<PasswordResetToken> findValidResetToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        String tokenHash = hashToken(rawToken.trim());
        return passwordResetTokenRepository.findByTokenHashAndExpiresAtAfter(tokenHash, Instant.now());
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private static String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:4200";
        }
        String trimmed = value.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private AuthResponse toAuthResponse(User user) {
        log.debug("AuthServiceImpl.toAuthResponse userId={}", user.getId());
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities("ROLE_" + user.getRole().name())
                .build();
        String token = jwtTokenProvider.generateToken(userDetails);
        UserResponse userResponse = subscriptionMapper.toUserResponse(user);
        return new AuthResponse(token, "Bearer", userResponse);
    }
}
