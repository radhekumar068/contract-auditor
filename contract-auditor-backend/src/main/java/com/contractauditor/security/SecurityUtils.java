package com.contractauditor.security;

import com.contractauditor.domain.entity.User;
import com.contractauditor.exception.UnauthorizedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    private static final Logger log = LoggerFactory.getLogger(SecurityUtils.class);

    private final CustomUserDetailsService userDetailsService;

    public SecurityUtils(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    public User getCurrentUser() {
        log.debug("SecurityUtils.getCurrentUser entered");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            log.warn("SecurityUtils.getCurrentUser rejected unauthenticated request");
            throw new UnauthorizedException("Not authenticated");
        }
        User user = userDetailsService.loadEntityByEmail(authentication.getName());
        log.debug("SecurityUtils.getCurrentUser completed userId={}", user.getId());
        return user;
    }
}
