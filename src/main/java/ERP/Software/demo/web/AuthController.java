package ERP.Software.demo.web;

import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/api/auth/me")
    public Map<String, Object> me(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        UserAccount user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

        Map<String, Object> me = new HashMap<>();
        me.put("username", user.getUsername());
        me.put("name", user.getFullName() != null ? user.getFullName() : user.getUsername());
        me.put("role", user.getRole());
        me.put("email", user.getEmail());
        me.put("phone", user.getPhone());
        me.put("branch", user.getBranch());
        me.put("modules", Arrays.stream((user.getModules() == null ? "" : user.getModules()).split(","))
                .filter(m -> !m.isBlank()).toList());
        return me;
    }

    /**
     * Forces CSRF token generation and returns it. The CookieCsrfTokenRepository
     * saves the token to the XSRF-TOKEN cookie on the response. This endpoint
     * is public so the SPA can fetch it on load before making mutating requests.
     */
    @GetMapping("/api/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        // Just accessing the parameter forces token generation; the filter saves the cookie.
        return Map.of("token", csrfToken.getToken(), "headerName", csrfToken.getHeaderName(), "parameterName", csrfToken.getParameterName());
    }

    public record ChangePasswordRequest(String oldPassword, String newPassword) {}

    @PostMapping("/api/auth/change-password")
    public Map<String, String> changePassword(@RequestBody ChangePasswordRequest req,
                                              Authentication auth) {
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        UserAccount user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

        if (req.oldPassword() == null || req.oldPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is required");
        }
        if (req.newPassword() == null || req.newPassword().length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 4 characters");
        }
        if (!passwordEncoder.matches(req.oldPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        Map<String, String> ok = new HashMap<>();
        ok.put("message", "Password changed successfully");
        return ok;
    }
}