package ERP.Software.demo.partner.controller;

import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.partner.model.Supplier;
import ERP.Software.demo.partner.repository.SupplierRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public List<Supplier> getAll() {
        return supplierRepository.findAll();
    }

    @GetMapping("/{id}")
    public Supplier getOne(@PathVariable Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + id));
    }

    @PostMapping
    public ResponseEntity<Supplier> create(@Valid @RequestBody Supplier supplier) {
        return ResponseEntity.ok(supplierRepository.save(supplier));
    }

    @PutMapping("/{id}")
    public Supplier update(@PathVariable Long id, @Valid @RequestBody Supplier updated) {
        Supplier existing = getOne(id);
        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        return supplierRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierRepository.delete(getOne(id));
        return ResponseEntity.noContent().build();
    }
}
