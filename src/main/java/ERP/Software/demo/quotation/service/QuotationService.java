package ERP.Software.demo.quotation.service;

import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.common.money.Totals;
import ERP.Software.demo.inventory.model.Product;
import ERP.Software.demo.inventory.service.ProductService;
import ERP.Software.demo.partner.model.Customer;
import ERP.Software.demo.partner.repository.CustomerRepository;
import ERP.Software.demo.quotation.dto.QuotationRequest;
import ERP.Software.demo.quotation.model.Quotation;
import ERP.Software.demo.quotation.model.QuotationItem;
import ERP.Software.demo.quotation.model.QuotationStatus;
import ERP.Software.demo.quotation.repository.QuotationRepository;
import ERP.Software.demo.sales.dto.SalesInvoiceRequest;
import ERP.Software.demo.sales.model.SalesInvoice;
import ERP.Software.demo.sales.service.SalesInvoiceService;
import ERP.Software.demo.setting.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final CustomerRepository customerRepository;
    private final ProductService productService;
    private final SalesInvoiceService salesInvoiceService;
    private final SettingsService settingsService;

    public List<Quotation> findAll() {
        return quotationRepository.findAll();
    }

    public Quotation findById(Long id) {
        return quotationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quotation not found: " + id));
    }

    @Transactional
    public Quotation createQuotation(QuotationRequest request) {
        Customer customer = resolveCustomer(request.getCustomerId());

        Quotation quotation = Quotation.builder()
                .quotationNumber("QUO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .customer(customer)
                .quotationDate(request.getQuotationDate() != null ? request.getQuotationDate() : LocalDate.now())
                .validUntil(request.getValidUntil())
                .status(QuotationStatus.DRAFT)
                .discount(request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO)
                .notes(request.getNotes())
                .subtotal(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (QuotationRequest.Item itemReq : request.getItems()) {
            Product product = productService.findById(itemReq.getProductId());
            BigDecimal unitPrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : product.getUnitPrice();
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            QuotationItem item = QuotationItem.builder()
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(unitPrice)
                    .lineTotal(lineTotal)
                    .build();
            quotation.addItem(item);
            subtotal = subtotal.add(lineTotal);
        }

        // Shared with sales/purchases: caps the discount at the subtotal and
        // rounds to the decimal scale configured in Settings.
        Totals.Result t = Totals.of(subtotal, quotation.getDiscount(), settingsService.vatRate(), settingsService.moneyScale());

        quotation.setSubtotal(t.subtotal());
        quotation.setDiscount(t.discount());
        quotation.setTaxAmount(t.taxAmount());
        quotation.setTotalAmount(t.totalAmount());
        return quotationRepository.save(quotation);
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
    public SalesInvoice convertToSale(Long id) {
        Quotation quotation = findById(id);
        if (quotation.getStatus() == QuotationStatus.CONVERTED) {
            throw new IllegalStateException("This quotation has already been converted to a sale");
        }

        SalesInvoiceRequest request = new SalesInvoiceRequest();
        request.setCustomerId(quotation.getCustomer().getId());
        request.setInvoiceDate(LocalDate.now());
        request.setDiscount(quotation.getDiscount());

        List<SalesInvoiceRequest.Item> items = new ArrayList<>();
        for (QuotationItem qi : quotation.getItems()) {
            SalesInvoiceRequest.Item item = new SalesInvoiceRequest.Item();
            item.setProductId(qi.getProduct().getId());
            item.setQuantity(qi.getQuantity());
            item.setUnitPrice(qi.getUnitPrice());
            items.add(item);
        }
        request.setItems(items);

        SalesInvoice invoice = salesInvoiceService.createInvoice(request);

        quotation.setStatus(QuotationStatus.CONVERTED);
        quotationRepository.save(quotation);
        return invoice;
    }

    @Transactional
    public void delete(Long id) {
        Quotation existing = findById(id);
        quotationRepository.delete(existing);
    }
}