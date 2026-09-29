package ERP.Software.demo.hr.repository;

import ERP.Software.demo.hr.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
}
