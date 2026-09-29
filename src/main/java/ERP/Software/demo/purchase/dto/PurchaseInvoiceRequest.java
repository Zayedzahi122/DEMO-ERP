package ERP.Software.demo.purchase.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseInvoiceRequest {

    @NotNull
    private Long supplierId;

    private LocalDate invoiceDate;

    @NotEmpty
    @Valid
    private List<Item> items;

    private java.math.BigDecimal discount;

    private String paymentStatus;

    @Data
    public static class Item {
        @NotNull
        private Long productId;

        @NotNull
        @Positive
        private Integer quantity;

        // Optional: if omitted, the product's current costPrice is used
        private java.math.BigDecimal unitCost;
    }
}
