package com.contractauditor.service.emaildiscovery;

import com.contractauditor.config.EmailDiscoveryProperties;
import com.contractauditor.exception.BadRequestException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class TokenEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final SecretKey secretKey;

    public TokenEncryptionService(EmailDiscoveryProperties properties) {
        this.secretKey = buildKey(properties.getTokenEncryptionKey());
    }

    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) {
            throw new BadRequestException("Cannot encrypt empty token");
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            java.security.SecureRandom random = new java.security.SecureRandom();
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Token encryption failed", ex);
        }
    }

    public String decrypt(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) {
            throw new BadRequestException("Cannot decrypt empty token");
        }
        try {
            byte[] combined = Base64.getDecoder().decode(encrypted);
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            byte[] cipherText = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] plain = cipher.doFinal(cipherText);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("Token decryption failed", ex);
        }
    }

    private static SecretKey buildKey(String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            byte[] placeholder = new byte[32];
            return new SecretKeySpec(placeholder, "AES");
        }
        byte[] decoded = Base64.getDecoder().decode(base64Key.trim());
        if (decoded.length != 16 && decoded.length != 24 && decoded.length != 32) {
            throw new IllegalStateException("EMAIL_TOKEN_ENCRYPTION_KEY must decode to 16, 24, or 32 bytes");
        }
        return new SecretKeySpec(decoded, "AES");
    }
}
