package ERP.Software.demo.quotation.repository;

import ERP.Software.demo.quotation.model.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
}