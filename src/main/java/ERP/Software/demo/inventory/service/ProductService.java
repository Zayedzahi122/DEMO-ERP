package ERP.Software.demo.inventory.service;

import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.inventory.model.Product;
import ERP.Software.demo.inventory.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    public List<Product> findAll() {
        return productRepository.findAll();
    }

    public Product findById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    public Product create(Product product) {
        if (product.getSku() == null || product.getSku().isBlank()) {
            product.setSku(generateSku());
        }
        return productRepository.save(product);
    }

    /** Generates the next sequential SKU (SKU-0001, SKU-0002, ...) that doesn't already exist. */
    public String generateSku() {
        int max = 0;
        for (Product p : productRepository.findAll()) {
            String sku = p.getSku();
            if (sku != null && sku.startsWith("SKU-")) {
                try {
                    int n = Integer.parseInt(sku.substring(4).trim());
                    if (n > max) max = n;
                } catch (NumberFormatException ignored) { }
            }
        }
        String candidate;
        do {
            candidate = String.format("SKU-%04d", ++max);
        } while (productRepository.findBySku(candidate).isPresent());
        return candidate;
    }

    public Product update(Long id, Product updated) {
        Product existing = findById(id);
        existing.setSku(updated.getSku() == null || updated.getSku().isBlank() ? existing.getSku() : updated.getSku());
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setCategory(updated.getCategory());
        existing.setUnitPrice(updated.getUnitPrice());
        existing.setCostPrice(updated.getCostPrice());
        existing.setQuantityInStock(updated.getQuantityInStock());
        existing.setReorderLevel(updated.getReorderLevel());
        return productRepository.save(existing);
    }

    public void delete(Long id) {
        Product existing = findById(id);
        productRepository.delete(existing);
    }

    public List<Product> findLowStock() {
        return productRepository.findAll().stream()
                .filter(p -> p.getQuantityInStock() <= p.getReorderLevel())
                .toList();
    }

    /**
     * Adjusts stock for a product. Positive delta = stock in (purchases),
     * negative delta = stock out (sales). Throws if it would go negative.
     */
    @Transactional
    public Product adjustStock(Long productId, int delta) {
        Product product = findById(productId);
        int newQty = product.getQuantityInStock() + delta;
        if (newQty < 0) {
            throw new IllegalArgumentException(
                    "Insufficient stock for product '" + product.getName() + "'. Available: "
                            + product.getQuantityInStock() + ", requested: " + Math.abs(delta));
        }
        product.setQuantityInStock(newQty);
        return productRepository.save(product);
    }
}
