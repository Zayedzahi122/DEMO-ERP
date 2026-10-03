package ERP.Software.demo.inventory.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sku;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

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
