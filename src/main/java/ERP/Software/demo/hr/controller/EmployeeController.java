package ERP.Software.demo.hr.controller;

import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.hr.model.Employee;
import ERP.Software.demo.hr.repository.EmployeeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeRepository employeeRepository;
    private final TenantContext tenant;

    @GetMapping
    public List<Employee> getAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? employeeRepository.findAllByOrderByFirstNameAsc()
                : employeeRepository.findAllByBusinessIdOrderByFirstNameAsc(businessId);
    }

    @GetMapping("/{id}")
    public Employee getOne(@PathVariable Long id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));
        tenant.check(employee.getBusinessId(), "employee");
        return employee;
    }

    @PostMapping
    public ResponseEntity<Employee> create(@Valid @RequestBody Employee employee) {
        tenant.stamp(employee);
        return ResponseEntity.ok(employeeRepository.save(employee));
    }

    @PutMapping("/{id}")
    public Employee update(@PathVariable Long id, @Valid @RequestBody Employee updated) {
        Employee existing = getOne(id);
        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setJobTitle(updated.getJobTitle());
        existing.setDepartment(updated.getDepartment());
        existing.setSalary(updated.getSalary());
        existing.setHireDate(updated.getHireDate());
        return employeeRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        employeeRepository.delete(getOne(id));
        return ResponseEntity.noContent().build();
    }
}
