package com.contractauditor.service.emaildiscovery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.contractauditor.config.EmailDiscoveryProperties;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TokenEncryptionServiceTest {

    private TokenEncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        EmailDiscoveryProperties properties = new EmailDiscoveryProperties();
        properties.setTokenEncryptionKey(Base64.getEncoder().encodeToString(new byte[32]));
        encryptionService = new TokenEncryptionService(properties);
    }

    @Test
    void encryptDecryptRoundTrip() {
        String plain = "refresh-token-value-12345";
        String encrypted = encryptionService.encrypt(plain);
        assertNotEquals(plain, encrypted);
        assertEquals(plain, encryptionService.decrypt(encrypted));
    }
}
