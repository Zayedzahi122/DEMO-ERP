package ERP.Software.demo.user.model;

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

    @Column(nullable = false)
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
}