package ERP.Software.demo.inventory.controller;

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

    @GetMapping
    public List<StockMovement> getAll(@RequestParam(required = false) Long productId) {
        if (productId != null) {
            return stockMovementRepository.findByProductIdOrderByDateDesc(productId);
        }
        return stockMovementRepository.findAllByOrderByDateDesc();
    }
}