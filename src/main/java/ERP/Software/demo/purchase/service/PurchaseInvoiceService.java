package ERP.Software.demo.purchase.service;

import ERP.Software.demo.accounting.model.EntryType;
import ERP.Software.demo.accounting.service.LedgerService;
import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.common.money.Totals;
import ERP.Software.demo.inventory.model.Product;
import ERP.Software.demo.inventory.model.StockMovement;
import ERP.Software.demo.inventory.repository.StockMovementRepository;
import ERP.Software.demo.inventory.service.ProductService;
import ERP.Software.demo.partner.model.Supplier;
import ERP.Software.demo.partner.repository.SupplierRepository;
import ERP.Software.demo.purchase.dto.PurchaseInvoiceRequest;
import ERP.Software.demo.purchase.model.PurchaseInvoice;
import ERP.Software.demo.purchase.model.PurchaseInvoiceItem;
import ERP.Software.demo.purchase.model.PurchaseStatus;
import ERP.Software.demo.purchase.repository.PurchaseInvoiceRepository;
import ERP.Software.demo.setting.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseInvoiceService {

    /** Historic default, kept for callers that only need a sensible constant. */
    public static final BigDecimal VAT_RATE = SettingsService.DEFAULT_VAT_RATE;

    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final SupplierRepository supplierRepository;
    private final ProductService productService;
    private final LedgerService ledgerService;
    private final StockMovementRepository stockMovementRepository;
    private final SettingsService settingsService;
    private final TenantContext tenant;

    public List<PurchaseInvoice> findAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? purchaseInvoiceRepository.findAllByOrderByInvoiceDateDescIdDesc()
                : purchaseInvoiceRepository.findAllByBusinessIdOrderByInvoiceDateDescIdDesc(businessId);
    }

    public PurchaseInvoice findById(Long id) {
        PurchaseInvoice invoice = purchaseInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found: " + id));
        tenant.check(invoice.getBusinessId(), "purchase invoice");
        return invoice;
    }

    @Transactional
    public PurchaseInvoice createInvoice(PurchaseInvoiceRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + request.getSupplierId()));
        tenant.check(supplier.getBusinessId(), "supplier");

        PurchaseInvoice invoice = PurchaseInvoice.builder()
                .invoiceNumber("PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .supplier(supplier)
                .invoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : LocalDate.now())
                .status(PurchaseStatus.RECEIVED)
                .paymentStatus(request.getPaymentStatus() != null ? request.getPaymentStatus() : "PAID")
                .subtotal(BigDecimal.ZERO)
                .discount(request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();
        tenant.stamp(invoice);

        BigDecimal subtotal = BigDecimal.ZERO;

        for (PurchaseInvoiceRequest.Item itemReq : request.getItems()) {
            Product product = productService.findById(itemReq.getProductId());
            BigDecimal unitCost = itemReq.getUnitCost() != null ? itemReq.getUnitCost() : product.getCostPrice();
            BigDecimal lineTotal = unitCost.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            PurchaseInvoiceItem item = PurchaseInvoiceItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitCost(unitCost)
                    .lineTotal(lineTotal)
                    .build();
            invoice.addItem(item);

            productService.adjustStock(product.getId(), itemReq.getQuantity());
            StockMovement movement = StockMovement.builder()
                    .product(product)
                    .type("IN")
                    .quantity(itemReq.getQuantity())
                    .note("Purchase")
                    .reference("PURCHASE")
                    .build();
            tenant.stamp(movement);
            stockMovementRepository.save(movement);

            subtotal = subtotal.add(lineTotal);
        }

        // Shared with sales/quotations: caps the discount at the subtotal and
        // rounds to the decimal scale configured in Settings.
        Totals.Result t = Totals.of(subtotal, invoice.getDiscount(), settingsService.taxRate(),
                settingsService.moneyScale(), settingsService.taxInclusive());

        invoice.setSubtotal(t.subtotal());
        invoice.setDiscount(t.discount());
        invoice.setTaxAmount(t.taxAmount());
        invoice.setTotalAmount(t.totalAmount());
        PurchaseInvoice saved = purchaseInvoiceRepository.save(invoice);

        ledgerService.record(EntryType.EXPENSE, t.totalAmount(),
                "Purchase invoice " + saved.getInvoiceNumber(), "PURCHASE_INVOICE", saved.getId());

        return saved;
    }
}
