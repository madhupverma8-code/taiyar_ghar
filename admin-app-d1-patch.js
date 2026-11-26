window.TG_Admin_D1 = {
  async uploadBundleBatch(bundleMeta, questionList) {
    if (!window.TG_ADMIN_API) return { ok: false, error: "Admin bridge not loaded" };
    return window.TG_ADMIN_API.bulkUploadBundle(bundleMeta, questionList);
  },
  async listBundles(filters = {}) {
    if (!window.TG_ADMIN_API) return [];
    const res = await window.TG_ADMIN_API.getBundles(filters);
    return (res && res.bundles) ? res.bundles : [];
  }
};
