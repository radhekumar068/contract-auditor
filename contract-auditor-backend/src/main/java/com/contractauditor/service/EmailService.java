package com.contractauditor.service;

public interface EmailService {

    void sendPasswordResetEmail(String recipientEmail, String resetUrl);
}
