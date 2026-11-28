const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key, X-Session-Token"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}

function isAuthorizedAdmin(request, env) {
  const key = request.headers.get("X-Admin-Key") || "";
  const expected = env.ADMIN_API_KEY || "";
  return key.length > 0 && expected.length > 0 && key === expected;
}

function parseJsonSafe(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // Health check
      if (path === "/" || path === "/health") {
        const countRes = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).all();
        return jsonResponse({
          ok: true,
          service: "taiyarighar-api",
          tables: (countRes.results || []).map((r) => r.name)
        });
      }


      // Admin key verification (for secure Admin Panel login without Firebase Auth dependency)
      if (path === "/api/admin/verify" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Invalid Admin Key" }, 401);
        }
        return jsonResponse({ ok: true, admin: "madhupverma8@gmail.com" });
      }

      // Public GET & Admin POST for Pro Pass Pricing & Global Settings
      if (path === "/api/settings/pricing") {
        if (request.method === "GET") {
          const row = await env.DB.prepare(
            "SELECT meta_json FROM content_posts WHERE post_id = 'global_pricing_settings'"
          ).first();
          const settings = row ? parseJsonSafe(row.meta_json, {}) : {};
          return jsonResponse({ ok: true, settings });
        }
        if (request.method === "POST") {
          if (!isAuthorizedAdmin(request, env)) {
            return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
          }
          const body = await request.json();
          const cleanSettings = {
            Plan3_MRP: String(body.Plan3_MRP || body.price1M || "149"),
            Plan3_Price: String(body.Plan3_Price || body.price1M || "99"),
            Plan6_MRP: String(body.Plan6_MRP || body.price6M || "249"),
            Plan6_Price: String(body.Plan6_Price || body.price6M || "199"),
            Plan12_MRP: String(body.Plan12_MRP || body.price12M || "399"),
            Plan12_Price: String(body.Plan12_Price || body.price12M || "249"),
            globalCoupon: String(body.globalCoupon || "").trim().toUpperCase(),
            globalDiscount: Number(body.globalDiscount || 0),
            supportLink: String(body.supportLink || "").trim(),
            updatedAt: new Date().toISOString()
          };
          await env.DB.prepare(
            `INSERT OR REPLACE INTO content_posts
             (post_id, post_type, category, title_en, title_hi, body_en, body_hi, meta_json)
             VALUES ('global_pricing_settings', 'settings', 'pricing', 'Pricing', 'Pricing', '', '', ?)`
          ).bind(JSON.stringify(cleanSettings)).run();
          return jsonResponse({ ok: true, settings: cleanSettings });
        }
      }

      // List practice & NCERT bundles
      if (path === "/api/bundles" && request.method === "GET") {
        const subject = url.searchParams.get("subject") || "";
        const topic = url.searchParams.get("topic") || "";
        const ncertClass = url.searchParams.get("ncert_class") || "";

        let sql = "SELECT * FROM practice_bundles WHERE 1=1";
        const binds = [];
        if (subject) { sql += " AND subject = ?"; binds.push(subject); }
        if (topic) { sql += " AND topic = ?"; binds.push(topic); }
        if (ncertClass) { sql += " AND ncert_class = ?"; binds.push(ncertClass); }
        sql += " ORDER BY created_at DESC";

        const res = await env.DB.prepare(sql).bind(...binds).all();
        return jsonResponse({ ok: true, bundles: res.results || [] });
      }

      // Fetch practice & NCERT questions (15 free limit when preview=1)
      if (path === "/api/questions" && request.method === "GET") {
        const bundleId = url.searchParams.get("bundle_id") || "";
        const subject = url.searchParams.get("subject") || "";
        const topic = url.searchParams.get("topic") || "";
        const ncertClass = url.searchParams.get("ncert_class") || "";
        const preview = url.searchParams.get("preview") === "1";
        const limit = preview ? 15 : Math.min(Number(url.searchParams.get("limit") || 250), 500);
        const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

        let sql = "SELECT * FROM practice_questions WHERE 1=1";
        const binds = [];
        if (bundleId) { sql += " AND bundle_id = ?"; binds.push(bundleId); }
        if (subject) { sql += " AND subject = ?"; binds.push(subject); }
        if (topic) { sql += " AND topic = ?"; binds.push(topic); }
        if (ncertClass) { sql += " AND ncert_class = ?"; binds.push(ncertClass); }

        sql += " ORDER BY q_no ASC, id ASC LIMIT ? OFFSET ?";
        binds.push(limit, offset);

        const res = await env.DB.prepare(sql).bind(...binds).all();
        const questions = (res.results || []).map((row) => ({
          ...row,
          options: parseJsonSafe(row.options_json, [])
        }));

        return jsonResponse({
          ok: true,
          preview_mode: preview,
          count: questions.length,
          questions
        });
      }

      // Admin bulk upload bundle + questions
      if (path === "/api/bundles/bulk" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }

        const body = await request.json();
        const bundle = body.bundle || {};
        const questions = Array.isArray(body.questions) ? body.questions : [];

        if (!bundle.bundle_id || !bundle.subject || questions.length === 0) {
          return jsonResponse({ ok: false, error: "bundle_id, subject, and questions are required" }, 400);
        }

        const statements = [
          env.DB.prepare(
            `INSERT OR REPLACE INTO practice_bundles
             (bundle_id, subject, topic, ncert_class, title_en, title_hi, question_count, is_free_sample)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            String(bundle.bundle_id),
            String(bundle.subject),
            String(bundle.topic || ""),
            String(bundle.ncert_class || ""),
            String(bundle.title_en || bundle.bundle_id),
            String(bundle.title_hi || bundle.title_en || bundle.bundle_id),
            Number(questions.length),
            Number(bundle.is_free_sample ? 1 : 0)
          )
        ];

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          statements.push(
            env.DB.prepare(
              `INSERT INTO practice_questions
               (bundle_id, subject, topic, ncert_class, q_no, question_en, question_hi, options_json, correct_option, explanation_en, explanation_hi)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              String(bundle.bundle_id),
              String(q.subject || bundle.subject),
              String(q.topic || bundle.topic || ""),
              String(q.ncert_class || bundle.ncert_class || ""),
              Number(q.q_no || i + 1),
              String(q.question_en || ""),
              String(q.question_hi || ""),
              JSON.stringify(Array.isArray(q.options) ? q.options : []),
              String(q.correct_option || ""),
              String(q.explanation_en || ""),
              String(q.explanation_hi || "")
            )
          );
        }

        await env.DB.batch(statements);
        return jsonResponse({
          ok: true,
          bundle_id: bundle.bundle_id,
          inserted_questions: questions.length
        });
      }

      // Admin delete bundle + its questions
      if (path === "/api/bundles/delete" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }
        const body = await request.json();
        const ids = Array.isArray(body.bundle_ids) ? body.bundle_ids : (body.bundle_id ? [body.bundle_id] : []);
        if (!ids.length) return jsonResponse({ ok: false, error: "No bundle_id provided" }, 400);

        const stmts = [];
        ids.forEach((id) => {
          stmts.push(env.DB.prepare("DELETE FROM practice_questions WHERE bundle_id = ?").bind(String(id)));
          stmts.push(env.DB.prepare("DELETE FROM practice_bundles WHERE bundle_id = ?").bind(String(id)));
        });
        await env.DB.batch(stmts);
        return jsonResponse({ ok: true, deleted: ids.length });
      }

      // Student register / upsert into D1
      if (path === "/api/student/register" && request.method === "POST") {
        const body = await request.json();
        const loginId = String(body.login_id || "").trim().toUpperCase();
        const name = String(body.name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const mobile = String(body.mobile || "").trim();
        const passwordHash = String(body.password_hash || "").trim();
        const deviceId = String(body.device_id || "").trim();

        if (!loginId || !passwordHash) {
          return jsonResponse({ ok: false, error: "login_id and password_hash required" }, 400);
        }

        await env.DB.prepare(
          `INSERT OR REPLACE INTO students
           (login_id, name, email, mobile, password_hash, is_paid, plan_name, expiry_date, device1, referral_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          loginId,
          name,
          email,
          mobile,
          passwordHash,
          Number(body.is_paid ? 1 : 0),
          String(body.plan_name || "FREE"),
          String(body.expiry_date || ""),
          deviceId,
          loginId
        ).run();

        return jsonResponse({ ok: true, login_id: loginId });
      }

      // Student login & 2-device check
      if (path === "/api/student/login" && request.method === "POST") {
        const body = await request.json();
        const loginId = String(body.login_id || "").trim();
        const passwordHash = String(body.password_hash || "").trim();
        const deviceId = String(body.device_id || "default-device").trim();

        if (!loginId || !passwordHash) {
          return jsonResponse({ ok: false, error: "login_id and password_hash required" }, 400);
        }

        const student = await env.DB.prepare(
          "SELECT * FROM students WHERE (LOWER(login_id) = LOWER(?) OR LOWER(email) = LOWER(?) OR mobile = ?) AND password_hash = ?"
        ).bind(loginId, loginId, loginId, passwordHash).first();

        if (!student) {
          return jsonResponse({ ok: false, error: "Invalid credentials" }, 401);
        }

        let d1 = student.device1 || "";
        let d2 = student.device2 || "";

        if (!d1 || d1 === deviceId) {
          d1 = d1 || deviceId;
        } else if (!d2 || d2 === deviceId) {
          d2 = d2 || deviceId;
        } else {
          d1 = d2;
          d2 = deviceId;
        }

        const sessionToken = crypto.randomUUID();
        await env.DB.prepare(
          "UPDATE students SET device1 = ?, device2 = ?, active_session_token = ? WHERE login_id = ?"
        ).bind(d1, d2, sessionToken, student.login_id).run();

        return jsonResponse({
          ok: true,
          session_token: sessionToken,
          student: {
            login_id: student.login_id,
            name: student.name,
            email: student.email,
            mobile: student.mobile,
            is_paid: Boolean(student.is_paid),
            plan_name: student.plan_name,
            expiry_date: student.expiry_date,
            referral_code: student.referral_code
          }
        });
      }

      // Practice progress get / save
      if (path === "/api/progress" && request.method === "GET") {
        const loginId = String(url.searchParams.get("login_id") || "").trim();
        if (!loginId) return jsonResponse({ ok: false, error: "login_id required" }, 400);
        const row = await env.DB.prepare("SELECT * FROM practice_progress WHERE login_id = ?").bind(loginId).first();
        return jsonResponse({
          ok: true,
          progress: row ? {
            attemptedMap: parseJsonSafe(row.attempted_map_json, {}),
            totalAttempted: Number(row.total_attempted || 0),
            totalCorrect: Number(row.total_correct || 0),
            totalTimeSec: Number(row.total_time_sec || 0)
          } : null
        });
      }

      if (path === "/api/progress" && request.method === "POST") {
        const body = await request.json();
        const loginId = String(body.login_id || "").trim();
        if (!loginId) return jsonResponse({ ok: false, error: "login_id required" }, 400);

        await env.DB.prepare(
          `INSERT OR REPLACE INTO practice_progress
           (login_id, attempted_map_json, total_attempted, total_correct, total_time_sec, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
          loginId,
          JSON.stringify(body.attemptedMap || {}),
          Number(body.totalAttempted || 0),
          Number(body.totalCorrect || 0),
          Number(body.totalTimeSec || 0)
        ).run();

        return jsonResponse({ ok: true });
      }

      // Mock tests list & single test fetch (supports D1 full test metadata + questions_json)
      if (path === "/api/tests" && request.method === "GET") {
        const testId = url.searchParams.get("test_id") || "";
        if (testId) {
          const row = await env.DB.prepare("SELECT * FROM mock_tests WHERE test_id = ?").bind(testId).first();
          return jsonResponse({
            ok: true,
            test: row ? { ...row, questions: parseJsonSafe(row.questions_json, []) } : null
          });
        }
        const res = await env.DB.prepare(
          "SELECT test_id, category, title_en, title_hi, duration_mins, total_marks, negative_marking, is_paid, created_at FROM mock_tests ORDER BY created_at DESC"
        ).all();
        return jsonResponse({ ok: true, tests: res.results || [] });
      }

      // Admin upload mock / live test to D1
      if (path === "/api/tests" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }
        const body = await request.json();
        const metaPayload = {
          subCat: String(body.sub_cat || body.category || "General"),
          isLive: Boolean(body.is_live),
          liveEndTime: String(body.live_end_time || ""),
          posMark: Number(body.pos_mark || 1),
          questionCount: Array.isArray(body.questions) ? body.questions.length : 0,
          questions: Array.isArray(body.questions) ? body.questions : []
        };
        await env.DB.prepare(
          `INSERT OR REPLACE INTO mock_tests
           (test_id, category, title_en, title_hi, duration_mins, total_marks, negative_marking, is_paid, questions_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          String(body.test_id),
          String(body.category || "General"),
          String(body.title_en || ""),
          String(body.title_hi || body.title_en || ""),
          Number(body.duration_mins || 60),
          Number(body.total_marks || 100),
          Number(body.negative_marking || 0),
          Number(body.is_paid ? 1 : 0),
          JSON.stringify(metaPayload)
        ).run();
        return jsonResponse({ ok: true, test_id: body.test_id });
      }

      // Admin delete mock / live test from D1
      if (path === "/api/tests/delete" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }
        const body = await request.json();
        const testId = String(body.test_id || "").trim();
        if (!testId) return jsonResponse({ ok: false, error: "test_id required" }, 400);
        await env.DB.prepare("DELETE FROM mock_tests WHERE test_id = ?").bind(testId).run();
        return jsonResponse({ ok: true, deleted: testId });
      }

      // Submit & fetch test results
      if (path === "/api/results" && request.method === "GET") {
        const loginId = url.searchParams.get("login_id") || "";
        const testId = url.searchParams.get("test_id") || "";
        let sql = "SELECT * FROM test_results WHERE 1=1";
        const binds = [];
        if (loginId) { sql += " AND login_id = ?"; binds.push(loginId); }
        if (testId) { sql += " AND test_id = ?"; binds.push(testId); }
        sql += " ORDER BY score DESC, submitted_at DESC LIMIT 200";
        const res = await env.DB.prepare(sql).bind(...binds).all();
        return jsonResponse({ ok: true, results: res.results || [] });
      }

      if (path === "/api/results" && request.method === "POST") {
        const body = await request.json();
        await env.DB.prepare(
          `INSERT INTO test_results
           (test_id, login_id, student_name, score, correct_count, wrong_count, skipped_count, accuracy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          String(body.test_id || ""),
          String(body.login_id || ""),
          String(body.student_name || ""),
          Number(body.score || 0),
          Number(body.correct_count || 0),
          Number(body.wrong_count || 0),
          Number(body.skipped_count || 0),
          Number(body.accuracy || 0)
        ).run();

        return jsonResponse({ ok: true, message: "Result saved" });
      }

      // Content posts (current affairs, jobs, notes)
      if (path === "/api/content" && request.method === "GET") {
        const postType = url.searchParams.get("type") || "";
        let sql = "SELECT * FROM content_posts WHERE 1=1";
        const binds = [];
        if (postType) { sql += " AND post_type = ?"; binds.push(postType); }
        sql += " ORDER BY created_at DESC LIMIT 150";
        const res = await env.DB.prepare(sql).bind(...binds).all();
        return jsonResponse({ ok: true, posts: res.results || [] });
      }

      if (path === "/api/content" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }
        const body = await request.json();
        await env.DB.prepare(
          `INSERT OR REPLACE INTO content_posts
           (post_id, post_type, category, title_en, title_hi, body_en, body_hi, meta_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          String(body.post_id),
          String(body.post_type || "job"),
          String(body.category || ""),
          String(body.title_en || ""),
          String(body.title_hi || ""),
          String(body.body_en || ""),
          String(body.body_hi || ""),
          JSON.stringify(body.meta || {})
        ).run();
        return jsonResponse({ ok: true, post_id: body.post_id });
      }

      // Subject-wise PYQs (public/free access, supports multi-exam & year metadata)
      if (path === "/api/pyqs" && request.method === "GET") {
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS pyq_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pyq_id TEXT UNIQUE,
            subject TEXT,
            topic TEXT,
            exam_year TEXT,
            question_en TEXT,
            question_hi TEXT,
            options_json TEXT,
            correct_option TEXT,
            explanation_en TEXT,
            explanation_hi TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          )`
        ).run();

        const subject = url.searchParams.get("subject") || "";
        const topic = url.searchParams.get("topic") || "";
        const qText = (url.searchParams.get("q") || "").trim().toLowerCase();

        let sql = "SELECT * FROM pyq_questions WHERE 1=1";
        const binds = [];
        if (subject) { sql += " AND subject = ?"; binds.push(subject); }
        if (topic) { sql += " AND topic = ?"; binds.push(topic); }
        sql += " ORDER BY id DESC LIMIT 500";

        const res = await env.DB.prepare(sql).bind(...binds).all();
        let rows = (res.results || []).map((r) => ({
          ...r,
          options: parseJsonSafe(r.options_json, [])
        }));
        if (qText) {
          rows = rows.filter((r) =>
            String(r.question_en || "").toLowerCase().includes(qText) ||
            String(r.question_hi || "").toLowerCase().includes(qText) ||
            String(r.exam_year || "").toLowerCase().includes(qText) ||
            String(r.topic || "").toLowerCase().includes(qText)
          );
        }
        return jsonResponse({ ok: true, count: rows.length, pyqs: rows });
      }

      if (path === "/api/pyqs/bulk" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }
        await env.DB.prepare(
          `CREATE TABLE IF NOT EXISTS pyq_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pyq_id TEXT UNIQUE,
            subject TEXT,
            topic TEXT,
            exam_year TEXT,
            question_en TEXT,
            question_hi TEXT,
            options_json TEXT,
            correct_option TEXT,
            explanation_en TEXT,
            explanation_hi TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          )`
        ).run();

        const body = await request.json();
        const items = Array.isArray(body.pyqs) ? body.pyqs : [];
        if (!items.length) return jsonResponse({ ok: false, error: "pyqs array required" }, 400);

        const stmts = items.map((item, idx) =>
          env.DB.prepare(
            `INSERT OR REPLACE INTO pyq_questions
             (pyq_id, subject, topic, exam_year, question_en, question_hi, options_json, correct_option, explanation_en, explanation_hi)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            String(item.pyq_id || `pyq_${Date.now()}_${idx}`),
            String(item.subject || "General"),
            String(item.topic || "General"),
            String(item.exam_year || ""),
            String(item.question_en || ""),
            String(item.question_hi || ""),
            JSON.stringify(Array.isArray(item.options) ? item.options : []),
            String(item.correct_option || "A"),
            String(item.explanation_en || ""),
            String(item.explanation_hi || "")
          )
        );
        await env.DB.batch(stmts);
        return jsonResponse({ ok: true, inserted: items.length });
      }

      if (path === "/api/pyqs/delete" && request.method === "POST") {
        if (!isAuthorizedAdmin(request, env)) {
          return jsonResponse({ ok: false, error: "Unauthorized admin key" }, 401);
        }
        const body = await request.json();
        const ids = Array.isArray(body.pyq_ids) ? body.pyq_ids : (body.pyq_id ? [body.pyq_id] : []);
        if (!ids.length) return jsonResponse({ ok: false, error: "pyq_id required" }, 400);
        const stmts = ids.map((id) => env.DB.prepare("DELETE FROM pyq_questions WHERE pyq_id = ?").bind(String(id)));
        await env.DB.batch(stmts);
        return jsonResponse({ ok: true, deleted: ids.length });
      }


      // Server-side Razorpay payment verification & Pro Pass activation
      if (path === "/api/verify-payment" && request.method === "POST") {
        const body = await request.json();
        const paymentId = String(body.razorpay_payment_id || "").trim();
        const loginId = String(body.login_id || "").trim().toUpperCase();
        const planLabel = String(body.plan_label || "12 Months Pass").trim();
        const validityDays = Math.max(1, Number(body.validity_days || 365));
        const expectedAmountPaise = Math.max(100, Math.round(Number(body.expected_amount || 0) * 100));

        if (!paymentId || !loginId) {
          return jsonResponse({ ok: false, error: "payment_id and login_id are required" }, 400);
        }

        // Prevent duplicate replay of same paymentId
        const existingPay = await env.DB.prepare(
          "SELECT id FROM content_posts WHERE post_id = ?"
        ).bind("pay_" + paymentId).first();
        if (existingPay) {
          return jsonResponse({ ok: false, error: "Payment ID already processed" }, 409);
        }

        const rzpKeyId = env.RAZORPAY_KEY_ID || "";
        const rzpKeySecret = env.RAZORPAY_KEY_SECRET || "";
        let verifiedAmountRupees = Number(body.expected_amount || 0);

        if (rzpKeyId && rzpKeySecret) {
          const authHeader = "Basic " + btoa(`${rzpKeyId}:${rzpKeySecret}`);
          const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
            method: "GET",
            headers: { "Authorization": authHeader }
          });
          if (!rzpRes.ok) {
            return jsonResponse({ ok: false, error: "Razorpay payment verification failed" }, 402);
          }
          const rzpData = await rzpRes.json();
          const validStatus = rzpData.status === "captured" || rzpData.status === "authorized";
          if (!validStatus || Number(rzpData.amount || 0) < expectedAmountPaise) {
            return jsonResponse({ ok: false, error: "Payment status or amount mismatch" }, 402);
          }
          verifiedAmountRupees = Number(rzpData.amount || 0) / 100;
        }

        const expDate = new Date(Date.now() + validityDays * 86400000).toISOString().split("T")[0];
        await env.DB.prepare(
          `UPDATE students SET is_paid = 1, plan_name = ?, expiry_date = ? WHERE UPPER(login_id) = ?`
        ).bind(planLabel, expDate, loginId).run();

        await env.DB.prepare(
          `INSERT OR REPLACE INTO content_posts (post_id, post_type, category, title_en, title_hi, body_en, body_hi, meta_json)
           VALUES (?, 'payment', ?, ?, ?, ?, ?, ?)`
        ).bind(
          "pay_" + paymentId,
          planLabel,
          paymentId,
          loginId,
          String(verifiedAmountRupees),
          expDate,
          JSON.stringify({ loginId, paymentId, planLabel, validityDays, amount: verifiedAmountRupees, verifiedAt: new Date().toISOString() })
        ).run();

        return jsonResponse({
          ok: true,
          verified: true,
          login_id: loginId,
          expiry_date: expDate,
          amount: verifiedAmountRupees
        });
      }

      return jsonResponse({ ok: false, error: "Route not found" }, 404);
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message || "Server error" }, 500);
    }
  }
};
