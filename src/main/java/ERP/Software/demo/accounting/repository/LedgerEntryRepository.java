package ERP.Software.demo.accounting.repository;

import ERP.Software.demo.accounting.model.EntryType;
import ERP.Software.demo.accounting.model.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    List<LedgerEntry> findByTypeAndEntryDateBetween(EntryType type, LocalDate start, LocalDate end);
    List<LedgerEntry> findByEntryDateBetween(LocalDate start, LocalDate end);
    Optional<LedgerEntry> findFirstByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
}
