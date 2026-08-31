package com.contractauditor.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class EmailDiscoveryConfigValidatorTest {

    @Test
    void passesWhenEmailDiscoveryDisabled() {
        EmailDiscoveryProperties properties = new EmailDiscoveryProperties();
        properties.setEnabled(false);
        assertDoesNotThrow(() -> new EmailDiscoveryConfigValidator(properties));
    }

    @Test
    void failsWhenEnabledWithoutRequiredSettings() {
        EmailDiscoveryProperties properties = new EmailDiscoveryProperties();
        properties.setEnabled(true);
        assertThrows(IllegalStateException.class, () -> new EmailDiscoveryConfigValidator(properties));
    }

    @Test
    void passesWhenEnabledWithFullConfiguration() {
        EmailDiscoveryProperties properties = new EmailDiscoveryProperties();
        properties.setEnabled(true);
        properties.setGoogleClientId("client-id");
        properties.setGoogleClientSecret("client-secret");
        properties.setRedirectUri("https://example.com/oauth/google/callback");
        properties.setTokenEncryptionKey(Base64.getEncoder().encodeToString(new byte[32]));
        assertDoesNotThrow(() -> new EmailDiscoveryConfigValidator(properties));
    }
}
