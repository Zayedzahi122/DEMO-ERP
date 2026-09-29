package ERP.Software.demo.quotation.controller;

import ERP.Software.demo.quotation.dto.QuotationRequest;
import ERP.Software.demo.quotation.model.Quotation;
import ERP.Software.demo.quotation.service.QuotationService;
import ERP.Software.demo.sales.model.SalesInvoice;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quotations")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService quotationService;

    @GetMapping
    public List<Quotation> getAll() {
        return quotationService.findAll();
    }

    @GetMapping("/{id}")
    public Quotation getOne(@PathVariable Long id) {
        return quotationService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Quotation> create(@Valid @RequestBody QuotationRequest request) {
        return ResponseEntity.ok(quotationService.createQuotation(request));
    }

    @PostMapping("/{id}/convert")
    public ResponseEntity<SalesInvoice> convert(@PathVariable Long id) {
        return ResponseEntity.ok(quotationService.convertToSale(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        quotationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}