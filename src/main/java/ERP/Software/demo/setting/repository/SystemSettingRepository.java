package ERP.Software.demo.setting.repository;

import ERP.Software.demo.setting.model.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {

    /** One business's settings. The bare name lives in {@code settingName}. */
    List<SystemSetting> findByBusinessId(Long businessId);

    void deleteByBusinessId(Long businessId);

    long countByBusinessId(Long businessId);
}
