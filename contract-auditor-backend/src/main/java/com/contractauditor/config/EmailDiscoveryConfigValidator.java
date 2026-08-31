package com.contractauditor.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class EmailDiscoveryConfigValidator {

    private static final Logger log = LoggerFactory.getLogger(EmailDiscoveryConfigValidator.class);

    public EmailDiscoveryConfigValidator(EmailDiscoveryProperties properties) {
        if (!properties.isEnabled()) {
            log.info(
                    "Email discovery is disabled (EMAIL_DISCOVERY_ENABLED=false). "
                            + "Set EMAIL_DISCOVERY_ENABLED=true in the server env file and restart to show "
                            + "'Discover from Email' in the UI.");
            return;
        }
        if (!properties.isConfigured()) {
            log.warn(
                    "EMAIL_DISCOVERY_ENABLED=true but email discovery is not fully configured. "
                            + "Missing: clientId={}, clientSecret={}, redirectUri={}, tokenKey={}",
                    isBlank(properties.getGoogleClientId()),
                    isBlank(properties.getGoogleClientSecret()),
                    isBlank(properties.getRedirectUri()),
                    isBlank(properties.getTokenEncryptionKey()));
            throw new IllegalStateException(
                    "EMAIL_DISCOVERY_ENABLED is true but required settings are missing. "
                            + "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, "
                            + "and EMAIL_TOKEN_ENCRYPTION_KEY (generate with: openssl rand -base64 32).");
        }
        validateEncryptionKey(properties.getTokenEncryptionKey());
        log.info("Email discovery is enabled and configured.");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static void validateEncryptionKey(String base64Key) {
        byte[] decoded = java.util.Base64.getDecoder().decode(base64Key.trim());
        if (decoded.length != 16 && decoded.length != 24 && decoded.length != 32) {
            throw new IllegalStateException(
                    "EMAIL_TOKEN_ENCRYPTION_KEY must decode to 16, 24, or 32 bytes");
        }
    }
}
