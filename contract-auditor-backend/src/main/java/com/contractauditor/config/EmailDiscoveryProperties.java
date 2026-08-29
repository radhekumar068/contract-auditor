package com.contractauditor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.email-discovery")
public class EmailDiscoveryProperties {

    private boolean enabled;
    private String googleClientId = "";
    private String googleClientSecret = "";
    private String redirectUri = "";
    private String tokenEncryptionKey = "";
    private int scanMaxMessages = 100;
    private int scanLookbackDays = 730;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getGoogleClientId() {
        return googleClientId;
    }

    public void setGoogleClientId(String googleClientId) {
        this.googleClientId = googleClientId;
    }

    public String getGoogleClientSecret() {
        return googleClientSecret;
    }

    public void setGoogleClientSecret(String googleClientSecret) {
        this.googleClientSecret = googleClientSecret;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public String getTokenEncryptionKey() {
        return tokenEncryptionKey;
    }

    public void setTokenEncryptionKey(String tokenEncryptionKey) {
        this.tokenEncryptionKey = tokenEncryptionKey;
    }

    public int getScanMaxMessages() {
        return scanMaxMessages;
    }

    public void setScanMaxMessages(int scanMaxMessages) {
        this.scanMaxMessages = scanMaxMessages;
    }

    public int getScanLookbackDays() {
        return scanLookbackDays;
    }

    public void setScanLookbackDays(int scanLookbackDays) {
        this.scanLookbackDays = scanLookbackDays;
    }

    public boolean isConfigured() {
        return enabled
                && googleClientId != null && !googleClientId.isBlank()
                && googleClientSecret != null && !googleClientSecret.isBlank()
                && redirectUri != null && !redirectUri.isBlank()
                && tokenEncryptionKey != null && !tokenEncryptionKey.isBlank();
    }
}
