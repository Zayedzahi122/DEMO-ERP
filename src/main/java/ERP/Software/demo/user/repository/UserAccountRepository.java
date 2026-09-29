package ERP.Software.demo.user.repository;

import ERP.Software.demo.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByUsername(String username);
    boolean existsByUsername(String username);
    List<UserAccount> findAllByOrderByFullNameAsc();
}