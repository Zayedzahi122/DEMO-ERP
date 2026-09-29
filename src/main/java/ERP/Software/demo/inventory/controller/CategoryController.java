package ERP.Software.demo.inventory.controller;

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

    @GetMapping
    public List<Category> getAll() {
        return categoryRepository.findAll();
    }

    @GetMapping("/{id}")
    public Category getOne(@PathVariable Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    @PostMapping
    public ResponseEntity<Category> create(@Valid @RequestBody Category category) {
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
