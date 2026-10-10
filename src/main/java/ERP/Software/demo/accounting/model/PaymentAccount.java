package ERP.Software.demo.accounting.model;

import ERP.Software.demo.business.model.TenantScoped;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payment_accounts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentAccount implements TenantScoped {

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
    private String code;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @NotBlank
    @Column(nullable = false)
    private String type; // CASH, BANK, CARD, MOBILE, OTHER

    private String bankDetails;

    @Column(precision = 38, scale = 6)
    @NotNull
    @PositiveOrZero
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private LocalDate createdAt = LocalDate.now();
}
