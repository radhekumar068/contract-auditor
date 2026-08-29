package com.contractauditor.service.emaildiscovery;

import com.contractauditor.config.EmailDiscoveryProperties;
import com.contractauditor.exception.BadRequestException;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Profile;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class GoogleOAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuthService.class);
    private static final String GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
    private static final List<String> SCOPES = List.of(GMAIL_READONLY_SCOPE);

    private final EmailDiscoveryProperties properties;
    private final NetHttpTransport httpTransport;
    private final GsonFactory jsonFactory;

    public GoogleOAuthService(EmailDiscoveryProperties properties) {
        this.properties = properties;
        this.httpTransport = new NetHttpTransport();
        this.jsonFactory = GsonFactory.getDefaultInstance();
    }

    public String buildAuthorizationUrl(String state) {
        GoogleAuthorizationCodeFlow flow = buildFlow();
        GoogleAuthorizationCodeRequestUrl url = flow.newAuthorizationUrl()
                .setRedirectUri(properties.getRedirectUri())
                .setState(state)
                .setAccessType("offline")
                .set("prompt", "consent");
        return url.build();
    }

    public GoogleTokenResult exchangeCode(String code) {
        try {
            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    httpTransport,
                    jsonFactory,
                    properties.getGoogleClientId(),
                    properties.getGoogleClientSecret(),
                    code,
                    properties.getRedirectUri())
                    .execute();

            String accessToken = tokenResponse.getAccessToken();
            String refreshToken = tokenResponse.getRefreshToken();
            if (accessToken == null || accessToken.isBlank()) {
                throw new BadRequestException("Google did not return an access token");
            }
            if (refreshToken == null || refreshToken.isBlank()) {
                throw new BadRequestException("Google did not return a refresh token. Reconnect and approve all permissions.");
            }

            Instant expiresAt = tokenResponse.getExpiresInSeconds() != null
                    ? Instant.now().plusSeconds(tokenResponse.getExpiresInSeconds())
                    : Instant.now().plusSeconds(3600);

            String email = fetchGmailProfileEmail(accessToken);
            return new GoogleTokenResult(
                    accessToken,
                    refreshToken,
                    expiresAt,
                    email,
                    String.join(" ", SCOPES));
        } catch (IOException ex) {
            log.warn("GoogleOAuthService.exchangeCode failed message={}", ex.getMessage());
            throw new BadRequestException("Failed to connect Gmail: " + ex.getMessage());
        }
    }

    public GoogleTokenResult refreshAccessToken(String refreshToken) {
        try {
            GoogleTokenResponse tokenResponse = new com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest(
                    httpTransport,
                    jsonFactory,
                    refreshToken,
                    properties.getGoogleClientId(),
                    properties.getGoogleClientSecret())
                    .execute();

            String accessToken = tokenResponse.getAccessToken();
            if (accessToken == null || accessToken.isBlank()) {
                throw new BadRequestException("Failed to refresh Gmail access token");
            }
            Instant expiresAt = tokenResponse.getExpiresInSeconds() != null
                    ? Instant.now().plusSeconds(tokenResponse.getExpiresInSeconds())
                    : Instant.now().plusSeconds(3600);
            String email = fetchGmailProfileEmail(accessToken);
            return new GoogleTokenResult(accessToken, refreshToken, expiresAt, email, String.join(" ", SCOPES));
        } catch (IOException ex) {
            log.warn("GoogleOAuthService.refreshAccessToken failed message={}", ex.getMessage());
            throw new BadRequestException("Gmail session expired. Please reconnect your account.");
        }
    }

    public void revokeToken(String token) {
        try {
            new com.google.api.client.googleapis.auth.oauth2.GoogleCredential.Builder()
                    .setTransport(httpTransport)
                    .setJsonFactory(jsonFactory)
                    .build()
                    .setAccessToken(token);
            String revokeUrl = "https://oauth2.googleapis.com/revoke?token=" + token;
            httpTransport.createRequestFactory()
                    .buildPostRequest(new com.google.api.client.http.GenericUrl(revokeUrl), null)
                    .execute();
        } catch (IOException ex) {
            log.warn("GoogleOAuthService.revokeToken failed message={}", ex.getMessage());
        }
    }

    private String fetchGmailProfileEmail(String accessToken) throws IOException {
        com.google.api.client.googleapis.auth.oauth2.GoogleCredential credential =
                new com.google.api.client.googleapis.auth.oauth2.GoogleCredential.Builder()
                        .setTransport(httpTransport)
                        .setJsonFactory(jsonFactory)
                        .build()
                        .setAccessToken(accessToken);

        Gmail gmail = new Gmail.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName("Contract Auditor")
                .build();
        Profile profile = gmail.users().getProfile("me").execute();
        return profile.getEmailAddress();
    }

    private GoogleAuthorizationCodeFlow buildFlow() {
        return new GoogleAuthorizationCodeFlow.Builder(
                httpTransport,
                jsonFactory,
                properties.getGoogleClientId(),
                properties.getGoogleClientSecret(),
                SCOPES)
                .setAccessType("offline")
                .build();
    }
}
