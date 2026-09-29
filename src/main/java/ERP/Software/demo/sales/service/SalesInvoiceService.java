package ERP.Software.demo.sales.service;

import ERP.Software.demo.accounting.model.EntryType;

import ERP.Software.demo.accounting.repository.LedgerEntryRepository;
import ERP.Software.demo.accounting.service.LedgerService;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SalesInvoiceService {

    public static final BigDecimal VAT_RATE = new BigDecimal("0.05");

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final CustomerRepository customerRepository;
    private final ProductService productService;
    private final LedgerService ledgerService;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final StockMovementRepository stockMovementRepository;

    public List<SalesInvoice> findAll() {
        return salesInvoiceRepository.findAllBy();
    }

    public SalesInvoice findById(Long id) {
        return salesInvoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found: " + id));
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
                .subtotal(BigDecimal.ZERO)
                .discount(request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

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
            stockMovementRepository.save(StockMovement.builder()
                    .product(product)
                    .type("OUT")
                    .quantity(itemReq.getQuantity())
                    .note("Sale")
                    .reference("SALES")
                    .build());

            subtotal = subtotal.add(lineTotal);
        }

        BigDecimal discount = invoice.getDiscount();
        BigDecimal taxable = subtotal.subtract(discount);
        BigDecimal tax = taxable.multiply(VAT_RATE).setScale(3, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax);

        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(tax);
        invoice.setTotalAmount(total);

        // Manual total override: the entered figure wins, and is flagged so later edits
        // do not silently recalculate it away.
        boolean overridden = Boolean.TRUE.equals(request.getTotalOverridden()) && request.getTotalAmount() != null;
        if (overridden) {
            invoice.setTotalOverridden(Boolean.TRUE);
            invoice.setTotalAmount(request.getTotalAmount().setScale(3, RoundingMode.HALF_UP));
        }

        applyPayments(invoice, request.getPayments());
        resolveStatus(invoice, request.getStatus());

        SalesInvoice saved = salesInvoiceRepository.save(invoice);

        ledgerService.record(EntryType.INCOME, total,
                "Sales invoice " + saved.getInvoiceNumber(), "SALES_INVOICE", saved.getId());

        return saved;
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
            stockMovementRepository.save(StockMovement.builder()
                    .product(old.getProduct())
                    .type("IN")
                    .quantity(old.getQuantity())
                    .note("Sale edit — stock returned")
                    .reference("SALES")
                    .build());
        }

        // 2. Clear old items
        invoice.getItems().clear();

        // 3. Update header
        Customer customer = resolveCustomer(request.getCustomerId());
        invoice.setCustomer(customer);
        invoice.setInvoiceDate(request.getInvoiceDate() != null ? request.getInvoiceDate() : invoice.getInvoiceDate());
        invoice.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : invoice.getPaymentMethod());
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
            stockMovementRepository.save(StockMovement.builder()
                    .product(product)
                    .type("OUT")
                    .quantity(itemReq.getQuantity())
                    .note("Sale edit — stock deducted")
                    .reference("SALES")
                    .build());

            subtotal = subtotal.add(lineTotal);
        }

        // 5. Recalculate totals
        BigDecimal discount = invoice.getDiscount();
        BigDecimal taxable = subtotal.subtract(discount);
        BigDecimal tax = taxable.multiply(VAT_RATE).setScale(3, RoundingMode.HALF_UP);
        BigDecimal total = taxable.add(tax);

        invoice.setSubtotal(subtotal);
        invoice.setTaxAmount(tax);
        invoice.setTotalAmount(total);

        // 5b. Manual total override. Only an explicit true/false changes the flag, so
        // omitting it leaves the invoice's existing setting untouched.
        boolean overridden = Boolean.TRUE.equals(request.getTotalOverridden()) && request.getTotalAmount() != null;
        if (overridden) {
            invoice.setTotalOverridden(Boolean.TRUE);
            invoice.setTotalAmount(request.getTotalAmount().setScale(3, RoundingMode.HALF_UP));
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
        ledgerEntryRepository.findFirstByReferenceTypeAndReferenceId("SALES_INVOICE", saved.getId())
                .ifPresent(entry -> {
                    entry.setAmount(effectiveTotal);
                    entry.setDescription("Sales invoice " + saved.getInvoiceNumber() + " (edited)");
                    ledgerEntryRepository.save(entry);
                });

        return saved;
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

    private Customer resolveCustomer(Long customerId) {
        if (customerId != null) {
            return customerRepository.findById(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
        }
        return customerRepository.findByName("Walk-in Customer")
                .orElseGet(() -> customerRepository.save(Customer.builder().name("Walk-in Customer").build()));
    }

    @Transactional
    public SalesInvoice cancelInvoice(Long id) {
        SalesInvoice invoice = findById(id);
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            return invoice;
        }
        for (SalesInvoiceItem item : invoice.getItems()) {
            productService.adjustStock(item.getProduct().getId(), item.getQuantity());
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        return salesInvoiceRepository.save(invoice);
    }
}