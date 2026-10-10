package ERP.Software.demo.hr.repository;

import ERP.Software.demo.hr.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findAllByOrderByFirstNameAsc();
    List<Employee> findAllByBusinessIdOrderByFirstNameAsc(Long businessId);
    long countByBusinessId(Long businessId);
}
