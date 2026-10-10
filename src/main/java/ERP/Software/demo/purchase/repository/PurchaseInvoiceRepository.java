package ERP.Software.demo.purchase.repository;

import ERP.Software.demo.purchase.model.PurchaseInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, Long> {
    List<PurchaseInvoice> findByInvoiceDateBetween(LocalDate start, LocalDate end);
    List<PurchaseInvoice> findByBusinessIdAndInvoiceDateBetween(Long businessId, LocalDate start, LocalDate end);
    List<PurchaseInvoice> findAllByOrderByInvoiceDateDescIdDesc();
    List<PurchaseInvoice> findAllByBusinessIdOrderByInvoiceDateDescIdDesc(Long businessId);
    Optional<PurchaseInvoice> findByIdAndBusinessId(Long id, Long businessId);
    long countByBusinessId(Long businessId);
}
