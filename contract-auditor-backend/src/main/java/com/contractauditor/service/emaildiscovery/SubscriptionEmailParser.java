package com.contractauditor.service.emaildiscovery;

import com.contractauditor.domain.enums.BillingFrequency;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class SubscriptionEmailParser {

    private static final Pattern AMOUNT_PATTERN = Pattern.compile(
            "(?:₹|Rs\\.?|INR)\\s*([\\d,]+(?:\\.\\d{1,2})?)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern DATE_PATTERN = Pattern.compile(
            "(\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4})",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ISO_DATE_PATTERN = Pattern.compile(
            "(\\d{4}-\\d{2}-\\d{2})");

    private static final List<VendorRule> VENDOR_RULES = List.of(
            new VendorRule("netflix", "Netflix", "Netflix", "Entertainment",
                    List.of("netflix.com", "mailer.netflix.com"),
                    List.of("membership", "renewed", "payment", "subscription"),
                    "Go to Account → Membership & Billing → Cancel Membership"),
            new VendorRule("amazon_prime", "Amazon Prime", "Amazon", "Entertainment",
                    List.of("amazon.in", "amazon.com"),
                    List.of("prime membership", "prime video", "prime renewal", "prime payment"),
                    "Go to Amazon → Your Memberships → End membership"),
            new VendorRule("hotstar", "Disney+ Hotstar", "Hotstar", "Entertainment",
                    List.of("hotstar.com", "disneyhotstar"),
                    List.of("subscription", "renewed", "plan", "membership"),
                    "Go to Profile → Subscription → Cancel"),
            new VendorRule("sonyliv", "SonyLIV", "SonyLIV", "Entertainment",
                    List.of("sonyliv.com"),
                    List.of("subscription", "renewed", "plan"),
                    "Go to Account → Subscription → Cancel"),
            new VendorRule("zee5", "Zee5", "Zee5", "Entertainment",
                    List.of("zee5.com"),
                    List.of("subscription", "renewed", "plan"),
                    "Go to Account → Subscription → Cancel"),
            new VendorRule("spotify", "Spotify Premium", "Spotify", "Entertainment",
                    List.of("spotify.com"),
                    List.of("premium", "receipt", "subscription", "renewed"),
                    "Go to Account → Manage Premium → Cancel Premium"),
            new VendorRule("disney", "Disney+", "Disney", "Entertainment",
                    List.of("disneyplus.com", "disney.com"),
                    List.of("subscription", "renewed", "membership"),
                    "Go to Profile → Account → Cancel Subscription")
    );

    public Optional<ParsedSubscriptionEmail> parse(String from, String subject, String body, Instant receivedAt) {
        String combined = (from + " " + subject + " " + body).toLowerCase(Locale.ROOT);
        for (VendorRule rule : VENDOR_RULES) {
            if (!rule.matches(combined)) {
                continue;
            }
            BigDecimal amount = extractAmount(combined).orElse(BigDecimal.ZERO);
            BillingFrequency billing = extractBillingFrequency(combined);
            LocalDate renewalDate = extractRenewalDate(combined, subject + " " + body)
                    .orElse(receivedAt != null
                            ? receivedAt.atZone(java.time.ZoneOffset.UTC).toLocalDate().plusMonths(1)
                            : LocalDate.now().plusMonths(1));

            double confidence = calculateConfidence(amount, billing, renewalDate, rule);
            return Optional.of(new ParsedSubscriptionEmail(
                    rule.vendorKey(),
                    rule.name(),
                    rule.provider(),
                    rule.category(),
                    amount,
                    billing,
                    renewalDate,
                    confidence,
                    subject,
                    rule.cancellationWorkflow(),
                    receivedAt != null ? receivedAt : Instant.now()));
        }
        return Optional.empty();
    }

    public List<ParsedSubscriptionEmail> deduplicateByVendor(List<ParsedSubscriptionEmail> parsed) {
        return parsed.stream()
                .collect(java.util.stream.Collectors.groupingBy(ParsedSubscriptionEmail::vendorKey))
                .values()
                .stream()
                .map(group -> group.stream()
                        .max(Comparator.comparing(ParsedSubscriptionEmail::receivedAt)
                                .thenComparing(ParsedSubscriptionEmail::confidence))
                        .orElseThrow())
                .sorted(Comparator.comparing(ParsedSubscriptionEmail::provider))
                .toList();
    }

    private static double calculateConfidence(
            BigDecimal amount,
            BillingFrequency billing,
            LocalDate renewalDate,
            VendorRule rule) {
        double score = 0.5;
        if (amount.compareTo(BigDecimal.ZERO) > 0) {
            score += 0.25;
        }
        if (billing != BillingFrequency.MONTHLY || rule.vendorKey().equals("netflix")) {
            score += 0.1;
        }
        if (renewalDate.isAfter(LocalDate.now().minusDays(1))) {
            score += 0.15;
        }
        return Math.min(score, 1.0);
    }

    private static Optional<BigDecimal> extractAmount(String text) {
        Matcher matcher = AMOUNT_PATTERN.matcher(text);
        if (matcher.find()) {
            String raw = matcher.group(1).replace(",", "");
            return Optional.of(new BigDecimal(raw));
        }
        return Optional.empty();
    }

    private static BillingFrequency extractBillingFrequency(String text) {
        if (text.contains("annual") || text.contains("yearly") || text.contains("per year")) {
            return BillingFrequency.ANNUAL;
        }
        if (text.contains("quarterly")) {
            return BillingFrequency.QUARTERLY;
        }
        if (text.contains("weekly")) {
            return BillingFrequency.WEEKLY;
        }
        return BillingFrequency.MONTHLY;
    }

    private static Optional<LocalDate> extractRenewalDate(String lowerText, String originalText) {
        if (lowerText.contains("next billing") || lowerText.contains("renewal date") || lowerText.contains("next payment")) {
            Matcher matcher = DATE_PATTERN.matcher(originalText);
            if (matcher.find()) {
                return parseFlexibleDate(matcher.group(1));
            }
        }
        Matcher isoMatcher = ISO_DATE_PATTERN.matcher(originalText);
        if (isoMatcher.find()) {
            return parseFlexibleDate(isoMatcher.group(1));
        }
        Matcher matcher = DATE_PATTERN.matcher(originalText);
        if (matcher.find()) {
            return parseFlexibleDate(matcher.group(1));
        }
        return Optional.empty();
    }

    private static Optional<LocalDate> parseFlexibleDate(String value) {
        List<DateTimeFormatter> formatters = List.of(
                DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH),
                DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.ENGLISH),
                DateTimeFormatter.ISO_LOCAL_DATE);
        for (DateTimeFormatter formatter : formatters) {
            try {
                return Optional.of(LocalDate.parse(value.trim(), formatter));
            } catch (DateTimeParseException ignored) {
                // try next formatter
            }
        }
        return Optional.empty();
    }

    record VendorRule(
            String vendorKey,
            String name,
            String provider,
            String category,
            List<String> fromDomains,
            List<String> keywords,
            String cancellationWorkflow
    ) {
        boolean matches(String combinedLowerText) {
            boolean domainMatch = fromDomains.stream().anyMatch(combinedLowerText::contains);
            boolean keywordMatch = keywords.stream().anyMatch(combinedLowerText::contains);
            return domainMatch && keywordMatch;
        }
    }

    public record ParsedSubscriptionEmail(
            String vendorKey,
            String name,
            String provider,
            String category,
            BigDecimal amount,
            BillingFrequency billingFrequency,
            LocalDate renewalDate,
            double confidence,
            String sourceSubject,
            String cancellationWorkflow,
            Instant receivedAt
    ) {
    }
}
