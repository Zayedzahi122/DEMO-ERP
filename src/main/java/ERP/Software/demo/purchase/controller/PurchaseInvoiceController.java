package ERP.Software.demo.purchase.controller;

import ERP.Software.demo.purchase.dto.PurchaseInvoiceRequest;
import ERP.Software.demo.purchase.model.PurchaseInvoice;
import ERP.Software.demo.purchase.service.PurchaseInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-invoices")
@RequiredArgsConstructor
public class PurchaseInvoiceController {

    private final PurchaseInvoiceService purchaseInvoiceService;

    @GetMapping
    public List<PurchaseInvoice> getAll() {
        return purchaseInvoiceService.findAll();
    }

    @GetMapping("/{id}")
    public PurchaseInvoice getOne(@PathVariable Long id) {
        return purchaseInvoiceService.findById(id);
    }

    @PostMapping
    public ResponseEntity<PurchaseInvoice> create(@Valid @RequestBody PurchaseInvoiceRequest request) {
        return ResponseEntity.ok(purchaseInvoiceService.createInvoice(request));
    }
}
