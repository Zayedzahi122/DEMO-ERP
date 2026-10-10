package ERP.Software.demo.business.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A tenant. Every other business-scoped row carries a {@code business_id}, which
 * is what actually keeps one company's data away from another's - the business
 * record itself holds only its identity and contact details.
 *
 * <p>{@code active = false} is a soft off-switch: the business stays in the
 * database with its history intact but nobody can sign in to it.
 */
@Entity
@Table(name = "businesses")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Business {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    /** Short unique handle, used in invoice numbering and the sidebar. */
    @Column(length = 32)
    private String code;

    private String legalName;

    @Column(columnDefinition = "TEXT")
    private String address;

    /**
     * The places this business sells from, one per line. Entered by the Super Admin
     * when creating or editing a business, read by the app to build the location
     * picker in the top bar and stamped onto each sale so reports can say where
     * the money came in.
     */
    @Column(columnDefinition = "TEXT")
    private String locations;

    private String phone;

    @Email
    private String email;

    private String vatNo;

    @Builder.Default
    private boolean active = true;

    /**
     * Set when the business was created; never shown in the UI as editable.
     *
     * <p>{@code @Builder.Default} matters here: without it the builder would leave it
     * null, and the column is NOT NULL, so every business built through the builder
     * would fail to insert.
     */
    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}