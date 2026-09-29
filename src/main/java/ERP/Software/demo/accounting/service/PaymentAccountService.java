package ERP.Software.demo.accounting.service;

import ERP.Software.demo.accounting.model.FundTransfer;
import ERP.Software.demo.accounting.model.PaymentAccount;
import ERP.Software.demo.accounting.repository.FundTransferRepository;
import ERP.Software.demo.accounting.repository.PaymentAccountRepository;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentAccountService {

    private final PaymentAccountRepository accountRepository;
    private final FundTransferRepository transferRepository;

    public List<PaymentAccount> allAccounts() {
        return accountRepository.findAllByOrderByNameAsc();
    }

    public PaymentAccount account(Long id) {
        return accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + id));
    }

    @Transactional
    public PaymentAccount create(PaymentAccount req) {
        if (req.getCode() == null || req.getCode().isBlank()) {
            req.setCode("ACC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        PaymentAccount saved = accountRepository.save(req);
        if (saved.getCurrentBalance() == null) saved.setCurrentBalance(saved.getOpeningBalance());
        saved = accountRepository.save(saved);
        return saved;
    }

    @Transactional
    public PaymentAccount update(Long id, PaymentAccount req) {
        PaymentAccount existing = account(id);
        existing.setName(req.getName());
        existing.setType(req.getType());
        existing.setBankDetails(req.getBankDetails());
        existing.setOpeningBalance(req.getOpeningBalance() == null ? BigDecimal.ZERO : req.getOpeningBalance());
        existing.setCurrentBalance(req.getCurrentBalance());
        existing.setActive(req.isActive());
        return accountRepository.save(existing);
    }

    @Transactional
    public void deleteAccount(Long id) {
        accountRepository.delete(account(id));
    }

    @Transactional
    public FundTransfer transfer(Long fromId, Long toId, BigDecimal amount, LocalDate date, String note) {
        if (fromId.equals(toId)) {
            throw new IllegalArgumentException("From and to account cannot be the same");
        }
        PaymentAccount from = account(fromId);
        PaymentAccount to = account(toId);
        BigDecimal amt = amount == null ? BigDecimal.ZERO : amount;
        if (amt.signum() <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive");
        }
        BigDecimal fromBal = from.getCurrentBalance() == null ? BigDecimal.ZERO : from.getCurrentBalance();
        if (fromBal.compareTo(amt) < 0) {
            throw new IllegalArgumentException("Insufficient balance in " + from.getName());
        }

        FundTransfer transfer = FundTransfer.builder()
                .reference("FT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .fromAccount(from)
                .toAccount(to)
                .amount(amt)
                .transferDate(date == null ? LocalDate.now() : date)
                .note(note)
                .build();
        transferRepository.save(transfer);

        from.setCurrentBalance(fromBal.subtract(amt));
        to.setCurrentBalance((to.getCurrentBalance() == null ? BigDecimal.ZERO : to.getCurrentBalance()).add(amt));
        accountRepository.save(from);
        accountRepository.save(to);
        return transfer;
    }

    public List<FundTransfer> transfers(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return transferRepository.findByTransferDateBetweenOrderByTransferDateDescIdDesc(from, to);
        }
        return transferRepository.findAllByOrderByTransferDateDescIdDesc();
    }

    public List<PaymentAccount> search(String q) {
        List<PaymentAccount> all = allAccounts();
        if (q == null || q.isBlank()) return all;
        String s = q.trim().toLowerCase();
        return all.stream()
                .filter(a -> (a.getName() != null && a.getName().toLowerCase().contains(s))
                        || (a.getCode() != null && a.getCode().toLowerCase().contains(s))
                        || (a.getType() != null && a.getType().toLowerCase().contains(s)))
                .toList();
    }
}