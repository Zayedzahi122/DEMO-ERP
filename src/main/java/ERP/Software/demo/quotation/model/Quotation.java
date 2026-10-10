package ERP.Software.demo.quotation.model;

import ERP.Software.demo.business.model.TenantScoped;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import ERP.Software.demo.partner.model.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Quotation implements TenantScoped {

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
    private String quotationNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Customer customer;

    @Builder.Default
    private LocalDate quotationDate = LocalDate.now();

    private LocalDate validUntil;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private QuotationStatus status = QuotationStatus.DRAFT;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(precision = 38, scale = 6)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<QuotationItem> items = new ArrayList<>();

    public void addItem(QuotationItem item) {
        items.add(item);
        item.setQuotation(this);
    }
}
