package ERP.Software.demo.business.service;

import ERP.Software.demo.business.model.Business;
import ERP.Software.demo.business.model.TenantScoped;
import ERP.Software.demo.business.repository.BusinessRepository;
import ERP.Software.demo.common.exception.BusinessException;
import ERP.Software.demo.user.model.UserAccount;
import ERP.Software.demo.user.repository.UserAccountRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Objects;

/**
 * Answers one question for the rest of the application: <em>which business is
 * this request acting for?</em>
 *
 * <p>The rules, in order:
 * <ol>
 *   <li>Nobody signed in - there is no tenant. Callers get an error rather than
 *       an empty list, because silently returning nothing hides bugs.</li>
 *   <li>A super admin who has switched into a business via
 *       {@code /api/businesses/{id}/enter} acts as <em>that</em> business.</li>
 *   <li>A super admin who has not switched acts across every business:
 *       {@link #idOrNull()} returns {@code null}, meaning "no filter".</li>
 *   <li>Everyone else acts for the business on their own user account, and the
 *       session override is ignored entirely.</li>
 * </ol>
 *
 * <p>{@link #id()} and {@link #check} both refuse to work when the answer is
 * "all businesses", so a code path that forgets to handle that case fails loudly
 * instead of quietly running unscoped.
 */
@Service
@RequiredArgsConstructor
public class TenantContext {

    /** Session key holding the business a super admin is currently looking into. */
    public static final String ACTING_BUSINESS = "actingBusinessId";

    private final UserAccountRepository userRepository;
    private final BusinessRepository businessRepository;

    /**
     * The business to filter by, or {@code null} for a super admin looking at
     * everything. Callers must treat {@code null} as "no business filter".
     */
    public Long idOrNull() {
        UserAccount user = currentUser();
        if (user == null) {
            throw new BusinessException("Not signed in");
        }
        if (user.isSuperAdmin()) {
            return actingBusinessId();   // null means "all businesses"
        }
        return user.getBusinessId();
    }

    /** As {@link #idOrNull()} but insisting there is exactly one business. */
    public Long id() {
        Long id = idOrNull();
        if (id == null) {
            throw new BusinessException(
                    "You are looking at every business at once. Open one business first.");
        }
        return id;
    }

    /**
     * The business whose <em>preferences</em> apply to this request.
     *
     * <p>Formatting settings - currency, decimals, language, the business name in the
     * topbar - have to come from somewhere even when a super admin is looking at every
     * business at once, because the layout reads them on every page. In that state
     * this falls back to the business the super admin themselves works for, which is a
     * real set of preferences rather than invented ones.
     *
     * <p>Reads only. Anything that <em>writes</em> uses {@link #id()} instead, so data
     * still cannot be created while no single business is in view.
     */
    public Long preferencesBusinessId() {
        Long id = idOrNull();
        if (id != null) return id;
        UserAccount user = currentUser();
        return user == null ? null : user.getBusinessId();
    }

    /** True when a super admin is currently looking into one specific business. */
    public boolean isImpersonating() {
        UserAccount user = currentUser();
        return user != null && user.isSuperAdmin() && actingBusinessId() != null;
    }

    public boolean isSuperAdmin() {
        UserAccount user = currentUser();
        return user != null && user.isSuperAdmin();
    }

    public Long actingBusinessId() {
        HttpServletRequest req = currentRequest();
        if (req == null) return null;
        HttpSession session = req.getSession(false);
        if (session == null) return null;
        Object v = session.getAttribute(ACTING_BUSINESS);
        return v instanceof Long l ? l : null;
    }

    /** Super admin only. A null {@code businessId} clears the override. */
    public void actAs(Long businessId) {
        HttpSession session = session();
        if (session != null) session.setAttribute(ACTING_BUSINESS, businessId);
    }

    public void clearActing() {
        HttpSession session = session();
        if (session != null) session.removeAttribute(ACTING_BUSINESS);
    }

    /**
     * Fails unless the row really belongs to the business being acted for. Every
     * get-by-id, update and delete should call this - without it a guessed id
     * reads another business's data even though the list endpoints are filtered.
     */
    public void check(Long rowBusinessId, String what) {
        Long mine = id();
        if (rowBusinessId == null || !Objects.equals(rowBusinessId, mine)) {
            throw new BusinessException("That " + what + " does not belong to your business.");
        }
    }

    /** Stamps a new row with the business being acted for. */
    public void stamp(TenantScoped row) {
        row.setBusinessId(id());
    }

    /**
     * The business a new row should belong to, as a full {@code Business} for
     * entities that hold a relation rather than a bare id (users).
     */
    public Business currentBusiness() {
        UserAccount user = currentUser();
        if (user == null) throw new BusinessException("Not signed in");
        // A super admin looking at all businesses has no single business to own a
        // new user, so they must pick one first - which is what the UI already does.
        Long businessId = id();
        return businessRepository.findById(businessId)
                .orElseThrow(() -> new BusinessException("That business no longer exists."));
    }

    /**
     * The business a super admin is currently looking into, or null.
     *
     * <p>Returns null for anyone else even if the session still holds a stale
     * override, so a demoted super admin does not keep seeing a banner for a
     * business they are no longer entitled to look into.
     */
    public Business actingBusiness() {
        if (!isSuperAdmin()) return null;
        Long id = actingBusinessId();
        return id == null ? null : businessRepository.findById(id).orElse(null);
    }

    /** The signed-in user account, or null when nobody is signed in. */
    public UserAccount currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(String.valueOf(auth.getPrincipal()))) {
            return null;
        }
        return userRepository.findByUsername(auth.getName()).orElse(null);
    }

    private static HttpSession session() {
        HttpServletRequest req = currentRequest();
        return req == null ? null : req.getSession(true);
    }

    private static HttpServletRequest currentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        return attrs instanceof ServletRequestAttributes s ? s.getRequest() : null;
    }
}