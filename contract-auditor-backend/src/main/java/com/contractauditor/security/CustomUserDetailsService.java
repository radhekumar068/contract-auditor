package com.contractauditor.security;

import com.contractauditor.domain.entity.User;
import com.contractauditor.exception.UnauthorizedException;
import com.contractauditor.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(CustomUserDetailsService.class);

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("CustomUserDetailsService.loadUserByUsername email={}", username);
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> {
                    log.warn("CustomUserDetailsService.loadUserByUsername user not found email={}", username);
                    return new UsernameNotFoundException("User not found: " + username);
                });

        log.debug("CustomUserDetailsService.loadUserByUsername completed userId={}", user.getId());
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                java.util.List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    public User loadEntityByEmail(String email) {
        log.debug("CustomUserDetailsService.loadEntityByEmail email={}", email);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("CustomUserDetailsService.loadEntityByEmail user not found email={}", email);
                    return new UnauthorizedException("Not authenticated");
                });
    }
}
