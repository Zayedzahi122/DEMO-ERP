package ERP.Software.demo.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

import ERP.Software.demo.sales.model.InvoiceStatus;

@Data
public class SalesInvoiceRequest {

    // Optional: defaults to the "Walk-in Customer" when omitted
    private Long customerId;

    private LocalDate invoiceDate;

    @NotEmpty
    @Valid
    private List<Item> items;

    private java.math.BigDecimal discount;

    private String paymentMethod;

    // Optional: when omitted, the invoice keeps its current status.
    // CANCELLED is intentionally not accepted here - use the cancel endpoint.
    private InvoiceStatus status;

    // Optional: set true to treat totalAmount as a manual figure instead of a computed one.
    // Leave null to keep the invoice's current setting; false clears an existing override.
    private Boolean totalOverridden;

    // Optional: manual total. Only applied when totalOverridden is true.
    private java.math.BigDecimal totalAmount;

    // Optional: replaces the invoice's payment rows. Each entry is one tendered amount.
    private java.util.List<Payment> payments;

    @Data
    public static class Payment {
        @NotNull
        private java.math.BigDecimal amount;

        private String method = "CASH";

        private String note;
    }

    @Data
    public static class Item {
        @NotNull
        private Long productId;

        @NotNull
        @Positive
        private Integer quantity;

        // Optional: if omitted, the product's current unitPrice is used
        private java.math.BigDecimal unitPrice;
    }
}
