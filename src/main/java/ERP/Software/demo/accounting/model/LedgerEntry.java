package ERP.Software.demo.accounting.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "ledger_entries")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    private LocalDate entryDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType type;

    @Column(nullable = false)
    private BigDecimal amount;

    private String description;

    // e.g. "SALES_INVOICE", "PURCHASE_INVOICE", "MANUAL"
    private String referenceType;

    private Long referenceId;
}
