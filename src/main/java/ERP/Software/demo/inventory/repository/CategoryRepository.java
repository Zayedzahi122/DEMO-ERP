package ERP.Software.demo.inventory.repository;

import ERP.Software.demo.inventory.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByOrderByNameAsc();
    List<Category> findAllByBusinessIdOrderByNameAsc(Long businessId);
    Optional<Category> findByBusinessIdAndNameIgnoreCase(Long businessId, String name);
    boolean existsByBusinessIdAndNameIgnoreCase(Long businessId, String name);
    long countByBusinessId(Long businessId);
}
