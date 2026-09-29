package ERP.Software.demo.partner.controller;

import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.partner.model.Customer;
import ERP.Software.demo.partner.repository.CustomerRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepository;

    @GetMapping
    public List<Customer> getAll() {
        return customerRepository.findAll();
    }

    @GetMapping("/{id}")
    public Customer getOne(@PathVariable Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
    }

    @PostMapping
    public ResponseEntity<Customer> create(@Valid @RequestBody Customer customer) {
        return ResponseEntity.ok(customerRepository.save(customer));
    }

    @PutMapping("/{id}")
    public Customer update(@PathVariable Long id, @Valid @RequestBody Customer updated) {
        Customer existing = getOne(id);
        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setAddress(updated.getAddress());
        return customerRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        customerRepository.delete(getOne(id));
        return ResponseEntity.noContent().build();
    }
}
