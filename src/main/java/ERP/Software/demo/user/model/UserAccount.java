package ERP.Software.demo.user.model;

import ERP.Software.demo.business.model.Business;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    /**
     * The bcrypt hash. Write-only on purpose: it has to be accepted when creating or
     * updating an account, but must never travel back out in a list or a get - an
     * Administrator listing users should not be handed everyone's password hash.
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(name = "password", nullable = false)
    private String password;

    private String fullName;

    private String email;

    private String phone;

    private String role;

    private String branch;

    @Builder.Default
    private boolean active = true;

    // comma-separated module keys this user can access; null/blank = all modules
    @Column(columnDefinition = "TEXT")
    private String modules;

    private LocalDateTime lastLogin;

    /**
     * The business this account belongs to. Every other user is pinned to it -
     * they can never read or write another business's data, whatever their role.
     *
     * <p>Eager on purpose. Every user list serialises the business name, and a lazy
     * proxy there fails with LazyInitializationException once the session closes,
     * which turned /api/auth/me into a 500. One extra row per user is not a price
     * worth paying to keep the request path safe.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "business_id")
    private Business business;

    /**
     * Platform owner, not a role inside any one business. Only a super admin may
     * list businesses, create or delete them, or switch into one to look around.
     */
    @Builder.Default
    @Column(name = "is_super_admin")
    private boolean superAdmin = false;

    /** Convenience for {@link #getBusiness()}'s id, which is what most code needs. */
    @Transient
    public Long getBusinessId() {
        return business == null ? null : business.getId();
    }
}