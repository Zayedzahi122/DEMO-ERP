package ERP.Software.demo.accounting.repository;

import ERP.Software.demo.accounting.model.EntryType;
import ERP.Software.demo.accounting.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByTypeAndEntryDateBetween(EntryType type, LocalDate start, LocalDate end);
    List<LedgerEntry> findByBusinessIdAndTypeAndEntryDateBetween(Long businessId, EntryType type, LocalDate start, LocalDate end);
    List<LedgerEntry> findByEntryDateBetween(LocalDate start, LocalDate end);
    List<LedgerEntry> findByBusinessIdAndEntryDateBetween(Long businessId, LocalDate start, LocalDate end);
    List<LedgerEntry> findAllByOrderByEntryDateDesc();
    List<LedgerEntry> findAllByBusinessIdOrderByEntryDateDesc(Long businessId);
    Optional<LedgerEntry> findFirstByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
    Optional<LedgerEntry> findFirstByBusinessIdAndReferenceTypeAndReferenceId(Long businessId, String referenceType, Long referenceId);
    long countByBusinessId(Long businessId);
}
