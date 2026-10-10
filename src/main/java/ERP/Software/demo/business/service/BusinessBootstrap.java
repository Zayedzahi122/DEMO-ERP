package ERP.Software.demo.business.service;

import ERP.Software.demo.accounting.repository.FundTransferRepository;
import ERP.Software.demo.accounting.repository.LedgerEntryRepository;
import ERP.Software.demo.accounting.repository.PaymentAccountRepository;
import ERP.Software.demo.business.model.Business;
import ERP.Software.demo.business.model.TenantScoped;
import ERP.Software.demo.business.repository.BusinessRepository;
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
import ERP.Software.demo.setting.service.SettingsService;
import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Puts the pre-existing, single-company data inside a business, and makes one
 * account the platform's first super admin.
 *
 * <p>Before multi-tenancy, {@code products} and friends had no business column at
 * all. Those rows have to belong to <em>someone</em>, and the only defensible
 * answer is the company that was already running the system. So this creates a
 * default business when none exists, points every unclaimed row at it, and gives
 * it to the existing accounts.
 *
 * <p>It runs on every boot and does nothing the second time, which matters
 * because a mistake here would hide every record in the system.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class BusinessBootstrap implements ApplicationRunner {

    /** Name given to the business that owns whatever data existed before. */
    static final String DEFAULT_NAME = "My Business";

    private final BusinessRepository businessRepository;
    private final UserAccountRepository userRepository;
    private final SettingsService settingsService;

    /** Read only, to tell a business that already has settings from one that has none. */
    private final SystemSettingRepository systemSettingRepository;

    /** Used only to rewrite the settings primary key, which JPA will not let us change. */
    private final EntityManager em;

    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final CategoryRepository categoryRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final QuotationRepository quotationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final PaymentAccountRepository paymentAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final FundTransferRepository fundTransferRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<UserAccount> users = userRepository.findAll();
        Business target = homeBusiness(users);
        if (target == null) return;   // genuinely nothing installed yet

        List<String> adopted = new ArrayList<>();
        adopt(productRepository::findAll, productRepository::saveAll, target.getId(), adopted, "products");
        adopt(customerRepository::findAll, customerRepository::saveAll, target.getId(), adopted, "customers");
        adopt(supplierRepository::findAll, supplierRepository::saveAll, target.getId(), adopted, "suppliers");
        adopt(departmentRepository::findAll, departmentRepository::saveAll, target.getId(), adopted, "departments");
        adopt(employeeRepository::findAll, employeeRepository::saveAll, target.getId(), adopted, "employees");
        adopt(categoryRepository::findAll, categoryRepository::saveAll, target.getId(), adopted, "categories");
        adopt(salesInvoiceRepository::findAll, salesInvoiceRepository::saveAll, target.getId(), adopted, "sales invoices");
        adopt(purchaseInvoiceRepository::findAll, purchaseInvoiceRepository::saveAll, target.getId(), adopted, "purchase invoices");
        adopt(quotationRepository::findAll, quotationRepository::saveAll, target.getId(), adopted, "quotations");
        adopt(stockMovementRepository::findAll, stockMovementRepository::saveAll, target.getId(), adopted, "stock movements");
        adopt(paymentAccountRepository::findAll, paymentAccountRepository::saveAll, target.getId(), adopted, "payment accounts");
        adopt(ledgerEntryRepository::findAll, ledgerEntryRepository::saveAll, target.getId(), adopted, "ledger entries");
        adopt(fundTransferRepository::findAll, fundTransferRepository::saveAll, target.getId(), adopted, "fund transfers");
        adoptUsers(target, users);
        adoptSettings(target);
        backfillProfileSettings();

        if (!adopted.isEmpty()) {
            log.info("Assigned existing data to business '{}' (id {}): {}",
                    target.getName(), target.getId(), String.join(", ", adopted));
        }
        settingsService.refreshAll();
    }

    /**
     * Gives every business its own name/address/phone settings, if it has none.
     *
     * <p>{@code BusinessService.create} seeds these for new businesses, but a business
     * created before that existed has no identity settings at all, so every page fell
     * back to the built-in defaults and made it look like it had copied another
     * company's details. Only businesses with no stored profile are touched, so this
     * never overwrites anything anybody has set, and re-running it is a no-op.
     */
    private void backfillProfileSettings() {
        for (Business b : businessRepository.findAll()) {
            if (systemSettingRepository.countByBusinessId(b.getId()) > 0) continue;
            settingsService.seedProfile(b.getId(), b.getName(), b.getLegalName(),
                    b.getAddress(), b.getPhone(), b.getVatNo());
            log.info("Seeded identity settings for business '{}' (id {})", b.getName(), b.getId());
        }
    }

    /**
     * The business that should own legacy data: the oldest one, or a freshly
     * created default when there are accounts but no business at all.
     *
     * <p>Creating that default is not optional. On the first boot after multi-tenancy
     * was added, {@code businesses} is empty while {@code users} is not; without a
     * business every existing account would have a null one, and every page would
     * refuse to load - a lockout with no way back in.
     */
    private Business homeBusiness(List<UserAccount> users) {
        List<Business> existing = businessRepository.findAll();
        if (!existing.isEmpty()) {
            return existing.stream()
                    .min((a, b) -> createdAt(a).compareTo(createdAt(b)))
                    .orElseThrow();
        }
        if (users.isEmpty()) {
            log.info("No businesses and no users yet - waiting for the first account.");
            return null;
        }
        Business created = businessRepository.save(Business.builder()
                .name(DEFAULT_NAME)
                .active(true)
                .createdAt(LocalDateTime.now())
                .build());
        log.info("Created business '{}' (id {}) to hold the {} account(s) already installed",
                DEFAULT_NAME, created.getId(), users.size());
        return created;
    }

    private static LocalDateTime createdAt(Business b) {
        return b.getCreatedAt() == null ? LocalDateTime.MIN : b.getCreatedAt();
    }

    /** Stamps every row that has no business yet, and records how many moved. */
    private <T extends TenantScoped> void adopt(Supplier<List<T>> findAll,
                                                Function<List<T>, List<T>> saveAll,
                                                Long businessId, List<String> moved, String label) {
        List<T> all;
        try {
            all = findAll.get();
        } catch (RuntimeException e) {
            // One unreachable table must not stop the rest being adopted, or the
            // app would come up with half the data invisible.
            log.warn("Skipped '{}' during adoption: {}", label, e.getMessage());
            return;
        }
        List<T> orphans = all.stream().filter(r -> r.getBusinessId() == null).toList();
        if (orphans.isEmpty()) return;
        orphans.forEach(row -> row.setBusinessId(businessId));
        saveAll.apply(orphans);
        moved.add(label + " (" + orphans.size() + ")");
    }

    /**
     * Puts existing accounts inside the business, and makes the oldest active
     * Administrator a super admin so somebody can actually reach the Super Admin
     * page. Without this step the feature would exist but be unreachable.
     */
    private void adoptUsers(Business business, List<UserAccount> users) {
        List<UserAccount> orphans = users.stream().filter(u -> u.getBusinessId() == null).toList();

        if (userRepository.countBySuperAdminTrue() == 0) {
            orphans.stream()
                    .filter(UserAccount::isActive)
                    .filter(u -> "Administrator".equalsIgnoreCase(u.getRole()))
                    .min((a, b) -> Long.compare(a.getId(), b.getId()))
                    .ifPresent(u -> {
                        u.setSuperAdmin(true);
                        log.info("Promoted '{}' to super admin so the Super Admin page is reachable",
                                u.getUsername());
                    });
        }
        orphans.forEach(u -> u.setBusiness(business));
        if (!orphans.isEmpty()) userRepository.saveAll(orphans);
    }

    /**
     * Rewrites legacy settings keys into the per-business form. Keys used to be
     * bare ("money.scale"); they are now "&lt;businessId&gt;|money.scale", with the
     * bare name kept in its own column for lookups.
     *
     * <p>Done in SQL rather than through JPA because {@code setting_key} is the
     * primary key, and Hibernate rightly refuses to let an already-managed entity's
     * identifier change underneath it. Rows still carrying a null {@code business_id}
     * are exactly the un-migrated ones, so that is the marker used here.
     */
    private void adoptSettings(Business business) {
        Long businessId = business.getId();

        int stamped = em.createNativeQuery(
                        "UPDATE system_settings SET setting_name = setting_key, business_id = :b " +
                        "WHERE business_id IS NULL")
                .setParameter("b", businessId)
                .executeUpdate();
        if (stamped == 0) return;

        // Second pass changes the key itself, built from the name saved above so it
        // never reads a key that has already been rewritten.
        int renamed = em.createNativeQuery(
                        "UPDATE system_settings SET setting_key = CONCAT(:b, '|', setting_name) " +
                        "WHERE business_id = :b AND setting_key = setting_name")
                .setParameter("b", businessId.toString())
                .executeUpdate();

        log.info("Moved {} setting(s) into business '{}'", renamed, business.getName());
    }
}
