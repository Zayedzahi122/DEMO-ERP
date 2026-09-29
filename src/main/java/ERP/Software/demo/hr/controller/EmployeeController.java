package ERP.Software.demo.hr.controller;

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

    @GetMapping
    public List<Employee> getAll() {
        return employeeRepository.findAll();
    }

    @GetMapping("/{id}")
    public Employee getOne(@PathVariable Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + id));
    }

    @PostMapping
    public ResponseEntity<Employee> create(@Valid @RequestBody Employee employee) {
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
