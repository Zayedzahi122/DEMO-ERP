package ERP.Software.demo.inventory.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_movements")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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