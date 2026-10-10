package ERP.Software.demo.hr.model;

import ERP.Software.demo.business.model.TenantScoped;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "departments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Department implements TenantScoped {

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
    @Column(nullable = false, unique = true)
    private String name;
}
