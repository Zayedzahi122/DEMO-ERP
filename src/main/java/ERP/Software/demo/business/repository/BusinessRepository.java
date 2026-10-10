package ERP.Software.demo.business.repository;

import ERP.Software.demo.business.model.Business;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusinessRepository extends JpaRepository<Business, Long> {

    List<Business> findAllByOrderByNameAsc();

    Optional<Business> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    /** Codes are unique across businesses, so "Acme" and "ACME" cannot both exist. */
    Optional<Business> findByNameIgnoreCase(String name);
}
