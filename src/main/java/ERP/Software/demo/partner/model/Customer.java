package ERP.Software.demo.partner.model;

import ERP.Software.demo.business.model.TenantScoped;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "customers")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Customer implements TenantScoped {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The business this row belongs to. Set once when the row is created and never
     * changed - it is what keeps one company's records out of another company's
     * lists, and what {@code TenantContext.check} tests on every get-by-id.
     */
    @Column(name = "business_id")
    private Long businessId;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Email
    private String email;

    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;
}
