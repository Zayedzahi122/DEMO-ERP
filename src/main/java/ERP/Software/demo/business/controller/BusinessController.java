package ERP.Software.demo.business.controller;

import ERP.Software.demo.business.model.Business;
import ERP.Software.demo.business.service.BusinessService;
import ERP.Software.demo.business.service.TenantContext;
import ERP.Software.demo.common.exception.BusinessException;
import ERP.Software.demo.user.model.UserAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The Super Admin API. Everything here is super-admin only - enforced twice, by
 * {@code @PreAuthorize} and again inside {@link BusinessService}, because these
 * are the endpoints that decide who can see whose books.
 */
/**
 * The Super Admin API.
 *
 * <p>{@code /context} is deliberately the one endpoint any signed-in user can
 * reach: the sidebar needs to know whether to show the Super Admin link, and the
 * layout needs to know whether to show the "viewing as" banner. It reports
 * {@code superAdmin: false} rather than refusing, so a non-super admin simply
 * never sees either. Everything else requires {@code ROLE_SUPER_ADMIN}, checked
 * by {@code @PreAuthorize} here and again inside {@link BusinessService} for the
 * paths reachable from other Java code.
 */
@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;
    private final TenantContext tenant;

    // ------------------------------------------------------------------ session

    /** Who am I, and what am I looking at? */
    @GetMapping("/context")
    public Map<String, Object> context() {
        Map<String, Object> out = new LinkedHashMap<>();
        boolean superAdmin = tenant.isSuperAdmin();
        out.put("superAdmin", superAdmin);
        out.put("allBusinesses", superAdmin && tenant.actingBusinessId() == null);

        Business acting = tenant.actingBusiness();
        out.put("actingBusiness", acting == null ? null : businessService.describe(acting));

        UserAccount user = tenant.currentUser();
        if (user != null) {
            Business own = user.getBusiness();
            out.put("user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "fullName", user.getFullName() == null ? user.getUsername() : user.getFullName(),
                    "role", user.getRole() == null ? "" : user.getRole(),
                    "superAdmin", user.isSuperAdmin(),
                    "businessId", user.getBusinessId() == null ? -1L : user.getBusinessId(),
                    "businessName", own == null ? null : own.getName()
            ));
        }
        return out;
    }

    /** Which business am I acting for? Fails when looking at all of them, because there is no single answer. */
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/current")
    public Map<String, Object> current() {
        if (!tenant.isSuperAdmin()) {
            throw new BusinessException("Only a super admin can switch businesses this way.");
        }
        Business acting = tenant.actingBusiness();
        if (acting == null) {
            throw new BusinessException("You are not inside a business.");
        }
        return businessService.describe(acting);
    }

    // ------------------------------------------------------------------ registry

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping
    public List<Map<String, Object>> findAll() {
        return businessService.findAll().stream().map(businessService::describe).toList();
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/{id}")
    public Map<String, Object> getOne(@PathVariable Long id) {
        return businessService.describe(businessService.findById(id));
    }

    /** Create form, including the first user, so the new business is usable immediately. */
    public record CreateRequest(String name, String code, String legalName, String address,
                                String phone, String email, String vatNo, String locations,
                                Boolean active,
                                String username, String password, String fullName,
                                String userRole) {
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping
    public Map<String, Object> create(@RequestBody CreateRequest request) {
        Business form = Business.builder()
                .name(request.name())
                .code(request.code())
                .legalName(request.legalName())
                .address(request.address())
                .phone(request.phone())
                .email(request.email())
                .vatNo(request.vatNo())
                .locations(request.locations())
                .active(request.active() == null || request.active())
                .build();

        BusinessService.NewUser firstUser = request.username() == null || request.username().isBlank()
                ? null
                : new BusinessService.NewUser(request.username(), request.password(),
                        request.fullName(), request.email(), null,
                        request.userRole() == null ? "Administrator" : request.userRole(),
                        null, null);

        return businessService.describe(businessService.create(form, firstUser));
    }

    public record UpdateRequest(String name, String code, String legalName, String address,
                                String phone, String email, String vatNo, String locations,
                                Boolean active) {
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody UpdateRequest request) {
        Business form = Business.builder()
                .name(request.name())
                .code(request.code())
                .legalName(request.legalName())
                .address(request.address())
                .phone(request.phone())
                .email(request.email())
                .vatNo(request.vatNo())
                .locations(request.locations())
                .active(request.active() == null || request.active())
                .build();
        return businessService.describe(businessService.update(id, form));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/{id}/active")
    public Map<String, Object> setActive(@PathVariable Long id, @RequestBody ActiveRequest request) {
        boolean active = Boolean.TRUE.equals(request.active());
        return businessService.describe(businessService.setActive(id, active));
    }

    public record ActiveRequest(Boolean active) {
    }

    /**
     * Delete is refused once a business holds records; the message says so. That is
     * deliberate - "delete" on a business with books is not something this app can
     * do honestly, and pretending otherwise would lose data.
     */
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        businessService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ users

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/{id}/users")
    public List<Map<String, Object>> users(@PathVariable Long id) {
        businessService.findById(id);   // 404 if the business does not exist
        return businessService.usersOf(id);
    }

    public record UserRequest(String username, String password, String fullName, String email,
                              String phone, String role, String branch, String modules,
                              Boolean active) {
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/{id}/users")
    public Map<String, Object> addUser(@PathVariable Long id, @RequestBody UserRequest request) {
        Business business = businessService.findById(id);
        UserAccount user = businessService.addUser(business, new BusinessService.NewUser(
                request.username(), request.password(), request.fullName(), request.email(),
                request.phone(), request.role(), request.branch(), request.modules()));
        return businessService.describeUser(user);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PutMapping("/{id}/users/{userId}")
    public Map<String, Object> updateUser(@PathVariable Long id, @PathVariable Long userId,
                                          @RequestBody UserRequest request) {
        UserAccount user = businessService.updateUser(id, userId, new BusinessService.NewUser(
                request.username(), request.password(), request.fullName(), request.email(),
                request.phone(), request.role(), request.branch(), request.modules()),
                request.active());
        return businessService.describeUser(user);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/{id}/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, @PathVariable Long userId) {
        businessService.deleteUser(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------------------------ impersonation

    /** Switch this session into a business, so every page behaves as if you worked there. */
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/{id}/enter")
    public Map<String, Object> enter(@PathVariable Long id) {
        return businessService.describe(businessService.enter(id));
    }

    /** Step back out to the across-everything view. */
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/leave")
    public ResponseEntity<Void> leave() {
        businessService.leave();
        return ResponseEntity.noContent().build();
    }
}
