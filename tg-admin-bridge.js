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

  window.TG_ADMIN_API = {
    setAdminKey: (key) => {
      if (key && String(key).trim()) {
        localStorage.setItem("tg_admin_key_override", String(key).trim());
      }
    },
    getAdminKey,
    bulkUploadBundle: async (bundle, questions) => {
      const res = await fetch(BASE + "/api/bundles/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": getAdminKey()
        },
        body: JSON.stringify({ bundle, questions })
      });
      return res.json();
    },
    getBundles: async (filters = {}) => {
      const url = new URL(BASE + "/api/bundles");
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v) !== "") {
          url.searchParams.set(k, String(v));
        }
      });
      const res = await fetch(url.toString());
      return res.json();
    }
  };
})();
