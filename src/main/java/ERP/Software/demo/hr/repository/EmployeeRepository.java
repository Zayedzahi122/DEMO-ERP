package ERP.Software.demo.hr.repository;

import ERP.Software.demo.hr.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
}
