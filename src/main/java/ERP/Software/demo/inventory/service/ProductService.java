package ERP.Software.demo.inventory.service;

import ERP.Software.demo.business.service.TenantContext;
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
    private final TenantContext tenant;

    /**
     * A super admin looking at every business at once gets {@code null} here and
     * therefore every product, which is what "view everything" should mean. The
     * frontend adds a "Business" column in that case rather than pretending the
     * rows are all from one company.
     */
    public List<Product> findAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? productRepository.findAllByOrderByNameAsc()
                : productRepository.findAllByBusinessIdOrderByNameAsc(businessId);
    }

    public Product findById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        // Knowing an id is not permission: a product from another business must
        // read as missing rather than as someone else's stock levels.
        tenant.check(product.getBusinessId(), "product");
        return product;
    }

    public Product create(Product product) {
        if (product.getSku() == null || product.getSku().isBlank()) {
            product.setSku(generateSku());
        } else if (isSkuTaken(product.getSku(), null)) {
            throw new IllegalArgumentException("SKU '" + product.getSku() + "' is already in use.");
        }
        tenant.stamp(product);
        return productRepository.save(product);
    }

    /** Generates the next sequential SKU (SKU-0001, SKU-0002, ...) not already in this business. */
    public String generateSku() {
        Long businessId = tenant.id();
        int max = 0;
        for (Product p : productRepository.findAllByBusinessIdOrderByNameAsc(businessId)) {
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
        } while (isSkuTaken(candidate, null));
        return candidate;
    }

    /** True when this business already uses {@code sku}, optionally ignoring one product. */
    public boolean isSkuTaken(String sku, Long ignoreProductId) {
        return productRepository.findAllByBusinessIdOrderByNameAsc(tenant.id()).stream()
                .anyMatch(p -> !p.getId().equals(ignoreProductId) && sku.equalsIgnoreCase(p.getSku()));
    }

    public Product update(Long id, Product updated) {
        Product existing = findById(id);
        String sku = updated.getSku() == null || updated.getSku().isBlank()
                ? existing.getSku() : updated.getSku();
        if (isSkuTaken(sku, id)) {
            throw new IllegalArgumentException("SKU '" + sku + "' is already in use.");
        }
        existing.setSku(sku);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        // null means "not sent": keep whatever is there. An empty string means
        // "remove the photo", which the Products screen sends on Remove Image.
        if (updated.getImage() != null) {
            existing.setImage(updated.getImage().isEmpty() ? null : updated.getImage());
        }
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
        return findAll().stream()
                .filter(p -> p.getReorderLevel() != null && p.getQuantityInStock() != null
                        && p.getQuantityInStock() <= p.getReorderLevel())
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
