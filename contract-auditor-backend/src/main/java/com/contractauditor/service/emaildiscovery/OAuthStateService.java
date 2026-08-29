package com.contractauditor.service.emaildiscovery;

import com.contractauditor.config.EmailDiscoveryProperties;
import com.contractauditor.exception.BadRequestException;
import com.contractauditor.exception.UnauthorizedException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class OAuthStateService {

    private static final long STATE_TTL_SECONDS = 600;

    private final byte[] signingKey;

    public OAuthStateService(EmailDiscoveryProperties properties) {
        String keyMaterial = properties.getTokenEncryptionKey();
        if (keyMaterial == null || keyMaterial.isBlank()) {
            this.signingKey = new byte[32];
        } else {
            this.signingKey = Base64.getDecoder().decode(keyMaterial.trim());
        }
    }

    public String createState(Long userId) {
        long expiresAt = Instant.now().getEpochSecond() + STATE_TTL_SECONDS;
        String nonce = HexFormat.of().formatHex(randomBytes(16));
        String payload = userId + "|" + expiresAt + "|" + nonce;
        String signature = sign(payload);
        return Base64.getUrlEncoder().withoutPadding().encodeToString((payload + "|" + signature).getBytes(StandardCharsets.UTF_8));
    }

    public Long validateState(String state, Long expectedUserId) {
        if (state == null || state.isBlank()) {
            throw new BadRequestException("OAuth state is required");
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(state), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length != 4) {
                throw new BadRequestException("Invalid OAuth state");
            }
            Long userId = Long.parseLong(parts[0]);
            long expiresAt = Long.parseLong(parts[1]);
            String payload = parts[0] + "|" + parts[1] + "|" + parts[2];
            String expectedSignature = sign(payload);
            if (!MessageDigest.isEqual(
                    HexFormat.of().parseHex(expectedSignature),
                    HexFormat.of().parseHex(parts[3]))) {
                throw new BadRequestException("Invalid OAuth state signature");
            }
            if (Instant.now().getEpochSecond() > expiresAt) {
                throw new BadRequestException("OAuth state has expired");
            }
            if (!userId.equals(expectedUserId)) {
                throw new UnauthorizedException("OAuth state does not match current user");
            }
            return userId;
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid OAuth state format");
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign OAuth state", ex);
        }
    }

    private static byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        new java.security.SecureRandom().nextBytes(bytes);
        return bytes;
    }
}
