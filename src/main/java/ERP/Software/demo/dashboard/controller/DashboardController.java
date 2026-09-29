package ERP.Software.demo.dashboard.controller;

import ERP.Software.demo.accounting.service.LedgerService;
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

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        Map<String, Object> summary = new HashMap<>();

        var products = productService.findAll();
        BigDecimal stockValue = products.stream()
                .map(p -> p.getCostPrice().multiply(BigDecimal.valueOf(p.getQuantityInStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        summary.put("totalProducts", products.size());
        summary.put("lowStockCount", productService.findLowStock().size());
        summary.put("stockValue", stockValue);
        summary.put("totalCustomers", customerRepository.count());
        summary.put("totalSuppliers", supplierRepository.count());
        summary.put("totalEmployees", employeeRepository.count());
        summary.putAll(ledgerService.getMonthlySummary());

        return summary;
    }
}
