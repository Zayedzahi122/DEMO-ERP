package ERP.Software.demo.user.service;

import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantContext tenant;

    /**
     * The people you are allowed to see. A super admin sees everyone; everyone else
     * sees only their own colleagues, which is why this is not just findAll().
     */
    public List<UserAccount> findAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? userRepository.findAllByOrderByFullNameAsc()
                : userRepository.findAllByBusiness_IdOrderByFullNameAsc(businessId);
    }

    public UserAccount findById(Long id) {
        UserAccount user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        tenant.check(user.getBusinessId(), "user");
        return user;
    }

    @Transactional
    public UserAccount create(UserAccount user) {
        user.setId(null);
        // A new account always lands in the caller's own business. Handing out
        // somebody else's businessId from a form would be an isolation bypass.
        user.setBusiness(tenant.currentBusiness());
        // Super admin is a platform grant, never a form field.
        user.setSuperAdmin(false);
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        return userRepository.save(user);
    }

    @Transactional
    public UserAccount update(Long id, UserAccount updated) {
        UserAccount existing = findById(id);
        existing.setFullName(updated.getFullName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setRole(updated.getRole());
        existing.setBranch(updated.getBranch());
        existing.setActive(updated.isActive());
        existing.setModules(updated.getModules());
        if (updated.getPassword() != null && !updated.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(updated.getPassword()));
        }
        return userRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        UserAccount existing = findById(id);
        // Never let the last super admin lock everyone out of the platform.
        if (existing.isSuperAdmin() && userRepository.countBySuperAdminTrue() <= 1) {
            throw new IllegalStateException(
                    "This is the only super admin. Promote someone else first.");
        }
        userRepository.delete(existing);
    }

    @Transactional
    public void markLogin(String username) {
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            userRepository.save(u);
        });
    }
}
