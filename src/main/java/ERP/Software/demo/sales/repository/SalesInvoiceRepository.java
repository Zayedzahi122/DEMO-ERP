package ERP.Software.demo.sales.repository;

import ERP.Software.demo.sales.model.SalesInvoice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, Long> {

    List<SalesInvoice> findByInvoiceDateBetween(LocalDate start, LocalDate end);
    List<SalesInvoice> findByBusinessIdAndInvoiceDateBetween(Long businessId, LocalDate start, LocalDate end);

    // payments/items are needed by the sales list. Only one bag is fetched per query,
    // otherwise Hibernate raises MultipleBagFetchException.
    @EntityGraph(attributePaths = {"payments"})
    List<SalesInvoice> findAllBy();

    @EntityGraph(attributePaths = {"payments"})
    List<SalesInvoice> findAllByBusinessId(Long businessId);

    @EntityGraph(attributePaths = {"items"})
    Optional<SalesInvoice> findById(Long id);

    @EntityGraph(attributePaths = {"items"})
    Optional<SalesInvoice> findByIdAndBusinessId(Long id, Long businessId);

    long countByBusinessId(Long businessId);
}
