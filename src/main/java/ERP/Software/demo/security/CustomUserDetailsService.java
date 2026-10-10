package ERP.Software.demo.security;

import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserAccountRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserAccount user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        if (!user.isActive()) {
            throw new UsernameNotFoundException("User is disabled: " + username);
        }

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(
                "ROLE_" + (user.getRole() != null ? user.getRole() : "USER")));
        // Super admin is an extra authority on top of the job role, never a role in
        // its own right. Keeping them separate means the Users page still shows the
        // person's actual job while the platform grant is checked on its own.
        if (user.isSuperAdmin()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"));
        }

        return org.springframework.security.core.userdetails.User.withUsername(user.getUsername())
                .password(user.getPassword())
                .authorities(authorities)
                .disabled(false)
                .build();
    }
}