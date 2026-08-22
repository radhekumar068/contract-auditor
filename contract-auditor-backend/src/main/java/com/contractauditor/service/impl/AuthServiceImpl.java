package com.contractauditor.service.impl;

import com.contractauditor.domain.CountryCurrency;
import com.contractauditor.domain.entity.User;
import com.contractauditor.dto.request.LoginRequest;
import com.contractauditor.dto.request.RegisterRequest;
import com.contractauditor.dto.response.AuthResponse;
import com.contractauditor.dto.response.UserResponse;
import com.contractauditor.exception.ConflictException;
import com.contractauditor.exception.UnauthorizedException;
import com.contractauditor.mapper.SubscriptionMapper;
import com.contractauditor.repository.UserRepository;
import com.contractauditor.security.JwtTokenProvider;
import com.contractauditor.service.AuthService;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final SubscriptionMapper subscriptionMapper;

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            SubscriptionMapper subscriptionMapper) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.subscriptionMapper = subscriptionMapper;
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
