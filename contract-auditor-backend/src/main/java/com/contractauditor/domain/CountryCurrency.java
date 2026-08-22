package com.contractauditor.domain;

import com.contractauditor.exception.BadRequestException;
import java.util.Map;

public final class CountryCurrency {

    public static final String DEFAULT_COUNTRY = "IN";
    public static final String DEFAULT_CURRENCY = "INR";

    private static final Map<String, String> CURRENCY_BY_COUNTRY = Map.ofEntries(
            Map.entry("IN", "INR"),
            Map.entry("US", "USD"),
            Map.entry("GB", "GBP"),
            Map.entry("CA", "CAD"),
            Map.entry("AU", "AUD"),
            Map.entry("NZ", "NZD"),
            Map.entry("SG", "SGD"),
            Map.entry("AE", "AED"),
            Map.entry("SA", "SAR"),
            Map.entry("JP", "JPY"),
            Map.entry("CN", "CNY"),
            Map.entry("HK", "HKD"),
            Map.entry("KR", "KRW"),
            Map.entry("CH", "CHF"),
            Map.entry("SE", "SEK"),
            Map.entry("NO", "NOK"),
            Map.entry("DK", "DKK"),
            Map.entry("PL", "PLN"),
            Map.entry("CZ", "CZK"),
            Map.entry("HU", "HUF"),
            Map.entry("RO", "RON"),
            Map.entry("TR", "TRY"),
            Map.entry("BR", "BRL"),
            Map.entry("MX", "MXN"),
            Map.entry("ZA", "ZAR"),
            Map.entry("NG", "NGN"),
            Map.entry("KE", "KES"),
            Map.entry("EG", "EGP"),
            Map.entry("PK", "PKR"),
            Map.entry("BD", "BDT"),
            Map.entry("LK", "LKR"),
            Map.entry("NP", "NPR"),
            Map.entry("PH", "PHP"),
            Map.entry("TH", "THB"),
            Map.entry("MY", "MYR"),
            Map.entry("ID", "IDR"),
            Map.entry("VN", "VND"),
            Map.entry("IL", "ILS"),
            Map.entry("RU", "RUB"),
            Map.entry("UA", "UAH"),
            Map.entry("AT", "EUR"),
            Map.entry("BE", "EUR"),
            Map.entry("DE", "EUR"),
            Map.entry("ES", "EUR"),
            Map.entry("FI", "EUR"),
            Map.entry("FR", "EUR"),
            Map.entry("IE", "EUR"),
            Map.entry("IT", "EUR"),
            Map.entry("NL", "EUR"),
            Map.entry("PT", "EUR"),
            Map.entry("GR", "EUR")
    );

    private CountryCurrency() {
    }

    public static String normalizeCountry(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            throw new BadRequestException("Country is required");
        }
        String code = countryCode.trim().toUpperCase();
        if (!CURRENCY_BY_COUNTRY.containsKey(code)) {
            throw new BadRequestException("Unsupported country: " + code);
        }
        return code;
    }

    public static String currencyFor(String countryCode) {
        return CURRENCY_BY_COUNTRY.get(normalizeCountry(countryCode));
    }
}
