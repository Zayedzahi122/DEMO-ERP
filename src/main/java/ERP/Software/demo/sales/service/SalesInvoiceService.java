package ERP.Software.demo.sales.service;

import ERP.Software.demo.accounting.model.EntryType;

import ERP.Software.demo.accounting.repository.LedgerEntryRepository;
import ERP.Software.demo.accounting.service.LedgerService;
import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.money.Totals;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.inventory.model.Product;
import ERP.Software.demo.inventory.model.StockMovement;
import ERP.Software.demo.inventory.repository.StockMovementRepository;
import ERP.Software.demo.inventory.service.ProductService;
import ERP.Software.demo.partner.model.Customer;
import ERP.Software.demo.partner.repository.CustomerRepository;
import ERP.Software.demo.sales.dto.SalesInvoiceRequest;
import ERP.Software.demo.sales.model.InvoiceStatus;
import ERP.Software.demo.sales.model.SalesInvoice;
import ERP.Software.demo.sales.model.SalesInvoiceItem;
import ERP.Software.demo.sales.model.SalesInvoicePayment;
import ERP.Software.demo.sales.repository.SalesInvoiceRepository;
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
public class SalesInvoiceService {

    /** Historic default, kept for callers that only need a sensible constant. */
    public static final BigDecimal VAT_RATE = SettingsService.DEFAULT_VAT_RATE;

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductService productService;
    private final LedgerService ledgerService;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SettingsService settingsService;
    private final TenantContext tenant;

