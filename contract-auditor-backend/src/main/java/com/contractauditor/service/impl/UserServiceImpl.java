package com.contractauditor.service.impl;

import com.contractauditor.domain.CountryCurrency;
import com.contractauditor.domain.entity.User;
import com.contractauditor.dto.request.ChangePasswordRequest;
import com.contractauditor.dto.request.UpdateProfileRequest;
import com.contractauditor.dto.response.ProfileResponse;
import com.contractauditor.dto.response.UpdateProfileResponse;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.exception.ConflictException;
import com.contractauditor.mapper.SubscriptionMapper;
import com.contractauditor.repository.UserRepository;
import com.contractauditor.security.JwtTokenProvider;
import com.contractauditor.security.SecurityUtils;
import com.contractauditor.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger log = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final SubscriptionMapper subscriptionMapper;
    private final SecurityUtils securityUtils;

    public UserServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider,
            SubscriptionMapper subscriptionMapper,
            SecurityUtils securityUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.subscriptionMapper = subscriptionMapper;
        this.securityUtils = securityUtils;
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileResponse getCurrentProfile() {
        log.info("UserServiceImpl.getCurrentProfile entered");
        User user = securityUtils.getCurrentUser();
        ProfileResponse response = subscriptionMapper.toProfileResponse(user);
        log.info("UserServiceImpl.getCurrentProfile completed userId={}", user.getId());
        return response;
    }

    @Override
    @Transactional
    public UpdateProfileResponse updateCurrentProfile(UpdateProfileRequest request) {
        log.info("UserServiceImpl.updateCurrentProfile entered");
        User user = securityUtils.getCurrentUser();
        String nextEmail = request.email().trim().toLowerCase();
        String nextName = request.fullName().trim();
        log.debug("UserServiceImpl.updateCurrentProfile userId={} nextEmail={}", user.getId(), nextEmail);

        if (userRepository.existsByEmailAndIdNot(nextEmail, user.getId())) {
            log.warn("UserServiceImpl.updateCurrentProfile email conflict userId={} email={}", user.getId(), nextEmail);
            throw new ConflictException("Email already registered");
        }

        String countryCode = CountryCurrency.normalizeCountry(request.countryCode());
        user.setFullName(nextName);
        user.setEmail(nextEmail);
        user.setCountryCode(countryCode);
        user.setPreferredCurrency(CountryCurrency.currencyFor(countryCode));
        if (request.phoneNumber() != null && !request.phoneNumber().isBlank()) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }
        userRepository.save(user);

        UpdateProfileResponse response = new UpdateProfileResponse(
                subscriptionMapper.toProfileResponse(user),
                generateToken(user),
                "Bearer");
        log.info("UserServiceImpl.updateCurrentProfile completed userId={}", user.getId());
        return response;
    }

    @Override
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        log.info("UserServiceImpl.changePassword entered");
        User user = securityUtils.getCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            log.warn("UserServiceImpl.changePassword current password mismatch userId={}", user.getId());
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            log.warn("UserServiceImpl.changePassword new password unchanged userId={}", user.getId());
            throw new BadRequestException("New password must be different from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        log.info("UserServiceImpl.changePassword completed userId={}", user.getId());
    }

    private String generateToken(User user) {
        log.debug("UserServiceImpl.generateToken userId={}", user.getId());
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities("ROLE_" + user.getRole().name())
                .build();
        return jwtTokenProvider.generateToken(userDetails);
    }
}
