package ERP.Software.demo;

import ERP.Software.demo.accounting.model.PaymentAccount;
import ERP.Software.demo.accounting.repository.PaymentAccountRepository;
import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PaymentAccountRepository accountRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() == 0) {
            seedUsers();
        }
        if (accountRepository.count() == 0) {
            seedAccounts();
        }
    }

    private void seedUsers() {
        user("admin", "123456", "System Administrator", "admin@erp.demo",
                "Administrator", "Main Branch - Muscat", true, null);
        user("cashier", "123456", "POS Cashier", "cashier@erp.demo",
                "Cashier", "Main Branch - Muscat", true, "dashboard,pos,sales");
    }

    private void user(String username, String rawPassword, String fullName, String email,
                      String role, String branch, boolean active, String modules) {
        userRepository.save(UserAccount.builder()
                .username(username)
                .password(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .email(email)
                .phone("+968 9999 0000")
                .role(role)
                .branch(branch)
                .active(active)
                .modules(modules)
                .build());
    }

    private void seedAccounts() {
        account(PaymentAccount.builder()
                .code("CASH")
                .name("Cash on Hand")
                .type("CASH")
                .openingBalance(new BigDecimal("500.000"))
                .currentBalance(new BigDecimal("500.000"))
                .build());
        account(PaymentAccount.builder()
                .code("BNK-MSC")
                .name("Bank - Muscat Main")
                .type("BANK")
                .bankDetails("Bank of Oman # 123456789 # HO Muscat")
                .openingBalance(new BigDecimal("5000.000"))
                .currentBalance(new BigDecimal("5000.000"))
                .build());
        account(PaymentAccount.builder()
                .code("BNK-SOH")
                .name("Bank - Sohar Branch")
                .type("BANK")
                .bankDetails("Bank of Oman # 987654321 # Sohar")
                .openingBalance(new BigDecimal("2500.000"))
                .currentBalance(new BigDecimal("2500.000"))
                .build());
        account(PaymentAccount.builder()
                .code("MOBILE")
                .name("Mobile Wallet")
                .type("MOBILE")
                .bankDetails("OmanPay # +968 9123 4567")
                .openingBalance(new BigDecimal("150.000"))
                .currentBalance(new BigDecimal("150.000"))
                .build());
    }

    private void account(PaymentAccount a) {
        accountRepository.save(a);
    }
}