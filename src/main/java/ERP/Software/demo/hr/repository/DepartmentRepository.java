package ERP.Software.demo.hr.repository;

import ERP.Software.demo.hr.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    List<Department> findAllByOrderByNameAsc();
    List<Department> findAllByBusinessIdOrderByNameAsc(Long businessId);
    Optional<Department> findByBusinessIdAndNameIgnoreCase(Long businessId, String name);
    boolean existsByBusinessIdAndNameIgnoreCase(Long businessId, String name);
    long countByBusinessId(Long businessId);
}
