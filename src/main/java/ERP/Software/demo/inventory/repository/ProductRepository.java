package ERP.Software.demo.inventory.repository;

import ERP.Software.demo.inventory.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findBySku(String sku);
    Optional<Product> findByBusinessIdAndSku(Long businessId, String sku);
    boolean existsByBusinessIdAndSku(Long businessId, String sku);
    List<Product> findByQuantityInStockLessThanEqual(Integer threshold);
    List<Product> findByBusinessIdAndQuantityInStockLessThanEqual(Long businessId, Integer threshold);
    List<Product> findAllByOrderByNameAsc();
    List<Product> findAllByBusinessIdOrderByNameAsc(Long businessId);
    long countByBusinessId(Long businessId);
}
