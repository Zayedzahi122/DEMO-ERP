package ERP.Software.demo.accounting.repository;

import ERP.Software.demo.accounting.model.PaymentAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentAccountRepository extends JpaRepository<PaymentAccount, Long> {
    List<PaymentAccount> findAllByOrderByNameAsc();
    List<PaymentAccount> findAllByBusinessIdOrderByNameAsc(Long businessId);
    Optional<PaymentAccount> findByCode(String code);
    Optional<PaymentAccount> findByBusinessIdAndCode(Long businessId, String code);
    boolean existsByBusinessIdAndCode(Long businessId, String code);
    long countByBusinessId(Long businessId);
}
