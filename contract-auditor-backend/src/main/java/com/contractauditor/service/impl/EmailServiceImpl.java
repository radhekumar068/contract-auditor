package com.contractauditor.service.impl;

import com.contractauditor.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public EmailServiceImpl(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendPasswordResetEmail(String recipientEmail, String resetUrl) {
        log.info("EmailServiceImpl.sendPasswordResetEmail entered recipient={}", recipientEmail);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipientEmail);
        message.setSubject("Reset your Contract Auditor password");
        message.setText(buildBody(resetUrl));

        try {
            mailSender.send(message);
            log.info("EmailServiceImpl.sendPasswordResetEmail sent recipient={}", recipientEmail);
        } catch (Exception ex) {
            log.warn(
                    "EmailServiceImpl.sendPasswordResetEmail failed recipient={}: {}",
                    recipientEmail,
                    ex.getMessage());
            log.info("Password reset link for {}: {}", recipientEmail, resetUrl);
            throw ex;
        }
    }

    private String buildBody(String resetUrl) {
        return "Hello,\n\n"
                + "We received a request to reset your Contract Auditor password.\n\n"
                + "Reset your password using this link (valid for a limited time):\n"
                + resetUrl
                + "\n\n"
                + "If you did not request this, you can ignore this email.\n\n"
                + "— Contract Auditor";
    }
}
