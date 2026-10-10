package ERP.Software.demo.accounting.repository;

import ERP.Software.demo.accounting.model.FundTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FundTransferRepository extends JpaRepository<FundTransfer, Long> {
    List<FundTransfer> findAllByOrderByTransferDateDescIdDesc();
    List<FundTransfer> findAllByBusinessIdOrderByTransferDateDescIdDesc(Long businessId);
    List<FundTransfer> findByTransferDateBetweenOrderByTransferDateDescIdDesc(LocalDate start, LocalDate end);
    List<FundTransfer> findByBusinessIdAndTransferDateBetweenOrderByTransferDateDescIdDesc(Long businessId, LocalDate start, LocalDate end);
    Optional<FundTransfer> findByReference(String reference);
    Optional<FundTransfer> findByBusinessIdAndReference(Long businessId, String reference);
    long countByBusinessId(Long businessId);
}
