package ERP.Software.demo.inventory.controller;

import ERP.Software.demo.inventory.model.Product;
import ERP.Software.demo.inventory.model.StockMovement;
import ERP.Software.demo.inventory.repository.StockMovementRepository;
import ERP.Software.demo.inventory.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final StockMovementRepository stockMovementRepository;

    @GetMapping
    public List<Product> getAll() {
        return productService.findAll();
    }

    @GetMapping("/low-stock")
    public List<Product> getLowStock() {
        return productService.findLowStock();
    }

    @GetMapping("/next-sku")
    public Map<String, String> getNextSku() {
        return Map.of("sku", productService.generateSku());
    }

    @GetMapping("/{id}")
    public Product getOne(@PathVariable Long id) {
        return productService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Product> create(@Valid @RequestBody Product product) {
        return ResponseEntity.ok(productService.create(product));
    }

    @PutMapping("/{id}")
    public Product update(@PathVariable Long id, @Valid @RequestBody Product product) {
        return productService.update(id, product);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/adjust")
    public Product adjust(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        int delta = ((Number) body.getOrDefault("delta", 0)).intValue();
        String note = body.get("note") != null ? body.get("note").toString() : "Manual adjustment";
        Product product = productService.adjustStock(id, delta);
        stockMovementRepository.save(StockMovement.builder()
                .product(product)
                .type(delta >= 0 ? "IN" : "OUT")
                .quantity(Math.abs(delta))
                .note(note)
                .reference("MANUAL")
                .build());
        return product;
    }
}
