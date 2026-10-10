package ERP.Software.demo.business.model;

/**
 * Implemented by every entity whose rows belong to exactly one business.
 *
 * <p>Nothing enforces this at runtime - it exists so the scoping code can be
 * written once against the interface and so it is obvious which tables are
 * tenant-scoped and which (invoice lines, payments) inherit their scope from
 * their parent document.
 */
public interface TenantScoped {

    Long getBusinessId();

    void setBusinessId(Long businessId);
}