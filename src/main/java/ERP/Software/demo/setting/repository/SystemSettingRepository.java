package ERP.Software.demo.setting.repository;

import ERP.Software.demo.setting.model.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {
}
