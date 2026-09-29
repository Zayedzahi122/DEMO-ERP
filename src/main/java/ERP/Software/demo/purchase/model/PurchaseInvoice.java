package ERP.Software.demo.purchase.model;

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
public class PurchaseInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String invoiceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Supplier supplier;

    @Builder.Default
    private LocalDate invoiceDate = LocalDate.now();

    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

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
