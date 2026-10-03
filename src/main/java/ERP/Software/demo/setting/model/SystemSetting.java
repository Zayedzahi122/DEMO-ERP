package ERP.Software.demo.setting.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One application-wide preference, stored as a key/value pair. The key set is
 * declared in {@link ERP.Software.demo.setting.service.SettingsService}.
 */
@Entity
@Table(name = "system_settings")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class SystemSetting {

    @Id
    @Column(name = "setting_key", nullable = false, length = 100)
    private String key;

    @Column(name = "setting_value", length = 4000)
    private String value;

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
