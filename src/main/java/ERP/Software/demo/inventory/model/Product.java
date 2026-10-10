package ERP.Software.demo.inventory.model;

import ERP.Software.demo.business.model.TenantScoped;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products", uniqueConstraints = @UniqueConstraint(name = "uk_product_business_sku", columnNames = {"business_id", "sku"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Product implements TenantScoped {

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

    @Column(nullable = false)
    private String sku;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Product photo as a data URL, uploaded from the Products screen. */
    @Column(columnDefinition = "TEXT")
    private String image;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Category category;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false, precision = 38, scale = 6)
    private BigDecimal unitPrice;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false, precision = 38, scale = 6)
    private BigDecimal costPrice;

    @NotNull
    @PositiveOrZero
    @Column(nullable = false)
    private Integer quantityInStock;

    @Builder.Default
    private Integer reorderLevel = 5;
}