    public List<SalesInvoice> findAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? salesInvoiceRepository.findAllBy()
                : salesInvoiceRepository.findAllByBusinessId(businessId);
    }

    /** Counts invoices for a given business, or across all of them for a super admin. */
    public long count() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? salesInvoiceRepository.count()
                : salesInvoiceRepository.countByBusinessId(businessId);
    }

    /** Revenue for the dashboard, over the same window every other report uses. */
    public List<SalesInvoice> between(LocalDate start, LocalDate end) {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? salesInvoiceRepository.findByInvoiceDateBetween(start, end)
                : salesInvoiceRepository.findByBusinessIdAndInvoiceDateBetween(businessId, start, end);
    }

    public SalesInvoice findById(Long id) {
        SalesInvoice invoice = salesInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found: " + id));
        tenant.check(invoice.getBusinessId(), "invoice");
        return invoice;
    }

    @Transactional
    public SalesInvoice createInvoice(SalesInvoiceRequest request) {
        Customer customer = resolveCustomer(request.getCustomerId());

        SalesInvoice invoice = SalesInvoice.builder()
                .invoiceNumber("INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .customer(customer)
                .invoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : LocalDate.now())
                .status(request.getStatus() != null && request.getStatus() != InvoiceStatus.CANCELLED
                        ? request.getStatus() : InvoiceStatus.CONFIRMED)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH")
                .location(cleanLocation(request.getLocation()))
                .subtotal(BigDecimal.ZERO)
                .discount(request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();
        tenant.stamp(invoice);

        BigDecimal subtotal = BigDecimal.ZERO;

        for (SalesInvoiceRequest.Item itemReq : request.getItems()) {
            Product product = productService.findById(itemReq.getProductId());
            BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : product.getUnitPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            SalesInvoiceItem item = SalesInvoiceItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(unitPrice)
                    .lineTotal(lineTotal)
                    .build();
            invoice.addItem(item);

            productService.adjustStock(product.getId(), -itemReq.getQuantity());
            recordMovement(product, "OUT", itemReq.getQuantity(), "Sale");

            subtotal = subtotal.add(lineTotal);
        }

        applyTotals(invoice, subtotal);

        // Manual total override: the entered figure wins, and is flagged so later edits
        // do not silently recalculate it away.
        boolean overridden = Boolean.TRUE.equals(request.getTotalOverridden()) && request.getTotalAmount() != null;
        if (overridden) {
            invoice.setTotalOverridden(Boolean.TRUE);
            invoice.setTotalAmount(settingsService.round(request.getTotalAmount()));
        }

        applyPayments(invoice, request.getPayments());
        resolveStatus(invoice, request.getStatus());

        SalesInvoice saved = salesInvoiceRepository.save(invoice);

        // Book the amount actually stored, which differs from the computed total
        // when the client supplied a manual override.
        ledgerService.record(EntryType.INCOME, saved.getTotalAmount(),
                "Sales invoice " + saved.getInvoiceNumber(), "SALES_INVOICE", saved.getId());

        return saved;
    }

    /** Trims a location and treats a blank value as unset. */
    private String cleanLocation(String location) {
        if (location == null) return null;
        String t = location.trim();
        return t.isEmpty() ? null : t;
    }

    @Transactional
    public SalesInvoice updateInvoice(Long id, SalesInvoiceRequest request) {
        SalesInvoice invoice = findById(id);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new IllegalStateException("Cannot edit a cancelled invoice");
        }

        // 1. Return all old stock
        for (SalesInvoiceItem old : invoice.getItems()) {
            productService.adjustStock(old.getProduct().getId(), old.getQuantity());
            recordMovement(old.getProduct(), "IN", old.getQuantity(), "Sale edit - stock returned");
        }

        // 2. Clear old items
        invoice.getItems().clear();

        // 3. Update header
        Customer customer = resolveCustomer(request.getCustomerId());
        invoice.setCustomer(customer);
        invoice.setInvoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : invoice.getInvoiceDate());
        invoice.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : invoice.getPaymentMethod());
        if (request.getLocation() != null) invoice.setLocation(cleanLocation(request.getLocation()));
        invoice.setDiscount(request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO);
        if (request.getStatus() != null && request.getStatus() != InvoiceStatus.CANCELLED) {
            invoice.setStatus(request.getStatus());
        }

        // 4. Apply new items
        BigDecimal subtotal = BigDecimal.ZERO;
        for (SalesInvoiceRequest.Item itemReq : request.getItems()) {
            Product product = productService.findById(itemReq.getProductId());
            BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : product.getUnitPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            SalesInvoiceItem item = SalesInvoiceItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(unitPrice)
                    .lineTotal(lineTotal)
                    .build();
            invoice.addItem(item);

            productService.adjustStock(product.getId(), -itemReq.getQuantity());
            recordMovement(product, "OUT", itemReq.getQuantity(), "Sale edit - stock deducted");

            subtotal = subtotal.add(lineTotal);
        }

        // 5. Recalculate totals
        applyTotals(invoice, subtotal);

        // 5b. Manual total override. Only an explicit true/false changes the flag, so
        // omitting it leaves the invoice's existing setting untouched.
        boolean overridden = Boolean.TRUE.equals(request.getTotalOverridden()) && request.getTotalAmount() != null;
        if (overridden) {
            invoice.setTotalOverridden(Boolean.TRUE);
            invoice.setTotalAmount(settingsService.round(request.getTotalAmount()));
        } else if (Boolean.FALSE.equals(request.getTotalOverridden())) {
            invoice.setTotalOverridden(Boolean.FALSE);
        }

        // 5c. Replace payment rows when the client sends them
        if (request.getPayments() != null) {
            invoice.getPayments().clear();
            applyPayments(invoice, request.getPayments());
        }
        invoice.recalcAmountPaid();
        resolveStatus(invoice, request.getStatus());

        SalesInvoice saved = salesInvoiceRepository.save(invoice);

        // 6. Update ledger entry
        BigDecimal effectiveTotal = saved.getTotalAmount();
        var existingEntry = ledgerService.entryFor("SALES_INVOICE", saved.getId());
        if (existingEntry != null) {
            existingEntry.setAmount(effectiveTotal);
            existingEntry.setDescription("Sales invoice " + saved.getInvoiceNumber() + " (edited)");
            ledgerEntryRepository.save(existingEntry);
        } else {
            // The entry can be missing if a previous cancel deleted it; put it back
            // rather than leaving an edited invoice unbooked.
            ledgerService.record(EntryType.INCOME, effectiveTotal,
                    "Sales invoice " + saved.getInvoiceNumber() + " (edited)", "SALES_INVOICE", saved.getId());
        }

        return saved;
    }

    /**
     * Logs a stock movement against a product and stamps it with the current
     * business, so one company's inventory trail never shows up in another's.
     */
    private void recordMovement(Product product, String type, int quantity, String note) {
        StockMovement movement = StockMovement.builder()
                .product(product)
                .type(type)
                .quantity(quantity)
                .note(note)
                .reference("SALES")
                .build();
        tenant.stamp(movement);
        stockMovementRepository.save(movement);
    }

    /**
     * Sets subtotal, discount, VAT and total from the given line subtotal, using
     * the decimal scale and VAT rate configured in Settings. The discount is
     * capped at the subtotal, because a larger one would push the taxable base
     * negative and produce negative VAT and a negative total.
     */
    private void applyTotals(SalesInvoice invoice, BigDecimal subtotal) {
        Totals.Result t = Totals.of(subtotal, invoice.getDiscount(), settingsService.taxRate(),
                settingsService.moneyScale(), settingsService.taxInclusive());
        invoice.setSubtotal(t.subtotal());
        invoice.setDiscount(t.discount());
        invoice.setTaxAmount(t.taxAmount());
        invoice.setTotalAmount(t.totalAmount());
    }

    /**
     * Replaces the invoice's payment rows with the supplied split (e.g. 50 cash + 50 card).
     * A single payment row is also allowed. The legacy paymentMethod column is kept in sync
     * so existing reports and the POS receipt still show something sensible.
     */
    private void applyPayments(SalesInvoice invoice, List<SalesInvoiceRequest.Payment> payments) {
        if (payments == null) return;
        invoice.getPayments().clear();
        for (SalesInvoiceRequest.Payment p : payments) {
            if (p.getAmount() == null || p.getAmount().signum() <= 0) continue;
            invoice.addPayment(SalesInvoicePayment.builder()
                    .method(p.getMethod() != null ? p.getMethod() : "CASH")
                    .amount(p.getAmount())
                    .note(p.getNote())
                    .build());
        }
        invoice.recalcAmountPaid();
        if (!invoice.getPayments().isEmpty()) {
            invoice.setPaymentMethod(invoice.getPayments().get(0).getMethod());
        }
    }

    /**
     * Derives the status from what has actually been paid, unless the caller sent one explicitly.
     * Fully paid -> PAID, partly paid -> DUE, nothing paid -> CONFIRMED.
     */
    private void resolveStatus(SalesInvoice invoice, InvoiceStatus requested) {
        if (requested != null && requested != InvoiceStatus.CANCELLED) {
            invoice.setStatus(requested);
            return;
        }
        BigDecimal paid = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO;
        if (paid.signum() <= 0) {
            invoice.setStatus(InvoiceStatus.CONFIRMED);
        } else if (invoice.getBalanceDue().signum() <= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            invoice.setStatus(InvoiceStatus.DUE);
        }
    }

    /**
     * The walk-in customer is per business: two companies must not share one
     * customer row, or the name would collide in both books.
     */
    private Customer resolveCustomer(Long customerId) {
        Long businessId = tenant.id();
        if (customerId != null) {
            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
            tenant.check(customer.getBusinessId(), "customer");
            return customer;
        }
        return customerRepository.findByBusinessIdAndName(businessId, WALK_IN)
                .orElseGet(this::createWalkIn);
    }

    private static final String WALK_IN = "Walk-in Customer";

    private Customer createWalkIn() {
        Customer customer = Customer.builder().name(WALK_IN).build();
        tenant.stamp(customer);
        return customerRepository.save(customer);
    }

    @Transactional
    public SalesInvoice cancelInvoice(Long id) {
        SalesInvoice invoice = findById(id);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            return invoice;
        }
        // Return the stock and log it, so the movement history stays balanced
        // against the "OUT" recorded when the sale was created.
        for (SalesInvoiceItem item : invoice.getItems()) {
            productService.adjustStock(item.getProduct().getId(), item.getQuantity());
            recordMovement(item.getProduct(), "IN", item.getQuantity(), "Sale cancelled - stock returned");
        }

        // A voided sale is not income. Drop the ledger entry so the dashboard and
        // reports stop counting revenue that no longer exists.
        var entry = ledgerService.entryFor("SALES_INVOICE", invoice.getId());
        if (entry != null) ledgerEntryRepository.delete(entry);

        invoice.setStatus(InvoiceStatus.CANCELLED);
        return salesInvoiceRepository.save(invoice);
    }
}
