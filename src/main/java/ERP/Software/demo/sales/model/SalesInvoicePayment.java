package ERP.Software.demo.sales.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A single amount received against an invoice. An invoice can have several of these,
 * which is what allows a sale to be settled part cash / part card / part still due.
 */
@Entity
@Table(name = "sales_invoice_payments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class SalesInvoicePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    @JsonIgnore
    private SalesInvoice invoice;

    /** CASH, CARD, OTHER, CREDIT ... */
    @Builder.Default
    private String method = "CASH";

    @Column(precision = 38, scale = 6)
    private BigDecimal amount;

    @Builder.Default
    private LocalDateTime paidAt = LocalDateTime.now();

    private String note;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    public SalesInvoice getInvoice() {
        return invoice;
    }
}
