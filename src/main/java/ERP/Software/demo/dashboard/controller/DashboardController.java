package ERP.Software.demo.dashboard.controller;

import ERP.Software.demo.accounting.service.LedgerService;
import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.hr.repository.EmployeeRepository;
import ERP.Software.demo.inventory.model.Product;
import ERP.Software.demo.inventory.service.ProductService;
import ERP.Software.demo.partner.repository.CustomerRepository;
import ERP.Software.demo.partner.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ProductService productService;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final EmployeeRepository employeeRepository;
    private final LedgerService ledgerService;
    private final TenantContext tenant;

    /**
     * Figures for the business being acted for. A super admin who has not opened a
     * business sees the totals across all of them, which the header labels rather
     * than passing off as one company's numbers.
     */
    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new HashMap<>();
        Long businessId = tenant.idOrNull();

        var products = productService.findAll();
        BigDecimal stockValue = products.stream()
                .map(p -> costOf(p).multiply(BigDecimal.valueOf(p.getQuantityInStock() == null ? 0 : p.getQuantityInStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        summary.put("totalProducts", products.size());
        summary.put("lowStockCount", productService.findLowStock().size());
        summary.put("stockValue", stockValue);
        summary.put("totalCustomers", businessId == null
                ? customerRepository.count() : customerRepository.countByBusinessId(businessId));
        summary.put("totalSuppliers", businessId == null
                ? supplierRepository.count() : supplierRepository.countByBusinessId(businessId));
        summary.put("totalEmployees", businessId == null
                ? employeeRepository.count() : employeeRepository.countByBusinessId(businessId));
        summary.putAll(ledgerService.getMonthlySummary());

        // Tells the frontend whether these numbers are one company or the whole
        // platform, so the dashboard can say so instead of implying a single tenant.
        summary.put("allBusinesses", businessId == null);

        return summary;
    }

    /** Products may have no cost price entered yet; they contribute nothing to stock value. */
    private static BigDecimal costOf(Product p) {
        return p.getCostPrice() == null ? BigDecimal.ZERO : p.getCostPrice();
    }
}
