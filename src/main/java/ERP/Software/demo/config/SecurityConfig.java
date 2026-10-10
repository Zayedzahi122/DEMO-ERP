package ERP.Software.demo.config;

import ERP.Software.demo.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final ERP.Software.demo.user.repository.UserAccountRepository userRepository;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // CSRF with cookie token (JavaScript-readable) and request-attribute handler.
        // The login form (/login) and logout form (/logout) are exempt because they
        // use Spring Security's built-in handlers which already include the token.
        var csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        var csrfRequestHandler = new CsrfTokenRequestAttributeHandler();

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(csrfRequestHandler)
                        // Exempt the login POST (handled by formLogin) and logout POST
                        // Spring's built-in handlers include the token automatically.
                        .ignoringRequestMatchers("/login", "/logout"))
                .userDetailsService(userDetailsService)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/login", "/login.html", "/css/**", "/js/**", "/images/**",
                                "/favicon.ico", "/error", "/api/csrf").permitAll()
                                        // Reading settings is needed by every page's layout, so any signed-in
                        // user may read it; only an Administrator may change it.
                        .requestMatchers(HttpMethod.GET, "/api/settings").authenticated()
                        // The tenant context drives the sidebar and the "viewing as" banner,
                        // so it has to be readable by every signed-in user - it simply
                        // reports superAdmin: false for everyone else. The rest of
                        // /api/businesses stays restricted below.
                        .requestMatchers(HttpMethod.GET, "/api/businesses/context").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/settings").hasRole("Administrator")
                        // User management can reset any password and grant any role, so it is
                        // restricted to Administrators rather than merely requiring a login.
                        .requestMatchers(HttpMethod.POST, "/api/users", "/api/users/**").hasRole("Administrator")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasRole("Administrator")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("Administrator")
                        // The business registry is the platform owner's surface: it can
                        // create companies, look inside them, and sign people into them.
                        // SUPER_ADMIN is a grant on the account, not a job role, so it
                        // cannot be handed out by editing a role in the Users page.
                        .requestMatchers("/api/businesses/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().authenticated())
                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .defaultSuccessUrl("/", true)
                        .failureUrl("/login?error=true")
                        // Nobody working for a deactivated business gets in, even with a
                        // correct password. Without this the "Deactivate" button would only
                        // stop the Super Admin from switching in, which is not the same thing.
                        .successHandler((request, response, authentication) -> {
                            boolean blocked = userRepository.isSignInBlocked(authentication.getName());
                            if (blocked) {
                                // Sign out again, so the half-made session cannot be reused
                                // by anyone who gets hold of the cookie.
                                new SecurityContextLogoutHandler().logout(request, response, authentication);
                                response.sendRedirect("/login?error=inactive");
                            } else {
                                response.sendRedirect(request.getContextPath() + "/");
                            }
                        })
                        .permitAll())
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout=1")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll());

        return http.build();
    }
}