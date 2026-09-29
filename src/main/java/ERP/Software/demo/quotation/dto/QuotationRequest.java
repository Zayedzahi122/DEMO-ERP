package ERP.Software.demo.quotation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class QuotationRequest {

    @NotNull
    private Long customerId;

    private LocalDate quotationDate;

    private LocalDate validUntil;

    @NotEmpty
    @Valid
    private List<Item> items;

    private BigDecimal discount;

    private String notes;

    @Data
    public static class Item {
        @NotNull
        private Long productId;

        @NotNull
        @Positive
        private Integer quantity;

        // Optional: if omitted, the product's current unitPrice is used
        private BigDecimal unitPrice;
    }
}