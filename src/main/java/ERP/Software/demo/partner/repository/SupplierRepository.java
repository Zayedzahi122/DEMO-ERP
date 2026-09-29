package ERP.Software.demo.partner.repository;

import ERP.Software.demo.partner.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
}
