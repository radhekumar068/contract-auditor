package com.contractauditor.service.emaildiscovery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.contractauditor.domain.enums.BillingFrequency;
import com.contractauditor.config.EmailDiscoveryProperties;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SubscriptionEmailParserTest {

    private SubscriptionEmailParser parser;

    @BeforeEach
    void setUp() {
        parser = new SubscriptionEmailParser();
    }

    @Test
    void parseNetflixRenewalEmail() {
        Optional<SubscriptionEmailParser.ParsedSubscriptionEmail> result = parser.parse(
                "Netflix <info@mailer.netflix.com>",
                "Your Netflix membership has been renewed",
                "Your monthly membership of ₹649 was renewed. Next billing date is 15 September 2026.",
                Instant.parse("2026-08-15T10:00:00Z"));

        assertTrue(result.isPresent());
        SubscriptionEmailParser.ParsedSubscriptionEmail parsed = result.get();
        assertEquals("netflix", parsed.vendorKey());
        assertEquals("Netflix", parsed.provider());
        assertEquals(new BigDecimal("649"), parsed.amount());
        assertEquals(BillingFrequency.MONTHLY, parsed.billingFrequency());
        assertEquals(LocalDate.of(2026, 9, 15), parsed.renewalDate());
    }

    @Test
    void parseAmazonPrimeAnnualEmail() {
        Optional<SubscriptionEmailParser.ParsedSubscriptionEmail> result = parser.parse(
                "Amazon.in <no-reply@amazon.in>",
                "Your Prime membership payment receipt",
                "Annual Prime membership of INR 1499 has been renewed for the year.",
                Instant.parse("2026-01-03T08:00:00Z"));

        assertTrue(result.isPresent());
        assertEquals("amazon_prime", result.get().vendorKey());
        assertEquals(BillingFrequency.ANNUAL, result.get().billingFrequency());
        assertEquals(new BigDecimal("1499"), result.get().amount());
    }

    @Test
    void deduplicateKeepsLatestPerVendor() {
        SubscriptionEmailParser.ParsedSubscriptionEmail older = new SubscriptionEmailParser.ParsedSubscriptionEmail(
                "netflix", "Netflix", "Netflix", "Entertainment",
                new BigDecimal("499"), BillingFrequency.MONTHLY, LocalDate.now().plusDays(10),
                0.8, "Older", "workflow", Instant.parse("2026-01-01T00:00:00Z"));
        SubscriptionEmailParser.ParsedSubscriptionEmail newer = new SubscriptionEmailParser.ParsedSubscriptionEmail(
                "netflix", "Netflix", "Netflix", "Entertainment",
                new BigDecimal("649"), BillingFrequency.MONTHLY, LocalDate.now().plusDays(20),
                0.9, "Newer", "workflow", Instant.parse("2026-06-01T00:00:00Z"));

        List<SubscriptionEmailParser.ParsedSubscriptionEmail> deduped =
                parser.deduplicateByVendor(List.of(older, newer));

        assertEquals(1, deduped.size());
        assertEquals(new BigDecimal("649"), deduped.getFirst().amount());
    }

    @Test
    void ignoresUnrelatedEmail() {
        Optional<SubscriptionEmailParser.ParsedSubscriptionEmail> result = parser.parse(
                "Bank <alerts@bank.com>",
                "Account statement",
                "Your savings account balance is updated.",
                Instant.now());

        assertFalse(result.isPresent());
    }
}
