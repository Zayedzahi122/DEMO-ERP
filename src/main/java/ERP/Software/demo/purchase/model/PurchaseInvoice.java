package ERP.Software.demo.purchase.model;

import ERP.Software.demo.business.model.TenantScoped;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import ERP.Software.demo.partner.model.Supplier;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_invoices")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseInvoice implements TenantScoped {

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

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;

    @Builder.Default
    private LocalDate invoiceDate = LocalDate.now();

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
    private String paymentStatus = "PAID";

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PurchaseStatus status = PurchaseStatus.RECEIVED;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PurchaseInvoiceItem> items = new ArrayList<>();

    public void addItem(PurchaseInvoiceItem item) {
        items.add(item);
        item.setInvoice(this);
    }
}
