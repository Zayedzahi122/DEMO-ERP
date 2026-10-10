package ERP.Software.demo.inventory.controller;

import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.inventory.model.StockMovement;
import ERP.Software.demo.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock-movements")
@RequiredArgsConstructor
public class StockMovementController {

    private final StockMovementRepository stockMovementRepository;
    private final TenantContext tenant;

    @GetMapping
    public List<StockMovement> getAll(@RequestParam(required = false) Long productId) {
        Long businessId = tenant.idOrNull();
        if (businessId == null) {
            return productId != null
                    ? stockMovementRepository.findByProductIdOrderByDateDesc(productId)
                    : stockMovementRepository.findAllByOrderByDateDesc();
        }
        return productId != null
                ? stockMovementRepository.findByBusinessIdAndProductIdOrderByDateDesc(businessId, productId)
                : stockMovementRepository.findAllByBusinessIdOrderByDateDesc(businessId);
    }
}
