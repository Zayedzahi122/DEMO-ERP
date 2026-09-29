package ERP.Software.demo.accounting.controller;


import ERP.Software.demo.accounting.model.LedgerEntry;
import ERP.Software.demo.accounting.service.LedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ledger")
@RequiredArgsConstructor
public class LedgerController {

    private final LedgerService ledgerService;

    @GetMapping
    public List<LedgerEntry> getAll() {
        return ledgerService.findAll();
    }

    @GetMapping("/summary")
    public Map<String, BigDecimal> getSummary() {
        return ledgerService.getMonthlySummary();
    }

    // Manual entries, e.g. rent, utilities, misc income not tied to an invoice
    @PostMapping
    public LedgerEntry create(@RequestBody LedgerEntry request) {
        return ledgerService.record(
                request.getType(),
                request.getAmount(),
                request.getDescription(),
                request.getReferenceType() != null ? request.getReferenceType() : "MANUAL",
                request.getReferenceId()
        );
    }
}
