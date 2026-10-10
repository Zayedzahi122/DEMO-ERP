package ERP.Software.demo.sales.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import ERP.Software.demo.inventory.model.Product;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "sales_invoice_items")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class SalesInvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    @JsonIgnore
    private SalesInvoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    private Integer quantity;

    @Column(precision = 38, scale = 6)
    private BigDecimal unitPrice;

    @Column(precision = 38, scale = 6)
    private BigDecimal lineTotal;
}
