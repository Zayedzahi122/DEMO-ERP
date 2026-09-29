package ERP.Software.demo.sales.controller;

import ERP.Software.demo.sales.dto.SalesInvoiceRequest;
import ERP.Software.demo.sales.model.SalesInvoice;
import ERP.Software.demo.sales.service.SalesInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sales-invoices")
@RequiredArgsConstructor
public class SalesInvoiceController {

    private final SalesInvoiceService salesInvoiceService;

    @GetMapping
    public List<SalesInvoice> getAll() {
        return salesInvoiceService.findAll();
    }

    @GetMapping("/{id}")
    public SalesInvoice getOne(@PathVariable Long id) {
        return salesInvoiceService.findById(id);
    }

    @PostMapping
    public ResponseEntity<SalesInvoice> create(@Valid @RequestBody SalesInvoiceRequest request) {
        return ResponseEntity.ok(salesInvoiceService.createInvoice(request));
    }

    @PostMapping("/{id}/cancel")
    public SalesInvoice cancel(@PathVariable Long id) {
        return salesInvoiceService.cancelInvoice(id);
    }

    @PutMapping("/{id}")
    public SalesInvoice update(@PathVariable Long id, @Valid @RequestBody SalesInvoiceRequest request) {
        return salesInvoiceService.updateInvoice(id, request);
    }
}
