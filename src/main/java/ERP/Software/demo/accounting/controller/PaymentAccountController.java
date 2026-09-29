package ERP.Software.demo.accounting.controller;

import ERP.Software.demo.accounting.model.PaymentAccount;
import ERP.Software.demo.accounting.service.PaymentAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payment-accounts")
@RequiredArgsConstructor
public class PaymentAccountController {

    private final PaymentAccountService accountService;

    @GetMapping
    public List<PaymentAccount> getAll(@RequestParam(required = false) String q) {
        return accountService.search(q);
    }

    @GetMapping("/{id}")
    public PaymentAccount getOne(@PathVariable Long id) {
        return accountService.account(id);
    }

    @PostMapping
    public ResponseEntity<PaymentAccount> create(@Valid @RequestBody PaymentAccount account) {
        return ResponseEntity.ok(accountService.create(account));
    }

    @PutMapping("/{id}")
    public PaymentAccount update(@PathVariable Long id, @Valid @RequestBody PaymentAccount account) {
        return accountService.update(id, account);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        accountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }
}