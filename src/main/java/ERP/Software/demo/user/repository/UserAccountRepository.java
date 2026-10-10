package ERP.Software.demo.user.repository;

import ERP.Software.demo.user.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByUsername(String username);

    boolean existsByUsername(String username);

    List<UserAccount> findAllByOrderByFullNameAsc();

    /**
     * Everyone in one business - the only user list a non-super admin may see.
     *
     * <p>The path is {@code Business_Id}, not {@code BusinessId}: {@code getBusinessId()}
     * is a {@code @Transient} convenience getter and JPQL cannot resolve it. Every
     * tenant query here has to walk the real association path.
     */
    List<UserAccount> findAllByBusiness_IdOrderByFullNameAsc(Long businessId);

    List<UserAccount> findByBusiness_IdOrderByUsernameAsc(Long businessId);

    Optional<UserAccount> findByIdAndBusiness_Id(Long id, Long businessId);

    long countByBusiness_Id(Long businessId);

    /** Guards against deleting the last super admin and locking everyone out. */
    long countBySuperAdminTrue();

    /**
     * True when this account's business has been switched off, or when it has no
     * business at all - either way it must not be allowed in.
     *
     * <p>A query rather than loading the account and reading the flag: this is called
     * from the login success handler, which runs inside the security filter chain
     * where there is no entity session, so touching the association in Java throws
     * LazyInitializationException. Here it is part of the SQL instead.
     */
    @Query("""
            select case when u.business is null or u.business.active = false then true
                       else false end
            from UserAccount u
            where u.username = :username
            """)
    boolean isSignInBlocked(@Param("username") String username);
}
