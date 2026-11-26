window.TG_Student_D1 = {
  async loadPracticeSets(filters = {}, isPaid = false) {
    if (!window.TG_STUDENT_API) return [];
    const res = await window.TG_STUDENT_API.getBundles(filters);
    const bundles = (res && res.bundles) ? res.bundles : [];
    return bundles.map((b) => ({
      ...b,
      preview_limit: isPaid ? null : (window.TAIYARIGHAR_CONFIG?.FREE_PREVIEW_LIMIT || 15)
    }));
  },
  async loadPracticeQuestions(filters = {}, isPaid = false) {
    if (!window.TG_STUDENT_API) return [];
    const res = await window.TG_STUDENT_API.getQuestions(filters, isPaid);
    return (res && res.questions) ? res.questions : [];
  },
  async signIn(loginId, passwordHash) {
    if (!window.TG_STUDENT_API) return { ok: false, error: "Bridge not loaded" };
    return window.TG_STUDENT_API.loginStudent(loginId, passwordHash);
  },
  async saveTestScore(resultPayload) {
    if (!window.TG_STUDENT_API) return { ok: false, error: "Bridge not loaded" };
    return window.TG_STUDENT_API.submitResult(resultPayload);
  }
};
