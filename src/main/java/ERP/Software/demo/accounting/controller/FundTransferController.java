package ERP.Software.demo.accounting.controller;

import ERP.Software.demo.accounting.model.FundTransfer;
import ERP.Software.demo.accounting.service.PaymentAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/fund-transfers")
@RequiredArgsConstructor
public class FundTransferController {

    private final PaymentAccountService accountService;

    @GetMapping
    public List<FundTransfer> getAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return accountService.transfers(from, to);
    }

    @PostMapping
    public ResponseEntity<FundTransfer> create(@RequestBody Map<String, Object> req) {
        Long from = Long.valueOf(String.valueOf(req.get("fromAccountId")));
        Long to = Long.valueOf(String.valueOf(req.get("toAccountId")));
        java.math.BigDecimal amount = new java.math.BigDecimal(String.valueOf(req.get("amount")));
        String dateStr = (String) req.get("transferDate");
        LocalDate date = dateStr == null || dateStr.isBlank() ? null : LocalDate.parse(dateStr);
        String note = (String) req.get("note");
        return ResponseEntity.ok(accountService.transfer(from, to, amount, date, note));
    }
}