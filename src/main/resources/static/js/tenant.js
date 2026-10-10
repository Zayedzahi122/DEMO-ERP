/* EDY ERP — Tenant/super-admin state, shared by the layout and the Super Admin page */
window.EDY = window.EDY || {};

EDY.tenant = (() => {

  /** Cached by layout.js at boot. Null until /api/businesses/context answers. */
  function ctx() {
    return window.EDY.tenant.ctx || null;
  }

  function isSuperAdmin() {
    return !!(ctx() && ctx().superAdmin);
  }

  /** True when the session is looking into one specific business. */
  function isActing() {
    return !!(ctx() && ctx().actingBusiness);
  }

  function actingName() {
    var a = ctx() && ctx().actingBusiness;
    return a ? a.name : null;
  }

  /**
   * Whether the current page is showing one company's data or every company's.
   * Pages use this to label totals rather than silently mixing them.
   */
  function spansAll() {
    return isSuperAdmin() && !isActing();
  }

  /**
   * The business name for a row, used to add a Business column when a super admin
   * is looking at everything. Resolved against a name->id map the caller already
   * has, so this never has to fetch.
   */
  function nameOf(businessId, nameById) {
    if (businessId === null || businessId === undefined) return '—';
    return (nameById && nameById[businessId]) || ('Business #' + businessId);
  }

  /** Switches the session into a business. */
  async function enter(id) {
    await EDY.api.post('/api/businesses/' + id + '/enter');
  }

  /** Steps back out to seeing every business. */
  async function leave() {
    await EDY.api.post('/api/businesses/leave');
  }

  async function refresh() {
    window.EDY.tenant.ctx = await EDY.api.get('/api/businesses/context');
    return window.EDY.tenant.ctx;
  }

  return {
    ctx, isSuperAdmin, isActing, actingName, spansAll, nameOf,
    enter, leave, refresh
  };
})();
