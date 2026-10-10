package ERP.Software.demo.inventory.controller;

import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.inventory.model.Category;
import ERP.Software.demo.inventory.repository.CategoryRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final TenantContext tenant;

    @GetMapping
    public List<Category> getAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? categoryRepository.findAllByOrderByNameAsc()
                : categoryRepository.findAllByBusinessIdOrderByNameAsc(businessId);
    }

    @GetMapping("/{id}")
    public Category getOne(@PathVariable Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        tenant.check(category.getBusinessId(), "category");
        return category;
    }

    @PostMapping
    public ResponseEntity<Category> create(@Valid @RequestBody Category category) {
        Long businessId = tenant.id();
        if (categoryRepository.existsByBusinessIdAndNameIgnoreCase(businessId, category.getName())) {
            throw new IllegalArgumentException(
                    "A category called '" + category.getName() + "' already exists.");
        }
        tenant.stamp(category);
        Category saved = categoryRepository.save(category);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public Category update(@PathVariable Long id, @Valid @RequestBody Category updated) {
        Category existing = getOne(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        return categoryRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryRepository.delete(getOne(id));
        return ResponseEntity.noContent().build();
    }
}
