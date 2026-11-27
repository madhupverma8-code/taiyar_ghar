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
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  window.TG_STUDENT_API = {
    health: () => apiGet("/health"),
    getBundles: (filters = {}) => apiGet("/api/bundles", filters),
    getQuestions: (filters = {}, isPaid = false) => {
      const preview = isPaid ? "0" : "1";
      return apiGet("/api/questions", { ...filters, preview });
    },
    registerStudent: (payload) => apiPost("/api/student/register", payload),
    loginStudent: (loginId, passwordHash, deviceId) =>
      apiPost("/api/student/login", { login_id: loginId, password_hash: passwordHash, device_id: deviceId }),
    getProgress: (loginId) => apiGet("/api/progress", { login_id: loginId }),
    saveProgress: (payload) => apiPost("/api/progress", payload),
    getTests: (testId = "") => apiGet("/api/tests", testId ? { test_id: testId } : {}),
    getResults: (filters = {}) => apiGet("/api/results", filters),
    submitResult: (payload) => apiPost("/api/results", payload),
    getContent: (type = "") => apiGet("/api/content", type ? { type } : {})
  };
})();
