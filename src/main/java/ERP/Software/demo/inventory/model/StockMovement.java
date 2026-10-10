package ERP.Software.demo.inventory.model;

import ERP.Software.demo.business.model.TenantScoped;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class StockMovement implements TenantScoped {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Product product;

    private String type;

    private int quantity;

    private String note;

    @Builder.Default
    private LocalDateTime date = LocalDateTime.now();

    private String reference;
}