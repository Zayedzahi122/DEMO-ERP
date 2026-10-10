package ERP.Software.demo.partner.repository;

import ERP.Software.demo.partner.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByName(String name);
    Optional<Customer> findByBusinessIdAndName(Long businessId, String name);
    List<Customer> findAllByOrderByNameAsc();
    List<Customer> findAllByBusinessIdOrderByNameAsc(Long businessId);
    long countByBusinessId(Long businessId);
}
