package ERP.Software.demo.quotation.model;

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
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

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