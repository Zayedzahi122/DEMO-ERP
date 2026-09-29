package ERP.Software.demo.accounting.service;

import ERP.Software.demo.accounting.model.EntryType;
import ERP.Software.demo.accounting.model.LedgerEntry;
import ERP.Software.demo.accounting.repository.LedgerEntryRepository;
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

    public LedgerEntry record(EntryType type, BigDecimal amount, String description, String referenceType, Long referenceId) {
        LedgerEntry entry = LedgerEntry.builder()
                .entryDate(LocalDate.now())
                .type(type)
                .amount(amount)
                .description(description)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .build();
        return ledgerEntryRepository.save(entry);
    }

    public List<LedgerEntry> findAll() {
        return ledgerEntryRepository.findAll();
    }

    /** Simple summary: total income, total expense, and net profit for the current month. */
    public Map<String, BigDecimal> getMonthlySummary() {
        LocalDate start = LocalDate.now().withDayOfMonth(1);
        LocalDate end = start.plusMonths(1).minusDays(1);

        BigDecimal income = ledgerEntryRepository.findByTypeAndEntryDateBetween(EntryType.INCOME, start, end)
                .stream().map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expense = ledgerEntryRepository.findByTypeAndEntryDateBetween(EntryType.EXPENSE, start, end)
                .stream().map(LedgerEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "totalIncome", income,
                "totalExpense", expense,
                "netProfit", income.subtract(expense)
        );
    }
}
