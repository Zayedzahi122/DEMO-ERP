package ERP.Software.demo.purchase.repository;

import ERP.Software.demo.purchase.model.PurchaseInvoice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, Long> {
    List<PurchaseInvoice> findByInvoiceDateBetween(LocalDate start, LocalDate end);
}
