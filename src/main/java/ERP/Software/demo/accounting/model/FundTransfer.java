package ERP.Software.demo.accounting.model;

import ERP.Software.demo.business.model.TenantScoped;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "fund_transfers")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class FundTransfer implements TenantScoped {

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
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_account_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PaymentAccount fromAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_account_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PaymentAccount toAccount;

    @NotNull
    @Positive
    @Column(nullable = false, precision = 38, scale = 6)
    private BigDecimal amount;

    @Builder.Default
    private LocalDate transferDate = LocalDate.now();

    private String note;
}