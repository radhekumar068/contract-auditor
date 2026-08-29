CREATE TABLE email_connections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(20) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    encrypted_access_token TEXT NULL,
    token_expires_at TIMESTAMP NULL,
    scopes VARCHAR(500) NOT NULL,
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT fk_email_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_email_connections_user (user_id),
    INDEX idx_email_connections_email (email_address)
);

CREATE TABLE email_discovery_runs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL,
    messages_scanned INT NOT NULL DEFAULT 0,
    suggestions_found INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    CONSTRAINT fk_email_discovery_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_email_discovery_runs_user (user_id)
);
