package ERP.Software.demo.inventory.repository;

import ERP.Software.demo.inventory.model.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    List<StockMovement> findByProductIdOrderByDateDesc(Long productId);
    List<StockMovement> findByBusinessIdAndProductIdOrderByDateDesc(Long businessId, Long productId);
    List<StockMovement> findAllByOrderByDateDesc();
    List<StockMovement> findAllByBusinessIdOrderByDateDesc(Long businessId);
    long countByBusinessId(Long businessId);
}
