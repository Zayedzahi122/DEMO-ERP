package ERP.Software.demo.user.controller;

import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserAccount> getAll() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public UserAccount getOne(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    public ResponseEntity<UserAccount> create(@Valid @RequestBody UserAccount user) {
        return ResponseEntity.ok(userService.create(user));
    }

    @PutMapping("/{id}")
    public UserAccount update(@PathVariable Long id, @Valid @RequestBody UserAccount user) {
        return userService.update(id, user);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}