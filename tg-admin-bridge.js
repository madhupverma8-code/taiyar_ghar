(function () {
  const cfg = window.TAIYARIGHAR_CONFIG || {};
  const BASE = (cfg.API_BASE_URL || "https://taiyarighar-api.taiyarighar.workers.dev").replace(/\/+$/, "");

  function getAdminKey() {
    return (
      localStorage.getItem("tg_admin_key_override") ||
      cfg.ADMIN_API_KEY ||
      "TG_ADMIN_2026_3026_SECURE"
    );
  }

  async function adminPost(path, body = {}) {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": getAdminKey()
      },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  window.TG_ADMIN_API = {
    setAdminKey: (key) => {
      if (key && String(key).trim()) localStorage.setItem("tg_admin_key_override", String(key).trim());
    },
    getAdminKey,
    bulkUploadBundle: (bundle, questions) => adminPost("/api/bundles/bulk", { bundle, questions }),
    deleteBundles: (bundleIds) => adminPost("/api/bundles/delete", { bundle_ids: bundleIds }),
    saveMockTest: (payload) => adminPost("/api/tests", payload),
    deleteMockTest: (testId) => adminPost("/api/tests/delete", { test_id: testId }),
    getTests: async (testId = "") => {
      const url = new URL(BASE + "/api/tests");
      if (testId) url.searchParams.set("test_id", testId);
      const res = await fetch(url.toString());
      return res.json();
    },
    getBundles: async (filters = {}) => {
      const url = new URL(BASE + "/api/bundles");
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") url.searchParams.set(k, String(v));
      });
      const res = await fetch(url.toString());
      return res.json();
    }
  };
})();
