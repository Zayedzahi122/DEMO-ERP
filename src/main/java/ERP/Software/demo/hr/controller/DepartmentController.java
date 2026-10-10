package ERP.Software.demo.hr.controller;

import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.hr.model.Department;
import ERP.Software.demo.hr.repository.DepartmentRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;
    private final TenantContext tenant;

    @GetMapping
    public List<Department> getAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? departmentRepository.findAllByOrderByNameAsc()
                : departmentRepository.findAllByBusinessIdOrderByNameAsc(businessId);
    }

    @GetMapping("/{id}")
    public Department getOne(@PathVariable Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
        tenant.check(department.getBusinessId(), "department");
        return department;
    }

    @PostMapping
    public ResponseEntity<Department> create(@Valid @RequestBody Department department) {
        Long businessId = tenant.id();
        if (departmentRepository.existsByBusinessIdAndNameIgnoreCase(businessId, department.getName())) {
            throw new IllegalArgumentException(
                    "A department called '" + department.getName() + "' already exists.");
        }
        tenant.stamp(department);
        return ResponseEntity.ok(departmentRepository.save(department));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        departmentRepository.delete(getOne(id));
        return ResponseEntity.noContent().build();
    }
}
