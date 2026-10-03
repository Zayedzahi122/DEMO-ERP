package ERP.Software.demo.sales.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import ERP.Software.demo.partner.model.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sales_invoices")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class SalesInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Customer customer;

    @Builder.Default
    private LocalDate invoiceDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.CONFIRMED;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Builder.Default
    private String paymentMethod = "CASH";

    /** When true, totalAmount is a manually entered figure and is not recalculated from items. */
    @Builder.Default
    private Boolean totalOverridden = Boolean.FALSE;

    /** Sum of the payments recorded against this invoice. */
    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SalesInvoicePayment> payments = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SalesInvoiceItem> items = new ArrayList<>();

    public void addItem(SalesInvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
    }

    public void addPayment(SalesInvoicePayment payment) {
        payments.add(payment);
        payment.setInvoice(this);
    }

    /** Recomputes amountPaid from the payment rows. */
    public void recalcAmountPaid() {
        BigDecimal sum = BigDecimal.ZERO;
        for (SalesInvoicePayment p : payments) {
            if (p.getAmount() != null) sum = sum.add(p.getAmount());
        }
        this.amountPaid = sum;
    }

    /** totalAmount - amountPaid, never below zero. */
    public BigDecimal getBalanceDue() {
        BigDecimal total = totalAmount != null ? totalAmount : BigDecimal.ZERO;
        BigDecimal paid = amountPaid != null ? amountPaid : BigDecimal.ZERO;
        BigDecimal due = total.subtract(paid);
        return due.signum() < 0 ? BigDecimal.ZERO : due;
    }

    public boolean isFullyPaid() {
        return getBalanceDue().signum() <= 0;
    }
}
