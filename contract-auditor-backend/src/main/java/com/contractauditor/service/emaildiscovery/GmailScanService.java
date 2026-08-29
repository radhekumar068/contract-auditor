package com.contractauditor.service.emaildiscovery;

import com.contractauditor.config.EmailDiscoveryProperties;
import com.contractauditor.domain.entity.EmailConnection;
import com.contractauditor.exception.BadRequestException;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class GmailScanService {

    private static final Logger log = LoggerFactory.getLogger(GmailScanService.class);

    private final EmailDiscoveryProperties properties;
    private final SubscriptionEmailParser parser;
    private final NetHttpTransport httpTransport;
    private final GsonFactory jsonFactory;

    public GmailScanService(EmailDiscoveryProperties properties, SubscriptionEmailParser parser) {
        this.properties = properties;
        this.parser = parser;
        this.httpTransport = new NetHttpTransport();
        this.jsonFactory = GsonFactory.getDefaultInstance();
    }

    public ScanResult scanInbox(String accessToken) {
        try {
            Gmail gmail = buildGmailClient(accessToken);
            String query = buildSearchQuery();
            ListMessagesResponse listResponse = gmail.users().messages().list("me")
                    .setQ(query)
                    .setMaxResults((long) properties.getScanMaxMessages())
                    .execute();

            List<Message> messageRefs = listResponse.getMessages() != null
                    ? listResponse.getMessages()
                    : List.of();

            List<SubscriptionEmailParser.ParsedSubscriptionEmail> parsed = new ArrayList<>();
            for (Message ref : messageRefs) {
                Message fullMessage = gmail.users().messages().get("me", ref.getId())
                        .setFormat("full")
                        .execute();
                parseMessage(fullMessage).ifPresent(parsed::add);
            }

            List<SubscriptionEmailParser.ParsedSubscriptionEmail> deduped = parser.deduplicateByVendor(parsed);
            return new ScanResult(messageRefs.size(), deduped);
        } catch (IOException ex) {
            log.warn("GmailScanService.scanInbox failed message={}", ex.getMessage());
            throw new BadRequestException("Failed to scan Gmail inbox: " + ex.getMessage());
        }
    }

    private Optional<SubscriptionEmailParser.ParsedSubscriptionEmail> parseMessage(Message message) {
        String from = headerValue(message, "From");
        String subject = headerValue(message, "Subject");
        String body = extractBody(message.getPayload());
        Instant receivedAt = message.getInternalDate() != null
                ? Instant.ofEpochMilli(message.getInternalDate())
                : Instant.now();
        return parser.parse(from, subject, body, receivedAt);
    }

    private String buildSearchQuery() {
        return "(subject:(subscription OR renewal OR receipt OR invoice OR membership OR payment) "
                + "OR from:(netflix.com OR amazon.in OR amazon.com OR hotstar.com OR sonyliv.com OR zee5.com OR spotify.com OR disneyplus.com)) "
                + "newer_than:" + properties.getScanLookbackDays() + "d";
    }

    private Gmail buildGmailClient(String accessToken) {
        GoogleCredential credential = new GoogleCredential.Builder()
                .setTransport(httpTransport)
                .setJsonFactory(jsonFactory)
                .build()
                .setAccessToken(accessToken);
        return new Gmail.Builder(httpTransport, jsonFactory, credential)
                .setApplicationName("Contract Auditor")
                .build();
    }

    private static String headerValue(Message message, String name) {
        if (message.getPayload() == null || message.getPayload().getHeaders() == null) {
            return "";
        }
        return message.getPayload().getHeaders().stream()
                .filter(header -> name.equalsIgnoreCase(header.getName()))
                .map(MessagePartHeader::getValue)
                .findFirst()
                .orElse("");
    }

    private static String extractBody(MessagePart part) {
        if (part == null) {
            return "";
        }
        StringBuilder body = new StringBuilder();
        if (part.getBody() != null && part.getBody().getData() != null) {
            body.append(decodeBase64Url(part.getBody().getData()));
        }
        if (part.getParts() != null) {
            for (MessagePart child : part.getParts()) {
                body.append(' ').append(extractBody(child));
            }
        }
        return body.toString();
    }

    private static String decodeBase64Url(String data) {
        byte[] decoded = Base64.getUrlDecoder().decode(data);
        return new String(decoded, StandardCharsets.UTF_8);
    }

    public record ScanResult(
            int messagesScanned,
            List<SubscriptionEmailParser.ParsedSubscriptionEmail> suggestions
    ) {
    }
}
