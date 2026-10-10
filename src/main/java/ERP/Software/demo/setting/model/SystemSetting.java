package ERP.Software.demo.setting.model;

import ERP.Software.demo.business.model.TenantScoped;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One preference, stored as a key/value pair. The key set is declared in
 * {@link ERP.Software.demo.setting.service.SettingsService}.
 *
 * <p>Settings are per business, but this table's primary key is a single column,
 * so {@code setting_key} holds the composed form {@code <businessId>|<name>}
 * rather than the bare name. {@link #storageKey} and {@link #plainKey} are the
 * only places that composition should happen - everything else should read
 * {@link #settingName}.
 */
@Entity
@Table(name = "system_settings")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class SystemSetting implements TenantScoped {

    /** Primary key: the composed {@code <businessId>|<name>}. */
    @Id
    @Column(name = "setting_key", nullable = false, length = 100)
    private String key;

    /** The bare setting name, e.g. {@code money.scale}. Indexed for lookups. */
    @Column(name = "setting_name", length = 100)
    private String settingName;

    /**
     * The stored value. MEDIUMTEXT rather than a varchar because {@code biz.logo}
     * holds a whole image as a data URL: a 200 KB PNG base64-encodes to roughly
     * 270,000 characters, which silently overflowed the varchar(4000) this column
     * used to be - the upload was accepted, reported as saved, and then lost.
     *
     * <p>Note {@code ddl-auto: update} never widens an existing column, so the live
     * database has to be altered by hand as well as changed here.
     */
    @Column(name = "setting_value", columnDefinition = "MEDIUMTEXT")
    private String value;

    @Column(name = "business_id")
    private Long businessId;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    /** Builds the primary key for one business's copy of a setting. */
    public static String storageKey(Long businessId, String name) {
        return (businessId == null ? "-" : businessId.toString()) + "|" + name;
    }

    /** Splits a primary key back into its business id, or null if there is none. */
    public static Long plainKey(String storageKey) {
        int bar = storageKey == null ? -1 : storageKey.indexOf('|');
        if (bar < 1 || "-".equals(storageKey.substring(0, bar))) return null;
        try {
            return Long.valueOf(storageKey.substring(0, bar));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** The bare setting name out of a composed primary key. */
    public static String plainName(String storageKey) {
        int bar = storageKey == null ? -1 : storageKey.indexOf('|');
        return bar < 0 ? storageKey : storageKey.substring(bar + 1);
    }
}