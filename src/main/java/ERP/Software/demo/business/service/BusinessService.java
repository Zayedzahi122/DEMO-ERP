package ERP.Software.demo.business.service;

import ERP.Software.demo.accounting.repository.FundTransferRepository;
import ERP.Software.demo.accounting.repository.LedgerEntryRepository;
import ERP.Software.demo.accounting.repository.PaymentAccountRepository;
import ERP.Software.demo.business.model.Business;
import ERP.Software.demo.business.repository.BusinessRepository;
import ERP.Software.demo.common.exception.BusinessException;
import ERP.Software.demo.common.exception.ResourceNotFoundException;
import ERP.Software.demo.hr.repository.DepartmentRepository;
import ERP.Software.demo.hr.repository.EmployeeRepository;
import ERP.Software.demo.inventory.repository.CategoryRepository;
import ERP.Software.demo.inventory.repository.ProductRepository;
import ERP.Software.demo.inventory.repository.StockMovementRepository;
import ERP.Software.demo.partner.repository.CustomerRepository;
import ERP.Software.demo.partner.repository.SupplierRepository;
import ERP.Software.demo.purchase.repository.PurchaseInvoiceRepository;
import ERP.Software.demo.quotation.repository.QuotationRepository;
import ERP.Software.demo.sales.repository.SalesInvoiceRepository;
import ERP.Software.demo.setting.repository.SystemSettingRepository;
import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Everything the Super Admin page needs: the registry of businesses, their people,
 * and switching into one to look around.
 *
 * <p>Nothing here trusts the caller. Every method re-checks super admin, because
 * these endpoints are the most privileged in the application and a missing
 * {@code @PreAuthorize} would be the only thing standing between one company's
 * data and another.
 */
@Service
@RequiredArgsConstructor
public class BusinessService {

    private static final int MAX_CODE_LENGTH = 32;

    private final BusinessRepository businessRepository;
    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantContext tenant;
    /**
     * Only for seeding and re-syncing a business's own identity settings, which are
     * written for an explicit business rather than the one being acted for.
     */
    private final ERP.Software.demo.setting.service.SettingsService settingsService;

    // Repositories used only to count what a business owns, so the UI can refuse
    // to delete a business that still has history instead of orphaning it.
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final CategoryRepository categoryRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final QuotationRepository quotationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PaymentAccountRepository paymentAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final FundTransferRepository fundTransferRepository;
    private final SystemSettingRepository systemSettingRepository;

    // ------------------------------------------------------------------ listing

    public List<Business> findAll() {
        requireSuperAdmin();
        return businessRepository.findAllByOrderByNameAsc();
    }

    public Business findById(Long id) {
        requireSuperAdmin();
        return businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found: " + id));
    }

    /** One business with its row counts and user count, for the table and the detail view. */
    public Map<String, Object> describe(Business business) {
        Long id = business.getId();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", id);
        out.put("name", business.getName());
        out.put("code", business.getCode());
        out.put("legalName", business.getLegalName());
        out.put("address", business.getAddress());
        out.put("phone", business.getPhone());
        out.put("email", business.getEmail());
        out.put("vatNo", business.getVatNo());
        out.put("locations", locationsList(business.getLocations()));
        out.put("active", business.isActive());
        out.put("createdAt", business.getCreatedAt());
        out.put("updatedAt", business.getUpdatedAt());
        out.put("userCount", userRepository.countByBusiness_Id(id));
        out.put("counts", counts(id));
        return out;
    }

