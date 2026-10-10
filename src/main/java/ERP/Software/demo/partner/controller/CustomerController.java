package ERP.Software.demo.partner.controller;

import ERP.Software.demo.business.service.TenantContext;
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
    private final TenantContext tenant;

    @GetMapping
    public List<Customer> getAll() {
        Long businessId = tenant.idOrNull();
        return businessId == null
                ? customerRepository.findAllByOrderByNameAsc()
                : customerRepository.findAllByBusinessIdOrderByNameAsc(businessId);
    }

    @GetMapping("/{id}")
    public Customer getOne(@PathVariable Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
        tenant.check(customer.getBusinessId(), "customer");
        return customer;
    }

    @PostMapping
    public ResponseEntity<Customer> create(@Valid @RequestBody Customer customer) {
        tenant.stamp(customer);
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
