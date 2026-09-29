package ERP.Software.demo.hr.controller;

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

    @GetMapping
    public List<Department> getAll() {
        return departmentRepository.findAll();
    }

    @GetMapping("/{id}")
    public Department getOne(@PathVariable Long id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
    }

    @PostMapping
    public ResponseEntity<Department> create(@Valid @RequestBody Department department) {
        return ResponseEntity.ok(departmentRepository.save(department));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        departmentRepository.delete(getOne(id));
        return ResponseEntity.noContent().build();
    }
}
