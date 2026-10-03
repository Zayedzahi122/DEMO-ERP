package ERP.Software.demo.setting.service;

import ERP.Software.demo.setting.model.SystemSetting;
import ERP.Software.demo.setting.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Application-wide preferences, read from the database so every user and every
 * screen sees the same values. Values are cached in memory after the first read
 * and refreshed whenever they are saved.
 */
@Service
@RequiredArgsConstructor
public class SettingsService {

    // ---- setting keys: the single source of truth for the whole app ----
    public static final String MONEY_SCALE = "money.scale";
    public static final String CURRENCY = "money.currency";
    public static final String VAT_RATE = "tax.vatRate";
    public static final String BIZ_NAME = "biz.name";
    public static final String BIZ_ADDRESS = "biz.address";
    public static final String BIZ_PHONE = "biz.phone";
    public static final String BIZ_VAT_NO = "biz.vatNo";
    public static final String RECEIPT_HEADER = "receipt.header";
    public static final String RECEIPT_FOOTER = "receipt.footer";
    public static final String LANGUAGE = "app.language";

    /** Every money column is DECIMAL(38,6), so 6 is the most that survives a save. */
    public static final int MAX_SCALE = 6;
    /** OMR carries 3 decimal places (baisa), which is the historic behaviour. */
    public static final int DEFAULT_SCALE = 3;
    public static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal("0.05");
    public static final String DEFAULT_CURRENCY = "OMR";
    public static final Set<String> ALLOWED_CURRENCIES = Set.of("OMR", "USD", "SAR", "AED");

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final SystemSettingRepository repository;

    private volatile Map<String, String> cache;

    @PostConstruct
    void warm() {
        values();
    }

    private Map<String, String> values() {
        Map<String, String> c = cache;
        if (c == null) {
            synchronized (this) {
                c = cache;
                if (c == null) {
                    c = load();
                    cache = c;
                }
            }
        }
        return c;
    }

    private Map<String, String> load() {
        Map<String, String> m = new LinkedHashMap<>();
        for (SystemSetting s : repository.findAll()) {
            m.put(s.getKey(), s.getValue() == null ? "" : s.getValue());
        }
        return Map.copyOf(m);
    }

    @Transactional
    public void refresh() {
        cache = load();
    }

    // ---------------- typed accessors ----------------

    public String getString(String key, String fallback) {
        String v = values().get(key);
        return v == null || v.isBlank() ? fallback : v.trim();
    }

    public boolean getBoolean(String key, boolean fallback) {
        String v = values().get(key);
        return v == null || v.isBlank() ? fallback : Boolean.parseBoolean(v.trim());
    }

    public int getInt(String key, int fallback) {
        String v = values().get(key);
        if (v == null || v.isBlank()) return fallback;
        try {
            return Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    public BigDecimal getDecimal(String key, BigDecimal fallback) {
        String v = values().get(key);
        if (v == null || v.isBlank()) return fallback;
        try {
            return new BigDecimal(v.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    // ---------------- the money policy ----------------

    /** Decimal places money is rounded to, always within 0..MAX_SCALE. */
    public int moneyScale() {
        int s = getInt(MONEY_SCALE, DEFAULT_SCALE);
        return Math.max(0, Math.min(MAX_SCALE, s));
    }

    public BigDecimal round(BigDecimal v) {
        return v == null ? null : v.setScale(moneyScale(), RoundingMode.HALF_UP);
    }

    public String currency() {
        String c = getString(CURRENCY, DEFAULT_CURRENCY).toUpperCase();
        return ALLOWED_CURRENCIES.contains(c) ? c : DEFAULT_CURRENCY;
    }

    /** VAT as a fraction, e.g. 0.05. Out-of-range stored values fall back to the default. */
    public BigDecimal vatRate() {
        BigDecimal v = getDecimal(VAT_RATE, DEFAULT_VAT_RATE);
        if (v.signum() < 0 || v.compareTo(ONE_HUNDRED) > 0) return DEFAULT_VAT_RATE;
        return v;
    }

    // ---------------- API payloads ----------------

    /** Typed snapshot for the client, with every key always present. */
    public Map<String, Object> snapshot() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(MONEY_SCALE, moneyScale());
        m.put("maxScale", MAX_SCALE);   // lets the client build the dropdown; never persisted
        m.put(CURRENCY, currency());
        m.put(VAT_RATE, vatRate());
        m.put(BIZ_NAME, getString(BIZ_NAME, "EDY ERP"));
        m.put(BIZ_ADDRESS, getString(BIZ_ADDRESS, "Muscat, Oman"));
        m.put(BIZ_PHONE, getString(BIZ_PHONE, "+968 24XX XXXX"));
        m.put(BIZ_VAT_NO, getString(BIZ_VAT_NO, ""));
        m.put(RECEIPT_HEADER, getString(RECEIPT_HEADER, getString(BIZ_NAME, "EDY ERP")));
        m.put(RECEIPT_FOOTER, getString(RECEIPT_FOOTER, "Thank you for your business! شكراً"));
        m.put(LANGUAGE, getString(LANGUAGE, "en"));
        return m;
    }

    /**
     * Persists the supplied settings, ignoring unknown keys and any value that
     * fails validation (the caller gets the corrected snapshot back).
     */
    @Transactional
    public Map<String, Object> save(Map<String, Object> incoming) {
        if (incoming != null) {
            for (Map.Entry<String, Object> e : incoming.entrySet()) {
                if (!isKnown(e.getKey())) continue;
                String value = normalise(e.getKey(), e.getValue());
                if (value == null) continue;   // rejected: keep whatever is stored
                repository.save(SystemSetting.builder()
                        .key(e.getKey())
                        .value(value)
                        .updatedAt(LocalDateTime.now())
                        .build());
            }
        }
        cache = null;                 // force a reload
        values();
        return snapshot();
    }

    private boolean isKnown(String key) {
        return Set.of(MONEY_SCALE, CURRENCY, VAT_RATE, BIZ_NAME, BIZ_ADDRESS, BIZ_PHONE,
                BIZ_VAT_NO, RECEIPT_HEADER, RECEIPT_FOOTER, LANGUAGE).contains(key);
    }

    /** @return the value to store, or null to reject it. */
    private String normalise(String key, Object raw) {
        if (raw == null) return "";
        String v = String.valueOf(raw).trim();
        if (MONEY_SCALE.equals(key)) {
            try {
                int s = Integer.parseInt(v);
                if (s < 0 || s > MAX_SCALE) return null;
                return Integer.toString(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (CURRENCY.equals(key)) {
            String c = v.toUpperCase();
            return ALLOWED_CURRENCIES.contains(c) ? c : null;
        }
        if (VAT_RATE.equals(key)) {
            try {
                BigDecimal r = new BigDecimal(v);
                if (r.signum() < 0 || r.compareTo(ONE_HUNDRED) > 0) return null;
                return r.stripTrailingZeros().toPlainString();
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (LANGUAGE.equals(key)) {
            return ("ar".equals(v) || "en".equals(v)) ? v : null;
        }
        return v.length() > 4000 ? v.substring(0, 4000) : v;
    }
}
