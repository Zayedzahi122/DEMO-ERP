package ERP.Software.demo.accounting.model;

import ERP.Software.demo.business.model.TenantScoped;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "ledger_entries")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class LedgerEntry implements TenantScoped {

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

    @Builder.Default
    private LocalDate entryDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType type;

    @Column(nullable = false, precision = 38, scale = 6)
    private BigDecimal amount;

    private String description;

    // e.g. "SALES_INVOICE", "PURCHASE_INVOICE", "MANUAL"
    private String referenceType;

    private Long referenceId;
}
