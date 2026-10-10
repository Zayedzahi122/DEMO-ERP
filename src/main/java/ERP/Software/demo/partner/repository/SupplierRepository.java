package ERP.Software.demo.partner.repository;

import ERP.Software.demo.partner.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findAllByOrderByNameAsc();
    List<Supplier> findAllByBusinessIdOrderByNameAsc(Long businessId);
    long countByBusinessId(Long businessId);
}
