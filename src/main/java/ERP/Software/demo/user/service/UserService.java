package ERP.Software.demo.user.service;

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

    public List<UserAccount> findAll() {
        return userRepository.findAllByOrderByFullNameAsc();
    }

    public UserAccount findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    @Transactional
    public UserAccount create(UserAccount user) {
        user.setId(null);
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
        userRepository.delete(findById(id));
    }

    @Transactional
    public void markLogin(String username) {
        userRepository.findByUsername(username).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            userRepository.save(u);
        });
    }
}