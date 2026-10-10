package ERP.Software.demo.quotation.repository;

import ERP.Software.demo.quotation.model.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    List<Quotation> findAllByOrderByQuotationDateDescIdDesc();
    List<Quotation> findAllByBusinessIdOrderByQuotationDateDescIdDesc(Long businessId);
    Optional<Quotation> findByIdAndBusinessId(Long id, Long businessId);
    long countByBusinessId(Long businessId);
}