    /** Locations as a clean list, one entry per line of the stored text. */
    public List<String> locationsList(String raw) {
        if (raw == null || raw.isBlank()) return new ArrayList<>();
        return Arrays.stream(raw.split("\n"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /** How much history a business has, which decides whether it can be deleted. */
    public Map<String, Long> counts(Long businessId) {
        Map<String, Long> c = new LinkedHashMap<>();
        c.put("users", userRepository.countByBusiness_Id(businessId));
        c.put("products", productRepository.countByBusinessId(businessId));
        c.put("customers", customerRepository.countByBusinessId(businessId));
        c.put("suppliers", supplierRepository.countByBusinessId(businessId));
        c.put("employees", employeeRepository.countByBusinessId(businessId));
        c.put("departments", departmentRepository.countByBusinessId(businessId));
        c.put("categories", categoryRepository.countByBusinessId(businessId));
        c.put("salesInvoices", salesInvoiceRepository.countByBusinessId(businessId));
        c.put("purchaseInvoices", purchaseInvoiceRepository.countByBusinessId(businessId));
        c.put("quotations", quotationRepository.countByBusinessId(businessId));
        c.put("stockMovements", stockMovementRepository.countByBusinessId(businessId));
        c.put("paymentAccounts", paymentAccountRepository.countByBusinessId(businessId));
        c.put("ledgerEntries", ledgerEntryRepository.countByBusinessId(businessId));
        c.put("fundTransfers", fundTransferRepository.countByBusinessId(businessId));
        c.put("settings", systemSettingRepository.countByBusinessId(businessId));
        return c;
    }

    /**
     * Everything the business owns apart from users, for the delete confirmation.
     *
     * <p>Settings are deliberately excluded. Every business has them - they are created
     * with the business so it can display its own name - and they are configuration
     * rather than history, so counting them would mean a business that had never made
     * a single sale could never be deleted. They are removed on delete instead.
     */
    public long totalRecords(Long businessId) {
        return counts(businessId).entrySet().stream()
                .filter(e -> !"users".equals(e.getKey()))
                .filter(e -> !"settings".equals(e.getKey()))
                .mapToLong(Map.Entry::getValue)
                .sum();
    }

    // ------------------------------------------------------------------ create

    /**
     * Creates a business and, if asked, its first user. Both happen together: a
     * business nobody can sign in to is a dead end, and a user with nowhere to
     * sign in to is worse.
     *
     * <p>The new business's own details are also copied into its settings, so opening
     * it shows its name on the topbar and receipts instead of falling back to
     * defaults that belong to no particular company.
     */
    @Transactional
    public Business create(Business form, NewUser firstUser) {
        requireSuperAdmin();
        Business business = Business.builder()
                .name(clean(form.getName(), "Business name"))
                .code(normaliseCode(form.getCode(), null))
                .legalName(blankToNull(form.getLegalName()))
                .address(blankToNull(form.getAddress()))
                .phone(blankToNull(form.getPhone()))
                .email(blankToNull(form.getEmail()))
                .vatNo(blankToNull(form.getVatNo()))
                .locations(blankToNull(form.getLocations()))
                .active(form.isActive())
                .createdAt(LocalDateTime.now())
                .build();
        Business saved = businessRepository.save(business);

        settingsService.seedProfile(saved.getId(), saved.getName(), saved.getLegalName(),
                saved.getAddress(), saved.getPhone(), saved.getVatNo());

        if (firstUser != null) {
            addUser(saved, firstUser);
        }
        return saved;
    }

    // ------------------------------------------------------------------ update

    @Transactional
    public Business update(Long id, Business form) {
        requireSuperAdmin();
        Business existing = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found: " + id));

        // Kept so the settings can be re-synced only where they have not been customised.
        String wasName = existing.getName();
        String wasLegalName = existing.getLegalName();
        String wasAddress = existing.getAddress();
        String wasPhone = existing.getPhone();
        String wasVatNo = existing.getVatNo();

        existing.setName(clean(form.getName(), "Business name"));
        existing.setCode(normaliseCode(form.getCode(), id));
        existing.setLegalName(blankToNull(form.getLegalName()));
        existing.setAddress(blankToNull(form.getAddress()));
        existing.setPhone(blankToNull(form.getPhone()));
        existing.setEmail(blankToNull(form.getEmail()));
        existing.setVatNo(blankToNull(form.getVatNo()));
        existing.setLocations(blankToNull(form.getLocations()));
        existing.setActive(form.isActive());
        existing.setUpdatedAt(LocalDateTime.now());
        Business saved = businessRepository.save(existing);

        settingsService.syncProfile(id,
                wasName, wasLegalName, wasAddress, wasPhone, wasVatNo,
                saved.getName(), saved.getLegalName(), saved.getAddress(),
                saved.getPhone(), saved.getVatNo());
        return saved;
    }

    /**
     * Flips a business on or off. Turning one off is the safe way to stop people
     * getting in: the history stays, its users keep existing but cannot log in, and
     * switching back on restores access with nothing to recreate.
     */
    @Transactional
    public Business setActive(Long id, boolean active) {
        requireSuperAdmin();
        Business existing = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found: " + id));
        existing.setActive(active);
        existing.setUpdatedAt(LocalDateTime.now());
        return businessRepository.save(existing);
    }

    // ------------------------------------------------------------------ delete

    /**
     * Deletes a business. Refuses outright once it owns any records, because the
     * alternatives - cascading, or leaving rows pointing at nothing - either
     * destroy a company's books silently or corrupt them. Deactivate first if you
     * only want to stop people getting in.
     */
    @Transactional
    public void delete(Long id) {
        requireSuperAdmin();
        Business existing = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found: " + id));

        long records = totalRecords(id);
        if (records > 0) {
            throw new BusinessException(
                    "'" + existing.getName() + "' still holds " + records
                    + " record(s). Deactivate it instead if you only want to close it - "
                    + "deleting a business's history cannot be undone.");
        }
        if (userRepository.countByBusiness_Id(id) > 0) {
            throw new BusinessException(
                    "'" + existing.getName() + "' still has users. Remove them first.");
        }
        // Its settings go with it. They are excluded from totalRecords() so they do not
        // block the delete, which means leaving them behind would strand rows pointing
        // at a business that no longer exists.
        systemSettingRepository.deleteByBusinessId(id);
        businessRepository.delete(existing);
    }

    // ------------------------------------------------------------------ users

    public List<Map<String, Object>> usersOf(Long businessId) {
        requireSuperAdmin();
        return userRepository.findByBusiness_IdOrderByUsernameAsc(businessId).stream()
                .map(this::describeUser)
                .toList();
    }

    public Map<String, Object> describeUser(UserAccount user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("username", user.getUsername());
        m.put("fullName", user.getFullName());
        m.put("email", user.getEmail());
        m.put("phone", user.getPhone());
        m.put("role", user.getRole());
        m.put("branch", user.getBranch());
        m.put("modules", user.getModules());
        m.put("active", user.isActive());
        m.put("superAdmin", user.isSuperAdmin());
        m.put("lastLogin", user.getLastLogin());
        m.put("businessId", user.getBusinessId());
        m.put("businessName", user.getBusiness() == null ? null : user.getBusiness().getName());
        return m;
    }

    /** A small form model; kept separate from the entity so no password can leak back out. */
    public record NewUser(String username, String password, String fullName,
                          String email, String phone, String role, String branch, String modules) {
    }

    @Transactional
    public UserAccount addUser(Business business, NewUser form) {
        requireSuperAdmin();
        String username = clean(form.username(), "Username");
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("The username '" + username + "' is already taken.");
        }
        String password = form.password() == null ? "" : form.password();
        if (password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }
        UserAccount user = UserAccount.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .fullName(blankToNull(form.fullName()))
                .email(blankToNull(form.email()))
                .phone(blankToNull(form.phone()))
                .role(form.role() == null || form.role().isBlank() ? "Cashier" : form.role())
                .branch(blankToNull(form.branch()))
                .modules(blankToNull(form.modules()))
                .active(true)
                .business(business)
                .build();
        return userRepository.save(user);
    }

    /**
     * Edits someone who works in the given business. The business on the account is
     * never changed - moving a person between businesses is a deliberate act done
     * by deleting and recreating them, so their audit trail does not follow them.
     */
    @Transactional
    public UserAccount updateUser(Long businessId, Long userId, NewUser form, Boolean active) {
        requireSuperAdmin();
        UserAccount user = userRepository.findById(userId)
                .filter(u -> java.util.Objects.equals(u.getBusinessId(), businessId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User " + userId + " does not work for that business."));

        String username = clean(form.username(), "Username");
        Optional<UserAccount> clash = userRepository.findByUsername(username);
        if (clash.isPresent() && !clash.get().getId().equals(userId)) {
            throw new IllegalArgumentException("The username '" + username + "' is already taken.");
        }
        user.setUsername(username);
        user.setFullName(blankToNull(form.fullName()));
        user.setEmail(blankToNull(form.email()));
        user.setPhone(blankToNull(form.phone()));
        user.setRole(form.role() == null || form.role().isBlank() ? user.getRole() : form.role());
        user.setBranch(blankToNull(form.branch()));
        user.setModules(blankToNull(form.modules()));
        if (active != null) {
            if (!active && user.isSuperAdmin() && userRepository.countBySuperAdminTrue() <= 1) {
                throw new IllegalStateException("This is the only super admin; deactivating them would lock everyone out.");
            }
            user.setActive(active);
        }
        if (form.password() != null && !form.password().isBlank()) {
            if (form.password().length() < 6) {
                throw new IllegalArgumentException("Password must be at least 6 characters.");
            }
            user.setPassword(passwordEncoder.encode(form.password()));
        }
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long businessId, Long userId) {
        requireSuperAdmin();
        UserAccount user = userRepository.findById(userId)
                .filter(u -> java.util.Objects.equals(u.getBusinessId(), businessId))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User " + userId + " does not work for that business."));
        if (user.isSuperAdmin() && userRepository.countBySuperAdminTrue() <= 1) {
            throw new IllegalStateException("This is the only super admin; deleting them would lock everyone out.");
        }
        userRepository.delete(user);
    }

    // ------------------------------------------------------------------ impersonation

    /**
     * Switches the current session into a business, so every other page behaves as
     * if the caller worked there. It is refused for an inactive business, and the
     * session records who did it and when.
     */
    @Transactional
    public Business enter(Long id) {
        requireSuperAdmin();
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found: " + id));
        if (!business.isActive()) {
            throw new BusinessException("'" + business.getName()
                    + "' is deactivated. Nobody can sign in to it until it is switched back on.");
        }
        tenant.actAs(id);
        return business;
    }

    /** Steps back out, returning to the across-everything view. */
    public void leave() {
        requireSuperAdmin();
        tenant.clearActing();
    }

    // ------------------------------------------------------------------ guards

    /**
     * Every privileged method calls this. Kept as a plain check rather than only an
     * annotation so it also covers the ones called from other Java code.
     */
    private void requireSuperAdmin() {
        if (!tenant.isSuperAdmin()) {
            throw new BusinessException("Only a super admin can do that.");
        }
    }

    // ------------------------------------------------------------------ helpers

    /** Uppercases and trims a business code, and rejects one already in use. */
    private String normaliseCode(String raw, Long selfId) {
        if (raw == null || raw.isBlank()) return null;
        String code = raw.trim().toUpperCase(Locale.ROOT);
        if (code.length() > MAX_CODE_LENGTH) {
            throw new IllegalArgumentException(
                    "Business code must be " + MAX_CODE_LENGTH + " characters or fewer.");
        }
        if (!code.matches("[A-Z0-9][A-Z0-9-]*")) {
            throw new IllegalArgumentException(
                    "Business code may use letters, digits and hyphens only.");
        }
        businessRepository.findByCodeIgnoreCase(code).ifPresent(other -> {
            if (!other.getId().equals(selfId)) {
                throw new IllegalArgumentException("Business code '" + code + "' is already in use.");
            }
        });
        return code;
    }

    private static String clean(String value, String label) {
        String v = value == null ? "" : value.trim();
        if (v.isEmpty()) throw new IllegalArgumentException(label + " is required.");
        return v;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
