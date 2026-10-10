package ERP.Software.demo.accounting.service;

import ERP.Software.demo.accounting.model.EntryType;
import ERP.Software.demo.accounting.model.LedgerEntry;
import ERP.Software.demo.accounting.repository.LedgerEntryRepository;
import ERP.Software.demo.business.service.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerEntryRepository ledgerEntryRepository;
    private final TenantContext tenant;

    public LedgerEntry record(EntryType type, BigDecimal amount, String description, String referenceType, Long referenceId) {
        LedgerEntry entry = LedgerEntry.builder()
                .entryDate(LocalDate.now())
                .type(type)
                .amount(amount)
                .description(description)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .build();
        tenant.stamp(entry);
        return ledgerEntryRepository.save(entry);
    }

    public List<LedgerEntry> findAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? ledgerEntryRepository.findAllByOrderByEntryDateDesc()
                : ledgerEntryRepository.findAllByBusinessIdOrderByEntryDateDesc(businessId);
    }

    /** Finds the single entry posted for a document, for updating rather than duplicating. */
    public LedgerEntry entryFor(String referenceType, Long referenceId) {
        Long businessId = tenant.id();
        return ledgerEntryRepository
                .findFirstByBusinessIdAndReferenceTypeAndReferenceId(businessId, referenceType, referenceId)
                .orElse(null);
    }

    /** Simple summary: total income, total expense, and net profit for the current month. */
    public Map<String, BigDecimal> getMonthlySummary() {
        LocalDate start = LocalDate.now().withDayOfMonth(1);
        LocalDate end = start.plusMonths(1).minusDays(1);
        Long businessId = tenant.idOrNull();

        List<LedgerEntry> incomeEntries = businessId == null
                ? ledgerEntryRepository.findByTypeAndEntryDateBetween(EntryType.INCOME, start, end)
                : ledgerEntryRepository.findByBusinessIdAndTypeAndEntryDateBetween(businessId, EntryType.INCOME, start, end);

        List<LedgerEntry> expenseEntries = businessId == null
                ? ledgerEntryRepository.findByTypeAndEntryDateBetween(EntryType.EXPENSE, start, end)
                : ledgerEntryRepository.findByBusinessIdAndTypeAndEntryDateBetween(businessId, EntryType.EXPENSE, start, end);

        BigDecimal income = incomeEntries.stream().map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expense = expenseEntries.stream().map(LedgerEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "totalIncome", income,
                "totalExpense", expense,
                "netProfit", income.subtract(expense)
        );
    }
}
