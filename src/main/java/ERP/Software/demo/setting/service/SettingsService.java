package ERP.Software.demo.setting.service;

import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.BusinessException;
import ERP.Software.demo.setting.model.SystemSetting;
import ERP.Software.demo.setting.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

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

    // ---- printed invoices ----
    /** Which of the ten design presets printed invoices use. */
    public static final String BIZ_INVOICE_FORMAT = "biz.invoiceFormat";
    /** en, ar or both — the language of a printed invoice's labels. */
    public static final String BIZ_INVOICE_LANG = "biz.invoiceLang";
    /** Free-form footer text printed under every sales/purchase invoice. */
    public static final String INVOICE_FOOTER = "invoice.footer";

    // ---- regional / formatting preferences (the "Business" settings tab) ----
    /** BEFORE or AFTER - whether the currency label leads or trails the amount. */
    public static final String SYMBOL_PLACEMENT = "money.symbolPlacement";
    /** Decimal places for quantities, which are not money and need not match it. */
    public static final String QTY_SCALE = "qty.scale";
    public static final String BIZ_COMPANY_NAME = "biz.companyName";
    public static final String BIZ_NAME_LOCAL = "biz.nameLocal";
    /** Logo as a data URL, so no file storage or cleanup is needed. */
    public static final String BIZ_LOGO = "biz.logo";
    /** How many days after a sale it may still be edited. 0 means never. */
    public static final String BIZ_EDIT_DAYS = "biz.editDays";
    public static final String BIZ_START_DATE = "biz.startDate";
    /** 1..12 - the month the financial year rolls over, used by report date ranges. */
    public static final String BIZ_FY_START_MONTH = "biz.fyStartMonth";
    public static final String BIZ_DEFAULT_PROFIT = "biz.defaultProfit";
    public static final String BIZ_TIMEZONE = "biz.timezone";
    public static final String BIZ_DATE_FORMAT = "biz.dateFormat";
    public static final String BIZ_TIME_FORMAT = "biz.timeFormat";
    /** Two free-form extra identifiers (a CR number, a tax number) printed on documents. */
    public static final String BIZ_CODE1_NAME = "biz.code1Name";
    public static final String BIZ_CODE2_NAME = "biz.code2Name";
    public static final String BIZ_CODE1 = "biz.code1";
    public static final String BIZ_CODE2 = "biz.code2";
    /** FIFO, LIFO or WEIGHTED - how stock is costed. */
    public static final String INVENTORY_METHOD = "inventory.method";

    // ---- tax behaviour ----
    /** NONE or STANDARD - the "Tax" dropdown. NONE means no tax is charged. */
    public static final String TAX_MODE = "tax.mode";
    /** True when the entered prices already contain the tax. */
    public static final String TAX_INCLUSIVE = "tax.inclusive";

    /** Every money column is DECIMAL(38,6), so 6 is the most that survives a save. */
    public static final int MAX_SCALE = 6;
    /** OMR carries 3 decimal places (baisa), which is the historic behaviour. */
    public static final int DEFAULT_SCALE = 3;
    public static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal("0.05");
    public static final String DEFAULT_CURRENCY = "OMR";
    public static final Set<String> ALLOWED_CURRENCIES = Set.of("OMR", "USD", "SAR", "AED");

    public static final Set<String> SYMBOL_PLACEMENTS = Set.of("BEFORE", "AFTER");
    public static final Set<String> DATE_FORMATS =
            Set.of("dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "dd.MM.yyyy", "dd MMM yyyy");
    public static final Set<String> TIME_FORMATS = Set.of("24", "12");
    public static final Set<String> STOCK_METHODS = Set.of("FIFO", "LIFO", "WEIGHTED");
    /** The ten invoice design presets, in the order the settings drop-down shows them. */
    public static final List<String> INVOICE_FORMATS = List.of(
            "classic", "modern", "minimal", "bold", "elegant",
            "corporate", "vivid", "warm", "compact", "blueprint");
    /** Languages a printed invoice's labels can use. */
    public static final Set<String> INVOICE_LANGS = Set.of("en", "ar", "both");
    /** Values the tax drop-down accepts. */
    public static final Set<String> TAX_MODES = Set.of("NONE", "STANDARD");
    public static final String DEFAULT_DATE_FORMAT = "dd/MM/yyyy";
    public static final String DEFAULT_TIMEZONE = "Asia/Muscat";
    /**
     * Largest logo we accept, in characters of the stored data URL.
     *
     * <p>A 200 KB PNG base64-encodes to roughly 270,000 characters, so this has to
     * sit above that for the size the settings page advertises to actually work. The
     * column is MEDIUMTEXT (16 MB) so there is plenty of room; this is a deliberate
     * cap on how much one preference can bloat, not a storage limit.
     */
    private static final int MAX_LOGO_CHARS = 400_000;

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final SystemSettingRepository repository;
    private final TenantContext tenant;
    /** Read the business row for its locations, which live with the registry record. */
    private final ERP.Software.demo.business.repository.BusinessRepository businessRepository;

    /**
     * One cache per business. Settings are per business now, so a single map
     * would serve one company's currency to another. {@link #refreshAll} clears
     * every entry.
     */
    private final Map<Long, Map<String, String>> caches = new ConcurrentHashMap<>();

    @PostConstruct
    void warm() {
        // Nothing to warm: there is no "current business" outside a request, and
        // loading every business's settings at boot would be wasted work.
    }

    /** Drops every business's cached settings, after any bulk change. */
    @Transactional
    public void refreshAll() {
        caches.clear();
    }

    /**
     * The settings of the business being acted for.
     *
     * <p>Reads fall back to the signed-in user's own business when a super admin is
     * viewing all businesses at once, so the layout still gets currency and decimals.
     * The snapshot says which business those came from, so the client can label it
     * rather than implying they describe every business. Writes do not: see
     * {@link #save(Map)}, which still insists on one business.
     */
    private Map<String, String> values() {
        Long businessId = tenant.preferencesBusinessId();
        if (businessId == null) {
            throw new BusinessException("Not signed in");
        }
        Map<String, String> c = caches.get(businessId);
        if (c == null) {
            synchronized (caches) {
                c = caches.get(businessId);
                if (c == null) {
                    c = load(businessId);
                    caches.put(businessId, c);
                }
            }
        }
        return c;
    }

    private Map<String, String> load(Long businessId) {
        Map<String, String> m = new LinkedHashMap<>();
        for (SystemSetting s : repository.findByBusinessId(businessId)) {
            m.put(s.getSettingName() != null ? s.getSettingName() : SystemSetting.plainName(s.getKey()),
                s.getValue() == null ? "" : s.getValue());
        }
        return Map.copyOf(m);
    }

    /** Drops the cached settings of the business being acted for. */
    @Transactional
    public void refresh() {
        Long businessId = tenant.preferencesBusinessId();
        if (businessId != null) caches.remove(businessId);
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

    // ---------------- tax behaviour ----------------

    /** NONE or STANDARD - the "Tax" drop-down. Anything unrecognised reads as STANDARD. */
    public String taxMode() {
        String m = getString(TAX_MODE, "STANDARD").toUpperCase();
        return TAX_MODES.contains(m) ? m : "STANDARD";
    }

    /**
     * The rate actually charged on a new document: zero when the drop-down is on
     * "None", otherwise {@link #vatRate()}. This is the one services should call.
     */
    public BigDecimal taxRate() {
        return "NONE".equals(taxMode()) ? BigDecimal.ZERO : vatRate();
    }

    /** True when entered prices already contain the tax, so it is extracted from them. */
    public boolean taxInclusive() {
        return getBoolean(TAX_INCLUSIVE, false);
    }

    // ---------------- API payloads ----------------

    /** Typed snapshot for the client, with every key always present. */
    public Map<String, Object> snapshot() {
        Map<String, Object> m = new LinkedHashMap<>();
        // Which business these settings actually describe. Always answered, because a
        // super admin browsing every business is reading somebody's settings, not a
        // combined set, and the client needs to be able to say which.
        m.put("settingsBusinessId", tenant.preferencesBusinessId());
        m.put("allBusinesses", tenant.idOrNull() == null);
        m.put(MONEY_SCALE, moneyScale());
        m.put("maxScale", MAX_SCALE);   // lets the client build the dropdown; never persisted
        m.put(CURRENCY, currency());
        m.put(VAT_RATE, vatRate());
        m.put(TAX_MODE, taxMode());
        m.put(TAX_INCLUSIVE, taxInclusive());
        m.put("tax.rate.effective", taxRate());
        // These fall back to empty rather than to a made-up company. Inventing "EDY ERP /
        // Muscat, Oman" for a business that simply has not been filled in yet made an
        // unconfigured business look like it had copied another one's details; the
        // client substitutes a neutral placeholder for display instead.
        m.put(BIZ_NAME, getString(BIZ_NAME, ""));
        m.put(BIZ_ADDRESS, getString(BIZ_ADDRESS, ""));
        m.put(BIZ_PHONE, getString(BIZ_PHONE, ""));
        m.put(BIZ_VAT_NO, getString(BIZ_VAT_NO, ""));
        m.put(RECEIPT_HEADER, getString(RECEIPT_HEADER, getString(BIZ_NAME, "")));
        m.put(RECEIPT_FOOTER, getString(RECEIPT_FOOTER, "Thank you for your business! شكراً"));
        m.put(LANGUAGE, getString(LANGUAGE, "en"));
        m.put(SYMBOL_PLACEMENT, symbolPlacement());
        m.put(QTY_SCALE, qtyScale());
        m.put(BIZ_COMPANY_NAME, getString(BIZ_COMPANY_NAME, getString(BIZ_NAME, "")));
        m.put(BIZ_NAME_LOCAL, getString(BIZ_NAME_LOCAL, ""));
        m.put(BIZ_LOGO, getString(BIZ_LOGO, ""));
        m.put(BIZ_EDIT_DAYS, editDays());
        m.put(BIZ_START_DATE, getString(BIZ_START_DATE, ""));
        m.put(BIZ_FY_START_MONTH, fyStartMonth());
        m.put(BIZ_DEFAULT_PROFIT, defaultProfitPercent());
        m.put(BIZ_TIMEZONE, timezone());
        m.put(BIZ_DATE_FORMAT, dateFormat());
        m.put(BIZ_TIME_FORMAT, timeFormat());
        m.put(BIZ_CODE1_NAME, getString(BIZ_CODE1_NAME, ""));
        m.put(BIZ_CODE2_NAME, getString(BIZ_CODE2_NAME, ""));
        m.put(BIZ_CODE1, getString(BIZ_CODE1, ""));
        m.put(BIZ_CODE2, getString(BIZ_CODE2, ""));
        m.put(INVENTORY_METHOD, stockMethod());
        m.put(BIZ_INVOICE_FORMAT, getString(BIZ_INVOICE_FORMAT, "classic"));
        m.put(BIZ_INVOICE_LANG, getString(BIZ_INVOICE_LANG, "en"));
        m.put(INVOICE_FOOTER, getString(INVOICE_FOOTER, ""));
        // The business's registered locations help build the top-bar location picker.
        // They come from the business record itself, not the key/value store, because
        // the Super Admin is the one who enters them when creating a business.
        m.put("locations", locations());
        m.putAll(options());
        return m;
    }

    // ---------------- regional / formatting accessors ----------------

    public String symbolPlacement() {
        String s = getString(SYMBOL_PLACEMENT, "BEFORE").toUpperCase();
        return SYMBOL_PLACEMENTS.contains(s) ? s : "BEFORE";
    }

    public int qtyScale() {
        int q = getInt(QTY_SCALE, 2);
        return Math.max(0, Math.min(MAX_SCALE, q));
    }

    /** Days after a sale during which it may still be edited; 0 means locked. */
    public int editDays() {
        int d = getInt(BIZ_EDIT_DAYS, 30);
        return Math.max(0, Math.min(3650, d));
    }

    public int fyStartMonth() {
        int m = getInt(BIZ_FY_START_MONTH, 1);
        return (m < 1 || m > 12) ? 1 : m;
    }

    /** Whole percentage, e.g. 25 for a 25% default profit. */
    public BigDecimal defaultProfitPercent() {
        BigDecimal p = getDecimal(BIZ_DEFAULT_PROFIT, BigDecimal.ZERO);
        return (p.signum() < 0 || p.compareTo(ONE_HUNDRED) > 0) ? BigDecimal.ZERO : p;
    }

    public String timezone() {
        String tz = getString(BIZ_TIMEZONE, DEFAULT_TIMEZONE);
        try {
            return ZoneId.of(tz).getId();
        } catch (DateTimeException e) {
            return DEFAULT_TIMEZONE;
        }
    }

    public String dateFormat() {
        String f = getString(BIZ_DATE_FORMAT, DEFAULT_DATE_FORMAT);
        return DATE_FORMATS.contains(f) ? f : DEFAULT_DATE_FORMAT;
    }

    /** "24" or "12". */
    public String timeFormat() {
        String f = getString(BIZ_TIME_FORMAT, "24");
        return TIME_FORMATS.contains(f) ? f : "24";
    }

    public String stockMethod() {
        String s = getString(INVENTORY_METHOD, "FIFO").toUpperCase();
        return STOCK_METHODS.contains(s) ? s : "FIFO";
    }

    /**
     * The current business's locations, one per line of the registry record.
     * Empty for a super admin browsing all businesses, who has no single company.
     */
    public java.util.List<String> locations() {
        Long businessId = tenant.preferencesBusinessId();
        if (businessId == null) return java.util.List.of();
        return businessRepository.findById(businessId)
                .map(b -> {
                    String raw = b.getLocations();
                    if (raw == null || raw.isBlank()) return java.util.List.<String>of();
                    return java.util.Arrays.stream(raw.split("\n"))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
                })
                .orElseGet(java.util.List::of);
    }

    /**
     * Persists the supplied settings, ignoring unknown keys and any value that
     * fails validation (the caller gets the corrected snapshot back).
     *
     * <p>Rejected keys are reported back under {@code rejected} in the returned
     * map so the caller can say so, instead of the save looking like it worked
     * when the stored value never changed.
     */
    @Transactional
    public Map<String, Object> save(Map<String, Object> incoming) {
        List<String> rejected = new ArrayList<>();
        // preferencesBusinessId(), not id(), so a write targets exactly the same business
        // that reads describe. These used to disagree: a super admin in the
        // all-businesses view was shown one business's settings and then had every save
        // refused with 403, which is what made "Update Settings" and logo uploads fail.
        // Whichever business this resolves to is named in the returned snapshot as
        // settingsBusinessId, and the settings page says so, so nothing is written
        // silently to a company the reader cannot identify.
        Long businessId = tenant.preferencesBusinessId();
        if (businessId == null) {
            throw new BusinessException(
                    "These settings belong to a single business, and none could be identified. Sign in again.");
        }
        if (incoming != null) {
            for (Map.Entry<String, Object> e : incoming.entrySet()) {
                if (!isKnown(e.getKey())) continue;
                String value = normalise(e.getKey(), e.getValue());
                if (value == null) {          // rejected: keep whatever is stored
                    rejected.add(e.getKey());
                    continue;
                }
                repository.save(SystemSetting.builder()
                        .key(SystemSetting.storageKey(businessId, e.getKey()))
                        .settingName(e.getKey())
                        .businessId(businessId)
                        .value(value)
                        .updatedAt(LocalDateTime.now())
                        .build());
            }
        }
        caches.remove(businessId);      // force a reload of just this business
        values();
        Map<String, Object> out = snapshot();
        out.put("rejected", List.copyOf(rejected));   // never persisted
        return out;
    }

    private boolean isKnown(String key) {
        return KNOWN_KEYS.contains(key);
    }

    // ---------------- seeding a new business ----------------

    /**
     * The settings that describe a business's identity, in the order they are shown
     * on the settings page. Kept here so both the seeding and the syncing below agree
     * on exactly which keys the registry record owns.
     */
    private static final List<String> PROFILE_KEYS = List.of(
            BIZ_NAME, BIZ_COMPANY_NAME, BIZ_ADDRESS, BIZ_PHONE, BIZ_VAT_NO, RECEIPT_HEADER);

    /**
     * Copies a newly created business's own details into its settings.
     *
     * <p>Without this a brand new business has no settings rows at all, so every page
     * falls back to the built-in defaults - and because those defaults are literally
     * {@code EDY ERP} / {@code Muscat, Oman}, opening the new business looked like it
     * was showing the previous company's details.
     *
     * <p>Takes the business id explicitly rather than going through {@link #save},
     * because a super admin creates businesses from the all-businesses view, where
     * there is no single business to write against.
     */
    @Transactional
    public void seedProfile(Long businessId, String name, String legalName,
                            String address, String phone, String vatNo) {
        Map<String, String> profile = profileOf(name, legalName, address, phone, vatNo);
        for (Map.Entry<String, String> e : profile.entrySet()) {
            writeFor(businessId, e.getKey(), e.getValue());
        }
        caches.remove(businessId);
    }

    /**
     * Re-syncs a business's identity settings after its registry record was edited,
     * but only where the stored value still matches what the registry used to say.
     *
     * <p>That comparison is the point: if someone has since customised {@code biz.name}
     * on the settings page, their text wins and is left alone. Renaming a business in
     * the registry therefore updates the app's name only when the app was still just
     * echoing the registry, and never silently discards a deliberate edit.
     */
    @Transactional
    public void syncProfile(Long businessId, String previousName, String previousLegalName,
                            String previousAddress, String previousPhone, String previousVatNo,
                            String name, String legalName, String address, String phone, String vatNo) {
        Map<String, String> before = profileOf(previousName, previousLegalName, previousAddress,
                previousPhone, previousVatNo);
        Map<String, String> after = profileOf(name, legalName, address, phone, vatNo);
        Map<String, String> stored = storedProfile(businessId);

        boolean wrote = false;
        for (Map.Entry<String, String> e : after.entrySet()) {
            String key = e.getKey();
            String current = stored.get(key);
            String old = before.get(key);
            boolean untouched = current == null                       // never set
                    || current.isBlank()                             // set to nothing
                    || current.equals(old);                          // still echoing the registry
            if (untouched && !e.getValue().equals(current)) {
                writeFor(businessId, key, e.getValue());
                wrote = true;
            }
        }
        if (wrote) caches.remove(businessId);
    }

    private Map<String, String> profileOf(String name, String legalName,
                                          String address, String phone, String vatNo) {
        String display = orEmpty(name);
        Map<String, String> m = new LinkedHashMap<>();
        m.put(BIZ_NAME, display);
        // The legal name is the company's registered identity; it is a better company
        // label than the short trading name, but only when one was actually given.
        m.put(BIZ_COMPANY_NAME, legalName == null || legalName.isBlank() ? display : legalName.trim());
        m.put(BIZ_ADDRESS, orEmpty(address));
        m.put(BIZ_PHONE, orEmpty(phone));
        m.put(BIZ_VAT_NO, orEmpty(vatNo));
        m.put(RECEIPT_HEADER, display);
        return m;
    }

    /** The business's current profile settings, blank where never set. */
    private Map<String, String> storedProfile(Long businessId) {
        Map<String, String> m = new LinkedHashMap<>();
        for (SystemSetting s : repository.findByBusinessId(businessId)) {
            String name = s.getSettingName() != null ? s.getSettingName() : SystemSetting.plainName(s.getKey());
            if (PROFILE_KEYS.contains(name)) {
                m.put(name, s.getValue() == null ? "" : s.getValue());
            }
        }
        return m;
    }

    /** Writes one setting for an explicit business, bypassing the tenant context. */
    private void writeFor(Long businessId, String key, String value) {
        repository.save(SystemSetting.builder()
                .key(SystemSetting.storageKey(businessId, key))
                .settingName(key)
                .businessId(businessId)
                .value(value)
                .updatedAt(LocalDateTime.now())
                .build());
    }

    private static String orEmpty(String v) {
        return v == null ? "" : v.trim();
    }

    /** Everything {@link #save} will accept. Anything else is silently ignored. */
    private static final Set<String> KNOWN_KEYS = Set.of(
            MONEY_SCALE, CURRENCY, VAT_RATE, BIZ_NAME, BIZ_ADDRESS, BIZ_PHONE,
            BIZ_VAT_NO, RECEIPT_HEADER, RECEIPT_FOOTER, LANGUAGE,
            SYMBOL_PLACEMENT, QTY_SCALE, BIZ_COMPANY_NAME, BIZ_NAME_LOCAL, BIZ_LOGO,
            BIZ_EDIT_DAYS, BIZ_START_DATE, BIZ_FY_START_MONTH, BIZ_DEFAULT_PROFIT,
            BIZ_TIMEZONE, BIZ_DATE_FORMAT, BIZ_TIME_FORMAT,
            BIZ_CODE1_NAME, BIZ_CODE2_NAME, BIZ_CODE1, BIZ_CODE2, INVENTORY_METHOD,
            TAX_MODE, TAX_INCLUSIVE, BIZ_INVOICE_FORMAT, BIZ_INVOICE_LANG, INVOICE_FOOTER);

    /** The drop-down contents, so the client never hardcodes what the server accepts. */
    public Map<String, Object> options() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("currencies", ALLOWED_CURRENCIES.stream().sorted().toList());
        m.put("symbolPlacements", List.of("BEFORE", "AFTER"));
        m.put("dateFormats", DATE_FORMATS.stream().sorted().toList());
        m.put("timeFormats", List.of("24", "12"));
        m.put("stockMethods", List.of("FIFO", "LIFO", "WEIGHTED"));
        m.put("taxModes", TAX_MODES.stream().sorted().toList());
        m.put("invoiceFormats", INVOICE_FORMATS);
        m.put("invoiceLangs", List.of("en", "ar", "both"));
        // Common rates offered by the rate drop-down. "No tax at all" is not here -
        // that is what the mode drop-down above it is for. The client's current rate
        // is always appended if missing, so an unusual rate round-trips unchanged.
        m.put("taxRates", List.of("0.05", "0.10"));
        m.put("months", List.of("January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"));
        m.put("timezones", List.of(DEFAULT_TIMEZONE, "Asia/Dubai", "Asia/Riyadh",
                "Asia/Karachi", "Asia/Kolkata", "Europe/London", "UTC"));
        return m;
    }

    /**
     * Strict boolean parsing for saving: unlike {@link Boolean#parseBoolean} this
     * rejects anything that is not obviously true or false, so a typo in the
     * request body cannot quietly store a wrong value.
     */
    private static String parseBool(String v) {
        String s = v.trim().toLowerCase();
        if (s.equals("true") || s.equals("1") || s.equals("yes") || s.equals("on")) return "true";
        if (s.equals("false") || s.equals("0") || s.equals("no") || s.equals("off")) return "false";
        return null;
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
        if (SYMBOL_PLACEMENT.equals(key)) {
            String s = v.toUpperCase();
            return SYMBOL_PLACEMENTS.contains(s) ? s : null;
        }
        if (BIZ_TIME_FORMAT.equals(key)) {
            return TIME_FORMATS.contains(v) ? v : null;
        }
        if (BIZ_INVOICE_FORMAT.equals(key)) {
            return INVOICE_FORMATS.contains(v) ? v : null;
        }
        if (BIZ_INVOICE_LANG.equals(key)) {
            return INVOICE_LANGS.contains(v) ? v : null;
        }
        if (INVENTORY_METHOD.equals(key)) {
            String s = v.toUpperCase();
            return STOCK_METHODS.contains(s) ? s : null;
        }
        if (TAX_MODE.equals(key)) {
            String s = v.toUpperCase();
            return TAX_MODES.contains(s) ? s : null;
        }
        if (TAX_INCLUSIVE.equals(key)) {
            return parseBool(v);
        }
        if (BIZ_DATE_FORMAT.equals(key)) {
            return DATE_FORMATS.contains(v) ? v : null;
        }
        if (QTY_SCALE.equals(key)) {
            try {
                int s = Integer.parseInt(v);
                return (s < 0 || s > MAX_SCALE) ? null : Integer.toString(s);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (BIZ_EDIT_DAYS.equals(key)) {
            try {
                int d = Integer.parseInt(v);
                return (d < 0 || d > 3650) ? null : Integer.toString(d);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (BIZ_FY_START_MONTH.equals(key)) {
            try {
                int m = Integer.parseInt(v);
                return (m < 1 || m > 12) ? null : Integer.toString(m);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (BIZ_DEFAULT_PROFIT.equals(key)) {
            try {
                BigDecimal p = new BigDecimal(v);
                if (p.signum() < 0 || p.compareTo(ONE_HUNDRED) > 0) return null;
                return p.stripTrailingZeros().toPlainString();
            } catch (NumberFormatException e) {
                return null;
            }
        }
        if (BIZ_START_DATE.equals(key)) {
            try {
                return LocalDate.parse(v).toString();
            } catch (DateTimeParseException e) {
                return null;
            }
        }
        if (BIZ_TIMEZONE.equals(key)) {
            try {
                return ZoneId.of(v).getId();
            } catch (DateTimeException e) {
                return null;
            }
        }
        if (BIZ_LOGO.equals(key)) {
            // Only a plain data URL - never raw markup or an external reference.
            if (v.isEmpty()) return "";
            if (!v.startsWith("data:image/")) return null;
            return v.length() > MAX_LOGO_CHARS ? null : v;
        }
        return v.length() > 4000 ? v.substring(0, 4000) : v;
    }
}
