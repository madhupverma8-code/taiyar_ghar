(function () {
  const cfg = window.TAIYARIGHAR_CONFIG || {};
  const BASE = (cfg.API_BASE_URL || "https://taiyarighar-api.taiyarighar.workers.dev").replace(/\/+$/, "");

  async function apiGet(path, params = {}) {
    const url = new URL(BASE + path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== "") {
        url.searchParams.set(k, String(v));
      }
    });
    const res = await fetch(url.toString(), { method: "GET" });
    return res.json();
  }

  async function apiPost(path, body = {}, extraHeaders = {}) {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  function getOrCreateDeviceId() {
    const key = "tg_device_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ("dev-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
      localStorage.setItem(key, id);
    }
    return id;
  }

  window.TG_STUDENT_API = {
    health: () => apiGet("/health"),
    getBundles: (filters = {}) => apiGet("/api/bundles", filters),
    getQuestions: (filters = {}, isPaid = false) => {
      const preview = isPaid ? "0" : "1";
      return apiGet("/api/questions", { ...filters, preview });
    },
    loginStudent: async (loginId, passwordHash) => {
      const data = await apiPost("/api/student/login", {
        login_id: loginId,
        password_hash: passwordHash,
        device_id: getOrCreateDeviceId()
      });
      if (data && data.ok) {
        localStorage.setItem("tg_session_token", data.session_token || "");
        localStorage.setItem("tg_student_profile", JSON.stringify(data.student || {}));
      }
      return data;
    },
    getTests: () => apiGet("/api/tests"),
    submitResult: (payload) => apiPost("/api/results", payload),
    getContent: (type = "") => apiGet("/api/content", type ? { type } : {})
  };
})();
