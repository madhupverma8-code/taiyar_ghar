// ============================================================================
// TaiyariGhar Candidate Portal Engine (student-app.js)
// ============================================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_REPLACE_WITH_YOUR_DEPLOYED_WEB_APP_URL/exec";
const RAZORPAY_KEY_ID = "rzp_live_REPLACE_WITH_YOUR_KEY";

const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyReplaceWithYourConfig",
  authDomain: "taiyarighar.firebaseapp.com",
  projectId: "taiyarighar",
  storageBucket: "taiyarighar.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let currentStudent = null;
let candRegOtp = "";
let fpOtpCode = "";
let candOtpTimer = null;

// Checkout state
let selectedPlan = { id: "3m", name: "3 Months Pass", mrp: 149, price: 119, days: 90 };
let appliedPartner = null;

// Smart Practice Bank state
let pbMetaIndex = [];       // List of bundle docs metadata
let pbLoadedBundles = {};   // Cache bundleId -> questions array
let pbCurrentSubject = "";
let pbCurrentMode = "";     // "topic" or "mix"
let pbCurrentTopic = "";
let pbPoolMode = "unattempted"; // "unattempted" or "attempted"
let pbActiveQuestions = [];
let pbCurrentIndex = 0;
let pbUserProgress = {
  attemptedMap: {}, // qId -> { isCorrect, chosen, timeSec }
  totalAttempted: 0,
  totalCorrect: 0,
  totalTimeSec: 0
};
let pbStreakCount = 0;      // Positive for consecutive right, negative for consecutive wrong
let pbSessionCorrect = 0;
let pbSessionWrong = 0;
let pbTimerInterval = null;
let pbQuestionSeconds = 0;
let pbUnsavedWrites = 0;

// ----------------------------------------------------------------------------
// Processing Overlay Helpers
// ----------------------------------------------------------------------------
function showProcessing(title = "Processing, please wait...", sub = "Please do not close this window") {
  const ov = document.getElementById("tgProcessingOverlay");
  if (!ov) return;
  document.getElementById("tgProcessingText").textContent = title;
  document.getElementById("tgProcessingSub").textContent = sub;
  ov.classList.remove("hidden");
}

function hideProcessing() {
  const ov = document.getElementById("tgProcessingOverlay");
  if (ov) ov.classList.add("hidden");
}

function startButtonCooldown(btnId, defaultText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  let sec = 30;
  btn.disabled = true;
  btn.textContent = `Resend (${sec}s)`;
  clearInterval(candOtpTimer);
  candOtpTimer = setInterval(() => {
    sec--;
    if (sec <= 0) {
      clearInterval(candOtpTimer);
      btn.disabled = false;
      btn.textContent = defaultText;
    } else {
      btn.textContent = `Resend (${sec}s)`;
    }
  }, 1000);
}

// ----------------------------------------------------------------------------
// Navigation & Session Bootstrap
// ----------------------------------------------------------------------------
function navigateTo(view) {
  const sections = ["view-home", "view-login", "view-register", "view-dashboard", "view-practice-bank", "view-dynamic"];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  if (view === "home") {
    document.getElementById("view-home")?.classList.remove("hidden");
    loadHomeCategories();
  } else if (view === "login") {
    document.getElementById("view-login")?.classList.remove("hidden");
    document.getElementById("loginInlineError")?.classList.add("hidden");
  } else if (view === "register") {
    document.getElementById("view-register")?.classList.remove("hidden");
  } else if (view === "dashboard") {
    if (!currentStudent) return navigateTo("login");
    document.getElementById("view-dashboard")?.classList.remove("hidden");
    renderStudentDashboard();
  } else if (view === "live-tests") {
    document.getElementById("view-dynamic")?.classList.remove("hidden");
    renderLiveTestsPage();
  } else if (view === "current-affairs") {
    document.getElementById("view-dynamic")?.classList.remove("hidden");
    renderCurrentAffairsPage();
  } else if (view === "updates") {
    document.getElementById("view-dynamic")?.classList.remove("hidden");
    renderUpdatesPage();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHeaderAuthUI() {
  const area = document.getElementById("headerAuthArea");
  if (!area) return;
  if (currentStudent) {
    area.innerHTML = `
      <button class="btn btn-outline" onclick="navigateTo('dashboard')">My Dashboard</button>
      <button class="btn btn-primary" onclick="openUpgradeModal()">Pass</button>
    `;
  } else {
    area.innerHTML = `
      <button class="btn btn-outline" onclick="navigateTo('login')">Login</button>
      <button class="btn btn-primary" onclick="navigateTo('register')">Register Free</button>
    `;
  }
}

function isStudentProActive() {
  if (!currentStudent || !currentStudent.passExpiry) return false;
  const exp = new Date(currentStudent.passExpiry);
  return exp.getTime() > Date.now();
}

// ----------------------------------------------------------------------------
// 1. Clean 2-Step Candidate Registration
// ----------------------------------------------------------------------------
async function sendCandidateRegOtp() {
  const email = document.getElementById("regCandEmail").value.trim().toLowerCase();
  const msg = document.getElementById("candRegOtpMsg");
  const btn = document.getElementById("btnSendCandOtp");

  msg.classList.add("hidden");
  if (!email || !email.includes("@")) {
    msg.className = "inline-error-text";
    msg.textContent = "Please enter a valid email address.";
    msg.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Checking...";

  try {
    const existing = await db.collection("students").where("email", "==", email).get();
    if (!existing.empty) {
      btn.disabled = false;
      btn.textContent = "Send OTP";
      msg.className = "inline-error-text";
      msg.textContent = "This Email ID is already registered. Please log in.";
      msg.classList.remove("hidden");
      return;
    }

    candRegOtp = String(Math.floor(100000 + Math.random() * 900000));
    startButtonCooldown("btnSendCandOtp", "Send OTP");

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "send_otp",
        email: email,
        otp: candRegOtp,
        purpose: "Account Verification"
      })
    });

    document.getElementById("candOtpVerifyBox").classList.remove("hidden");
    msg.className = "inline-ok-text";
    msg.textContent = "6-digit verification code sent to your Email Primary Inbox.";
    msg.classList.remove("hidden");
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Send OTP";
    msg.className = "inline-error-text";
    msg.textContent = "Unable to send OTP: " + err.message;
    msg.classList.remove("hidden");
  }
}

function verifyCandidateRegOtp() {
  const entered = document.getElementById("candRegOtpInput").value.trim();
  const msg = document.getElementById("candRegOtpMsg");
  if (!candRegOtp || entered !== candRegOtp) {
    msg.className = "inline-error-text";
    msg.textContent = "Wrong OTP entered. Please check your email and try again.";
    msg.classList.remove("hidden");
    return;
  }
  const email = document.getElementById("regCandEmail").value.trim().toLowerCase();
  document.getElementById("regVerifiedEmail").value = email;
  document.getElementById("candRegStep1").classList.add("hidden");
  document.getElementById("candRegStep2").classList.remove("hidden");
  document.getElementById("regStepSubtitle").textContent = "Step 2: Complete your profile details to create your account.";
}

async function completeCandidateRegistration(e) {
  e.preventDefault();
  const btn = document.getElementById("btnCompleteCandReg");
  const errEl = document.getElementById("candRegFinalError");
  errEl.classList.add("hidden");

  const email = document.getElementById("regVerifiedEmail").value.trim().toLowerCase();
  const name = document.getElementById("regCandName").value.trim();
  const mobile = document.getElementById("regCandMobile").value.trim();
  const targetExam = document.getElementById("regCandExam").value;
  const cityState = document.getElementById("regCandCityState").value.trim();
  const password = document.getElementById("regCandPassword").value;

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    errEl.textContent = "Please enter a valid 10-digit mobile number.";
    errEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creating Account...";
  showProcessing("Creating your TaiyariGhar account...", "Setting up your candidate dashboard");

  try {
    const dupMob = await db.collection("students").where("mobile", "==", mobile).get();
    if (!dupMob.empty) {
      hideProcessing();
      btn.disabled = false;
      btn.textContent = "Complete Registration";
      errEl.textContent = "This mobile number is already registered with another account.";
      errEl.classList.remove("hidden");
      return;
    }

    const studentId = "TG" + Math.floor(100000 + Math.random() * 900000);
    const studentDoc = {
      studentId,
      name,
      email,
      mobile,
      targetExam,
      cityState,
      password,
      passPlan: "Free",
      passExpiry: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("students").doc(studentId).set(studentDoc);

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "welcome",
        email,
        name,
        studentId,
        mobile,
        password
      })
    }).catch(() => {});

    currentStudent = studentDoc;
    localStorage.setItem("tg_student_session", JSON.stringify(currentStudent));
    updateHeaderAuthUI();
    hideProcessing();
    navigateTo("dashboard");
  } catch (err) {
    hideProcessing();
    btn.disabled = false;
    btn.textContent = "Complete Registration";
    errEl.textContent = "Registration failed: " + err.message;
    errEl.classList.remove("hidden");
  }
}

// ----------------------------------------------------------------------------
// 2. Strict Candidate Login (Inline Error, No False Login, Processing State)
// ----------------------------------------------------------------------------
async function handleCandidateLogin() {
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginInlineError");
  const btn = document.getElementById("btnCandidateLogin");

  errEl.classList.add("hidden");
  errEl.textContent = "";

  if (!identifier || !password) {
    errEl.textContent = "Please enter both Email/Student ID and Password.";
    errEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Logging in... Processing";
  showProcessing("Verifying credentials...", "Signing in to your TaiyariGhar dashboard");

  try {
    let snap = null;
    if (identifier.includes("@")) {
      snap = await db.collection("students").where("email", "==", identifier.toLowerCase()).limit(1).get();
    } else {
      snap = await db.collection("students").where("studentId", "==", identifier.toUpperCase()).limit(1).get();
    }

    if (!snap || snap.empty) {
      hideProcessing();
      btn.disabled = false;
      btn.textContent = "Login to Dashboard";
      errEl.textContent = "Account not found. Check your Email/Student ID or register free.";
      errEl.classList.remove("hidden");
      return;
    }

    const userData = snap.docs[0].data();
    // Strict exact match check
    if (String(userData.password) !== String(password)) {
      hideProcessing();
      btn.disabled = false;
      btn.textContent = "Login to Dashboard";
      errEl.textContent = "Wrong password. Please enter the correct password.";
      errEl.classList.remove("hidden");
      return;
    }

    // Verified login
    currentStudent = userData;
    localStorage.setItem("tg_student_session", JSON.stringify(currentStudent));
    await loadStudentPracticeProgress();
    updateHeaderAuthUI();
    hideProcessing();
    btn.disabled = false;
    btn.textContent = "Login to Dashboard";
    navigateTo("dashboard");
  } catch (err) {
    hideProcessing();
    btn.disabled = false;
    btn.textContent = "Login to Dashboard";
    errEl.textContent = "Login error: " + err.message;
    errEl.classList.remove("hidden");
  }
}

function toggleForgotPassword(show) {
  document.getElementById("loginPasswordForm").classList.toggle("hidden", show);
  document.getElementById("forgotPasswordBox").classList.toggle("hidden", !show);
}

async function sendForgotOtp() {
  const email = document.getElementById("fpEmail").value.trim().toLowerCase();
  const msg = document.getElementById("fpMsg");
  const btn = document.getElementById("btnSendFpOtp");
  msg.classList.add("hidden");

  if (!email) {
    msg.className = "inline-error-text"; msg.textContent = "Enter your registered email."; msg.classList.remove("hidden"); return;
  }

  btn.disabled = true; btn.textContent = "Checking...";
  try {
    const snap = await db.collection("students").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      btn.disabled = false; btn.textContent = "Send OTP";
      msg.className = "inline-error-text"; msg.textContent = "No account registered with this email."; msg.classList.remove("hidden"); return;
    }
    fpOtpCode = String(Math.floor(100000 + Math.random() * 900000));
    startButtonCooldown("btnSendFpOtp", "Send OTP");

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "send_otp", email, otp: fpOtpCode, purpose: "Password Reset" })
    });
    document.getElementById("fpResetFields").classList.remove("hidden");
    msg.className = "inline-ok-text"; msg.textContent = "6-digit OTP sent to your Email Inbox."; msg.classList.remove("hidden");
  } catch (e) {
    btn.disabled = false; btn.textContent = "Send OTP";
    msg.className = "inline-error-text"; msg.textContent = e.message; msg.classList.remove("hidden");
  }
}

async function completePasswordReset() {
  const email = document.getElementById("fpEmail").value.trim().toLowerCase();
  const otp = document.getElementById("fpOtp").value.trim();
  const newPass = document.getElementById("fpNewPass").value;
  const msg = document.getElementById("fpMsg");

  if (!fpOtpCode || otp !== fpOtpCode) {
    msg.className = "inline-error-text"; msg.textContent = "Invalid OTP."; msg.classList.remove("hidden"); return;
  }
  if (!newPass || newPass.length < 6) {
    msg.className = "inline-error-text"; msg.textContent = "Password must be at least 6 characters."; msg.classList.remove("hidden"); return;
  }

  showProcessing("Updating password...", "Please wait");
  const snap = await db.collection("students").where("email", "==", email).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({ password: newPass });
  }
  hideProcessing();
  toggleForgotPassword(false);
  const loginErr = document.getElementById("loginInlineError");
  loginErr.className = "inline-ok-text";
  loginErr.textContent = "Password updated successfully. Please log in with your new password.";
  loginErr.classList.remove("hidden");
}

function logoutCandidate() {
  currentStudent = null;
  localStorage.removeItem("tg_student_session");
  updateHeaderAuthUI();
  navigateTo("home");
}

// ----------------------------------------------------------------------------
// 3. Dashboard & Simultaneous Live Test Results Release (NO Emails Sent)
// ----------------------------------------------------------------------------
function switchDashTab(tab) {
  document.getElementById("dashContentTests").classList.toggle("hidden", tab !== "tests");
  document.getElementById("dashContentResults").classList.toggle("hidden", tab !== "results");
  document.getElementById("dtab-tests").className = tab === "tests" ? "btn btn-primary" : "btn btn-outline";
  document.getElementById("dtab-results").className = tab === "results" ? "btn btn-primary" : "btn btn-outline";
  if (tab === "results") renderStudentResultsTab();
}

async function renderStudentDashboard() {
  if (!currentStudent) return;
  document.getElementById("dashWelcomeName").textContent = "Welcome, " + currentStudent.name;
  document.getElementById("dashStudentMeta").textContent =
    `Student ID: ${currentStudent.studentId} • Target: ${currentStudent.targetExam || "Govt Exams"} • ${currentStudent.cityState || ""}`;

  const badge = document.getElementById("dashPassBadge");
  if (isStudentProActive()) {
    const expDate = new Date(currentStudent.passExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    badge.style.background = "#dcfce7";
    badge.style.color = "#166534";
    badge.textContent = `Active Pass (Valid till ${expDate})`;
  } else {
    badge.style.background = "#f1f5f9";
    badge.style.color = "#334155";
    badge.textContent = "Free Plan (15 Qs/Topic Free)";
  }

  const wrap = document.getElementById("dashContentTests");
  wrap.innerHTML = `<div style="padding:16px; color:#64748b;">Loading mock tests...</div>`;

  try {
    const snap = await db.collection("tests").orderBy("createdAt", "desc").limit(30).get();
    if (snap.empty) {
      wrap.innerHTML = `<div style="background:#fff; border:1px solid #e2e8f0; padding:18px; border-radius:8px;">No mock tests published yet. Try the Unlimited Smart Practice Bank above!</div>`;
      return;
    }

    let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">`;
    snap.forEach(doc => {
      const t = doc.data();
      const isLive = t.testType === "live";
      const isFree = t.isFree === true;
      const locked = !isFree && !isStudentProActive();
      html += `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:15px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:6px;">
            <span style="font-weight:700; color:${isLive ? "#dc2626" : "#2563eb"};">${isLive ? "ALL-INDIA LIVE TEST" : (t.category || "MOCK TEST")}</span>
            <span style="font-weight:600; color:${isFree ? "#15803d" : "#475569"};">${isFree ? "FREE" : "PRO PASS"}</span>
          </div>
          <div style="font-size:14.5px; font-weight:700; color:#0f172a; margin-bottom:6px;">${t.title || "Untitled Test"}</div>
          <div style="font-size:12px; color:#64748b; margin-bottom:12px;">${t.totalQuestions || 0} Qs &bull; ${t.durationMinutes || 60} Mins &bull; ${t.totalMarks || 100} Marks</div>
          ${locked
            ? `<button class="btn btn-outline" style="width:100%;" onclick="openUpgradeModal()">Unlock with Pass</button>`
            : `<button class="btn btn-primary" style="width:100%;" onclick="launchMockTest('${doc.id}')">Start Test</button>`
          }
        </div>
      `;
    });
    html += `</div>`;
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = `<div style="color:#dc2626;">Error loading tests: ${e.message}</div>`;
  }
}

async function renderStudentResultsTab() {
  const wrap = document.getElementById("dashContentResults");
  wrap.innerHTML = `<div style="padding:16px; color:#64748b;">Loading your results &amp; live ranks...</div>`;

  try {
    const resSnap = await db.collection("results").where("studentId", "==", currentStudent.studentId).get();
    if (resSnap.empty) {
      wrap.innerHTML = `<div style="background:#fff; border:1px solid #e2e8f0; padding:18px; border-radius:8px;">You have not attempted any mock or live test yet.</div>`;
      return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
    for (const doc of resSnap.docs) {
      const r = doc.data();
      let liveLocked = false;
      let releaseTimeText = "";
      let rankBadge = "";

      if (r.testType === "live" && r.liveEnd) {
        const endMs = new Date(r.liveEnd).getTime();
        if (Date.now() < endMs) {
          liveLocked = true;
          releaseTimeText = new Date(endMs).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
        } else {
          // Live window ended -> compute simultaneous All-India Rank on dashboard
          const allAttempts = await db.collection("results").where("testId", "==", r.testId).get();
          const scores = allAttempts.docs.map(d => Number(d.data().finalScore || 0)).sort((a, b) => b - a);
          const myRank = scores.indexOf(Number(r.finalScore || 0)) + 1;
          rankBadge = `<span style="background:#dcfce7; color:#166534; padding:3px 9px; border-radius:5px; font-size:12px; font-weight:700;">All-India Rank: #${myRank} / ${scores.length}</span>`;
        }
      }

      if (liveLocked) {
        html += `
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px 16px;">
            <div style="font-size:14px; font-weight:700; color:#92400e;">${r.testName} (All-India Live Exam)</div>
            <div style="font-size:12.5px; color:#78350f; margin-top:4px;">Your response has been recorded. All-India Rank, Scorecard, and Solutions will be released simultaneously on this dashboard after <strong>${releaseTimeText}</strong>.</div>
          </div>
        `;
      } else {
        html += `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="font-size:14.5px; font-weight:700; color:#0f172a;">${r.testName}</div>
              <div style="font-size:12.5px; color:#475569; margin-top:3px;">
                Score: <strong>${r.finalScore} / ${r.totalMarks}</strong> &bull; Correct: ${r.correctCount} &bull; Wrong: ${r.wrongCount}
              </div>
            </div>
            <div>${rankBadge}</div>
          </div>
        `;
      }
    }
    html += `</div>`;
    wrap.innerHTML = html;
  } catch (e) {
    wrap.innerHTML = `<div style="color:#dc2626;">Error loading results: ${e.message}</div>`;
  }
}

// Launch Mock Test with Processing Indicator while downloading questions
async function launchMockTest(testId) {
  showProcessing("Downloading Test & Questions...", "Preparing your bilingual CBT exam screen");
  try {
    const testDoc = await db.collection("tests").doc(testId).get();
    const qSnap = await db.collection("questions").where("testId", "==", testId).get();
    hideProcessing();
    if (!testDoc.exists || qSnap.empty) {
      alert("Questions for this test are being updated. Please try again shortly.");
      return;
    }
    // Render exam player in dynamic view
    const t = testDoc.data();
    const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderExamPlayer(testId, t, questions);
  } catch (err) {
    hideProcessing();
    alert("Failed to load test: " + err.message);
  }
}

function renderExamPlayer(testId, testMeta, questions) {
  ["view-home", "view-login", "view-register", "view-dashboard", "view-practice-bank"].forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });
  const dyn = document.getElementById("view-dynamic");
  dyn.classList.remove("hidden");

  let idx = 0;
  const answers = {};

  function drawQ() {
    const q = questions[idx];
    const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
    dyn.innerHTML = `
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:20px;">
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:14px;">
          <strong>${testMeta.title}</strong>
          <span>Question ${idx + 1} of ${questions.length}</span>
        </div>
        <div style="font-size:15px; font-weight:600; margin-bottom:14px;">${q.questionText || q.question}</div>
        <div>
          ${opts.map((o, i) => `
            <button class="pb-opt-btn ${answers[idx] === i ? "opt-correct" : ""}" onclick="window._pickExamOpt(${i})">
              <strong>${String.fromCharCode(65 + i)}.</strong> ${o || ""}
            </button>
          `).join("")}
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:16px;">
          <button class="btn btn-outline" ${idx === 0 ? "disabled" : ""} onclick="window._prevExamQ()">Previous</button>
          ${idx < questions.length - 1
            ? `<button class="btn btn-primary" onclick="window._nextExamQ()">Save &amp; Next</button>`
            : `<button class="btn btn-primary" onclick="window._submitExam()">Submit Exam</button>`
          }
        </div>
      </div>
    `;
  }

  window._pickExamOpt = (i) => { answers[idx] = i; drawQ(); };
  window._prevExamQ = () => { if (idx > 0) { idx--; drawQ(); } };
  window._nextExamQ = () => { if (idx < questions.length - 1) { idx++; drawQ(); } };
  window._submitExam = async () => {
    showProcessing("Submitting Exam & Calculating Score...", "Saving your result to dashboard");
    let correct = 0, wrong = 0;
    const pos = Number(testMeta.positiveMarks || 1);
    const neg = Number(testMeta.negativeMarks || 0.25);
    questions.forEach((q, i) => {
      if (answers[i] === undefined) return;
      const rightIdx = ["A", "B", "C", "D"].indexOf(String(q.correctOption || "A").trim().toUpperCase());
      if (answers[i] === rightIdx) correct++;
      else wrong++;
    });
    const finalScore = Number((correct * pos - wrong * neg).toFixed(2));
    // Save result directly to Firestore (NO live result email sent)
    await db.collection("results").add({
      studentId: currentStudent.studentId,
      studentName: currentStudent.name,
      testId,
      testName: testMeta.title,
      testType: testMeta.testType || "mock",
      liveEnd: testMeta.liveEnd || null,
      finalScore,
      totalMarks: testMeta.totalMarks || (questions.length * pos),
      correctCount: correct,
      wrongCount: wrong,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    hideProcessing();
    navigateTo("dashboard");
    switchDashTab("results");
  };

  drawQ();
}

// ----------------------------------------------------------------------------
// 4. Unlimited Smart Practice Bank (100-Q Smart Bundles, 15 Free Qs/Topic, Mix)
// ----------------------------------------------------------------------------
async function loadStudentPracticeProgress() {
  if (!currentStudent) return;
  try {
    const snap = await db.collection("practice_progress").doc(currentStudent.studentId).get();
    if (snap.exists) {
      const d = snap.data();
      pbUserProgress.attemptedMap = d.attemptedMap || {};
      pbUserProgress.totalAttempted = d.totalAttempted || 0;
      pbUserProgress.totalCorrect = d.totalCorrect || 0;
      pbUserProgress.totalTimeSec = d.totalTimeSec || 0;
    }
  } catch (e) { console.error(e); }
}

async function flushPracticeProgressToFirestore() {
  if (!currentStudent || pbUnsavedWrites === 0) return;
  pbUnsavedWrites = 0;
  try {
    await db.collection("practice_progress").doc(currentStudent.studentId).set({
      attemptedMap: pbUserProgress.attemptedMap,
      totalAttempted: pbUserProgress.totalAttempted,
      totalCorrect: pbUserProgress.totalCorrect,
      totalTimeSec: pbUserProgress.totalTimeSec,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) { console.error(e); }
}

async function openSmartPracticeBank() {
  if (!currentStudent) {
    navigateTo("login");
    const err = document.getElementById("loginInlineError");
    if (err) {
      err.textContent = "Please log in or register free to access Unlimited Smart Practice Bank.";
      err.classList.remove("hidden");
    }
    return;
  }

  ["view-home", "view-login", "view-register", "view-dashboard", "view-dynamic"].forEach(id => {
    document.getElementById(id)?.classList.add("hidden");
  });
  document.getElementById("view-practice-bank").classList.remove("hidden");
  updatePbAnalyticsUI();

  showProcessing("Loading Smart Practice Bank...", "Fetching subjects and topics");
  try {
    // Reads bundle index doc (only 1 Firestore read for entire catalog!)
    const indexSnap = await db.collection("settings").doc("practice_catalog").get();
    if (indexSnap.exists && Array.isArray(indexSnap.data().bundles)) {
      pbMetaIndex = indexSnap.data().bundles;
    } else {
      // Fallback: list practice_bank docs if catalog doc not built yet
      const bSnap = await db.collection("practice_bank").get();
      pbMetaIndex = bSnap.docs.map(d => ({
        bundleId: d.id,
        subject: d.data().subject || "General",
        topic: d.data().topic || "Mixed",
        packIndex: d.data().packIndex || 1,
        count: (d.data().questions || []).length
      }));
    }
    hideProcessing();
    renderPbSubjects();
  } catch (e) {
    hideProcessing();
    alert("Could not load Practice Bank: " + e.message);
  }
}

function exitSmartPracticeBank() {
  clearInterval(pbTimerInterval);
  flushPracticeProgressToFirestore();
  navigateTo(currentStudent ? "dashboard" : "home");
}

function updatePbAnalyticsUI() {
  const att = pbUserProgress.totalAttempted || 0;
  const cor = pbUserProgress.totalCorrect || 0;
  const sec = pbUserProgress.totalTimeSec || 0;
  const acc = att > 0 ? Math.round((cor / att) * 100) : 0;
  const avg = att > 0 ? Math.round(sec / att) : 0;

  document.getElementById("pbStatAttempted").textContent = `${att} Qs`;
  document.getElementById("pbStatAccuracy").textContent = `${acc}%`;
  document.getElementById("pbStatAvgTime").textContent = `${avg}s`;
}

function renderPbSubjects() {
  document.getElementById("pbHeaderTitle").textContent = "Unlimited Smart Practice Bank";
  document.getElementById("pbHeaderSub").textContent = "Select a subject to start Topic-Wise or Mix Practice";
  document.getElementById("pbBackBtn").classList.add("hidden");
  document.getElementById("pbLevelSubjects").classList.remove("hidden");
  document.getElementById("pbLevelModes").classList.add("hidden");
  document.getElementById("pbLevelArena").classList.add("hidden");

  const subjectMap = {};
  pbMetaIndex.forEach(b => {
    const s = b.subject || "General";
    if (!subjectMap[s]) subjectMap[s] = { topics: new Set(), totalQs: 0 };
    subjectMap[s].topics.add(b.topic);
    subjectMap[s].totalQs += Number(b.count || 0);
  });

  const grid = document.getElementById("pbLevelSubjects");
  const subjects = Object.keys(subjectMap);
  if (subjects.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; padding:16px; color:#64748b;">No practice questions uploaded yet. Check back soon!</div>`;
    return;
  }

  grid.innerHTML = subjects.map(sub => `
    <div class="pb-subject-card" onclick="selectPbSubject('${sub.replace(/'/g, "\\'")}')">
      <div style="font-size:15.5px; font-weight:700; color:#0f172a; margin-bottom:4px;">${sub}</div>
      <div style="font-size:12px; color:#64748b;">${subjectMap[sub].topics.size} Topics &bull; ${subjectMap[sub].totalQs} Questions</div>
    </div>
  `).join("");
}

function selectPbSubject(subject) {
  pbCurrentSubject = subject;
  document.getElementById("pbHeaderTitle").textContent = subject + " — Smart Practice";
  document.getElementById("pbHeaderSub").textContent = "Choose Mix Practice or select a specific Topic below";
  document.getElementById("pbBackBtn").classList.remove("hidden");
  document.getElementById("pbBackBtn").onclick = renderPbSubjects;

  document.getElementById("pbLevelSubjects").classList.add("hidden");
  document.getElementById("pbLevelModes").classList.remove("hidden");
  document.getElementById("pbLevelArena").classList.add("hidden");

  const topicCounts = {};
  pbMetaIndex.filter(b => b.subject === subject).forEach(b => {
    topicCounts[b.topic] = (topicCounts[b.topic] || 0) + Number(b.count || 0);
  });

  const list = document.getElementById("pbTopicsList");
  list.innerHTML = Object.keys(topicCounts).map(topic => `
    <div class="pb-topic-row" onclick="startTopicPractice('${topic.replace(/'/g, "\\'")}')">
      <div>
        <strong style="font-size:13.5px; color:#0f172a;">${topic}</strong>
        <div style="font-size:11.5px; color:#64748b;">First 15 Questions Free &bull; Total ${topicCounts[topic]} Questions</div>
      </div>
      <span style="font-size:12.5px; font-weight:600; color:#2563eb;">Practice &rarr;</span>
    </div>
  `).join("");
}

async function fetchBundleQuestions(bundleId) {
  if (pbLoadedBundles[bundleId]) return pbLoadedBundles[bundleId];
  const doc = await db.collection("practice_bank").doc(bundleId).get();
  const qs = doc.exists ? (doc.data().questions || []) : [];
  pbLoadedBundles[bundleId] = qs;
  return qs;
}

// Start Topic-Wise Practice (First 15 questions free per topic; rest require Pro Pass)
async function startTopicPractice(topic) {
  pbCurrentMode = "topic";
  pbCurrentTopic = topic;
  showProcessing(`Loading ${topic}...`, "Fetching smart question bundle");

  try {
    const matchingBundles = pbMetaIndex
      .filter(b => b.subject === pbCurrentSubject && b.topic === topic)
      .sort((a, b) => (a.packIndex || 1) - (b.packIndex || 1));

    let allTopicQs = [];
    for (const b of matchingBundles) {
      const qs = await fetchBundleQuestions(b.bundleId);
      allTopicQs = allTopicQs.concat(qs);
      // Free users only need Pack 1 (since first 15 Qs are in Pack 1) -> saves extra reads!
      if (!isStudentProActive() && allTopicQs.length >= 15) break;
    }

    // Apply 15-question free limit per topic for non-Pro registered students
    if (!isStudentProActive()) {
      allTopicQs = allTopicQs.slice(0, 15);
    }

    hideProcessing();
    launchPracticeArena(allTopicQs, `${pbCurrentSubject} • ${topic}`);
  } catch (e) {
    hideProcessing();
    alert("Error loading topic: " + e.message);
  }
}

// Start Mix Practice (Combines random questions across ALL topics of the subject)
async function startSubjectMixPractice() {
  pbCurrentMode = "mix";
  pbCurrentTopic = "All Topics Mix";
  showProcessing(`Preparing ${pbCurrentSubject} Mix Practice...`, "Combining questions from all topics");

  try {
    const subjectBundles = pbMetaIndex.filter(b => b.subject === pbCurrentSubject);
    // Group by topic and take Pack 1 of each topic to keep Firestore reads minimal
    const firstPackByTopic = {};
    subjectBundles.forEach(b => {
      if (!firstPackByTopic[b.topic] || (b.packIndex || 1) < (firstPackByTopic[b.topic].packIndex || 1)) {
        firstPackByTopic[b.topic] = b;
      }
    });

    let mixedPool = [];
    for (const topicName of Object.keys(firstPackByTopic)) {
      const qs = await fetchBundleQuestions(firstPackByTopic[topicName].bundleId);
      const allowed = isStudentProActive() ? qs : qs.slice(0, 15);
      mixedPool = mixedPool.concat(allowed);
    }

    // Shuffle mixed questions so topics rotate continuously (1 Vilom, 1 Paryayvachi, 1 Muhavra...)
    for (let i = mixedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixedPool[i], mixedPool[j]] = [mixedPool[j], mixedPool[i]];
    }

    hideProcessing();
    launchPracticeArena(mixedPool, `${pbCurrentSubject} • Mix Practice`);
  } catch (e) {
    hideProcessing();
    alert("Error starting Mix Practice: " + e.message);
  }
}

function launchPracticeArena(allQuestions, titleLabel) {
  window._pbFullQuestionPool = allQuestions;
  pbSessionCorrect = 0;
  pbSessionWrong = 0;
  pbStreakCount = 0;

  document.getElementById("pbHeaderTitle").textContent = titleLabel;
  document.getElementById("pbHeaderSub").textContent = isStudentProActive()
    ? "Pro Pass Active — Unlimited Access"
    : "Free Tier: First 15 questions per topic unlocked. Upgrade Pass for full bank.";
  document.getElementById("pbBackBtn").onclick = () => {
    clearInterval(pbTimerInterval);
    flushPracticeProgressToFirestore();
    selectPbSubject(pbCurrentSubject);
  };

  document.getElementById("pbLevelModes").classList.add("hidden");
  document.getElementById("pbLevelArena").classList.remove("hidden");
  switchPbPool("unattempted");
}

function switchPbPool(poolType) {
  pbPoolMode = poolType;
  const fullPool = window._pbFullQuestionPool || [];
  const unattempted = fullPool.filter(q => !pbUserProgress.attemptedMap[q.id]);
  const attempted = fullPool.filter(q => !!pbUserProgress.attemptedMap[q.id]);

  document.getElementById("pbUnattemptedCount").textContent = unattempted.length;
  document.getElementById("pbAttemptedCount").textContent = attempted.length;

  document.getElementById("pbFilterUnattempted").className = poolType === "unattempted" ? "btn btn-primary" : "btn btn-outline";
  document.getElementById("pbFilterAttempted").className = poolType === "attempted" ? "btn btn-primary" : "btn btn-outline";

  pbActiveQuestions = poolType === "unattempted" ? unattempted : attempted;
  pbCurrentIndex = 0;
  renderCurrentPracticeQuestion();
}

function startQuestionStopwatch() {
  clearInterval(pbTimerInterval);
  pbQuestionSeconds = 0;
  document.getElementById("pbLiveTimer").textContent = "00:00";
  pbTimerInterval = setInterval(() => {
    pbQuestionSeconds++;
    const m = String(Math.floor(pbQuestionSeconds / 60)).padStart(2, "0");
    const s = String(pbQuestionSeconds % 60).padStart(2, "0");
    document.getElementById("pbLiveTimer").textContent = `${m}:${s}`;
  }, 1000);
}

function renderCurrentPracticeQuestion() {
  const streakEl = document.getElementById("pbStreakBanner");
  streakEl.classList.add("hidden");

  if (!pbActiveQuestions || pbActiveQuestions.length === 0) {
    clearInterval(pbTimerInterval);
    document.getElementById("pbQMeta").textContent = pbCurrentTopic;
    document.getElementById("pbQCounter").textContent = "0 / 0";
    document.getElementById("pbQText").innerHTML = pbPoolMode === "unattempted"
      ? (isStudentProActive()
          ? "You have completed all available questions in this section! Switch to the <strong>Attempted</strong> tab to revise or re-practice."
          : "You have completed all 15 free questions in this topic! <strong>Upgrade to All-Access Pass</strong> to unlock hundreds more questions.")
      : "No attempted questions here yet. Switch to <strong>Not Attempted</strong> to start practicing!";
    document.getElementById("pbOptionsWrap").innerHTML = !isStudentProActive() && pbPoolMode === "unattempted"
      ? `<button class="btn btn-primary" onclick="openUpgradeModal()">Unlock Full Practice Bank</button>`
      : "";
    document.getElementById("pbExplanationBox").textContent = "Select a question to view its detailed explanation.";
    return;
  }

  const q = pbActiveQuestions[pbCurrentIndex];
  document.getElementById("pbQMeta").textContent = `Topic: ${q.topic || pbCurrentTopic}`;
  document.getElementById("pbQCounter").textContent = `Q ${pbCurrentIndex + 1} of ${pbActiveQuestions.length}`;
  document.getElementById("pbQText").textContent = q.question;

  const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
  document.getElementById("pbOptionsWrap").innerHTML = opts.map((optText, i) => `
    <button type="button" class="pb-opt-btn" id="pbOptBtn-${i}" onclick="answerPracticeQuestion(${i})">
      <strong>${String.fromCharCode(65 + i)}.</strong> ${optText || ""}
    </button>
  `).join("");

  document.getElementById("pbExplanationBox").innerHTML = `Select an option to check your answer and read the explanation.`;
  startQuestionStopwatch();
}

function answerPracticeQuestion(chosenIdx) {
  clearInterval(pbTimerInterval);
  const q = pbActiveQuestions[pbCurrentIndex];
  if (!q) return;

  const rightIdx = ["A", "B", "C", "D"].indexOf(String(q.correctOption || "A").trim().toUpperCase());
  const isCorrect = chosenIdx === rightIdx;

  // Disable option buttons & highlight Green / Red
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`pbOptBtn-${i}`);
    if (!btn) continue;
    btn.disabled = true;
    if (i === rightIdx) btn.classList.add("opt-correct");
    else if (i === chosenIdx && !isCorrect) btn.classList.add("opt-wrong");
  }

  // Update streak & fun feedback
  const streakEl = document.getElementById("pbStreakBanner");
  if (isCorrect) {
    pbSessionCorrect++;
    pbStreakCount = pbStreakCount > 0 ? pbStreakCount + 1 : 1;
    if (pbStreakCount >= 3 && pbStreakCount % 3 === 0) {
      streakEl.className = "streak-toast streak-proud";
      streakEl.textContent = `Hat-trick! ${pbStreakCount} Sahi Lagatar — Zabardast Taiyari!`;
      streakEl.classList.remove("hidden");
    } else {
      streakEl.classList.add("hidden");
    }
  } else {
    pbSessionWrong++;
    pbStreakCount = pbStreakCount < 0 ? pbStreakCount - 1 : -1;
    if (pbStreakCount <= -3 && Math.abs(pbStreakCount) % 3 === 0) {
      streakEl.className = "streak-toast streak-sad";
      streakEl.textContent = `3 Lagatar Galat Ho Gaye — Koi Baat Nahi, Neeche Explanation Dhyan Se Padhein!`;
      streakEl.classList.remove("hidden");
    } else {
      streakEl.classList.add("hidden");
    }
  }

  document.getElementById("pbSessCorrect").textContent = pbSessionCorrect;
  document.getElementById("pbSessWrong").textContent = pbSessionWrong;

  // Show instant explanation (Right panel on Desktop, Bottom on Mobile)
  const statusLine = isCorrect
    ? `<div style="color:#15803d; font-weight:700; margin-bottom:6px;">Sahi Jawab! (${pbQuestionSeconds}s)</div>`
    : `<div style="color:#dc2626; font-weight:700; margin-bottom:6px;">Galat Jawab — Sahi Option: ${String.fromCharCode(65 + rightIdx)} (${pbQuestionSeconds}s)</div>`;
  document.getElementById("pbExplanationBox").innerHTML = `
    ${statusLine}
    <div>${q.explanation || "Correct answer is Option " + String.fromCharCode(65 + rightIdx) + "."}</div>
  `;

  // Save progress locally & batch-sync to Firestore every 10 answers
  const wasAlreadyAttempted = !!pbUserProgress.attemptedMap[q.id];
  pbUserProgress.attemptedMap[q.id] = { isCorrect, chosen: chosenIdx, timeSec: pbQuestionSeconds };
  if (!wasAlreadyAttempted) {
    pbUserProgress.totalAttempted = (pbUserProgress.totalAttempted || 0) + 1;
    if (isCorrect) pbUserProgress.totalCorrect = (pbUserProgress.totalCorrect || 0) + 1;
    pbUserProgress.totalTimeSec = (pbUserProgress.totalTimeSec || 0) + pbQuestionSeconds;
  }

  updatePbAnalyticsUI();
  pbUnsavedWrites++;
  if (pbUnsavedWrites >= 10) {
    flushPracticeProgressToFirestore();
  }
}

function nextPracticeQuestion() {
  if (pbCurrentIndex < pbActiveQuestions.length - 1) {
    pbCurrentIndex++;
    renderCurrentPracticeQuestion();
  } else {
    // Refresh pool counts
    switchPbPool(pbPoolMode);
  }
}

function prevPracticeQuestion() {
  if (pbCurrentIndex > 0) {
    pbCurrentIndex--;
    renderCurrentPracticeQuestion();
  }
}

// ----------------------------------------------------------------------------
// 5. Clean Subscription Checkout & Referral Coupon Logic
// ----------------------------------------------------------------------------
function openUpgradeModal() {
  if (!currentStudent) return navigateTo("login");
  appliedPartner = null;
  document.getElementById("checkoutCouponInput").value = "";
  document.getElementById("couponStatusMsg").textContent = "";
  selectSubscriptionPlan("3m", "3 Months Pass", 149, 119, 90);
  document.getElementById("upgradeModal").classList.remove("hidden");
}

function closeUpgradeModal() {
  document.getElementById("upgradeModal").classList.add("hidden");
}

function selectSubscriptionPlan(id, name, mrp, price, days) {
  selectedPlan = { id, name, mrp, price, days };
  ["3m", "6m", "12m"].forEach(k => {
    document.getElementById("planCard-" + k)?.classList.toggle("active", k === id);
  });
  recalculateCheckoutSummary();
}

function recalculateCheckoutSummary() {
  const offerDisc = selectedPlan.mrp - selectedPlan.price;
  const couponDisc = appliedPartner ? Number(appliedPartner.discountAmount || 20) : 0;
  const extraDays = appliedPartner ? Number(appliedPartner.extraDays || 15) : 0;
  const finalPayable = Math.max(1, selectedPlan.price - couponDisc);
  const totalDays = selectedPlan.days + extraDays;

  document.getElementById("sumPlanName").textContent = selectedPlan.name;
  document.getElementById("sumValidity").textContent = extraDays > 0
    ? `${selectedPlan.days} + ${extraDays} Bonus = ${totalDays} Days`
    : `${selectedPlan.days} Days`;
  document.getElementById("sumMrp").innerHTML = `&#8377;${selectedPlan.mrp}`;
  document.getElementById("sumOfferDisc").innerHTML = `- &#8377;${offerDisc}`;

  const cRow = document.getElementById("sumCouponRow");
  if (appliedPartner) {
    cRow.classList.remove("hidden");
    document.getElementById("sumCouponDisc").innerHTML = `- &#8377;${couponDisc} + ${extraDays} Extra Days (${appliedPartner.couponCode})`;
  } else {
    cRow.classList.add("hidden");
  }

  document.getElementById("sumTotalPayable").innerHTML = `&#8377;${finalPayable}`;
  document.getElementById("btnPayRazorpay").innerHTML = `Pay &#8377;${finalPayable} Securely via Razorpay`;
}

async function applyReferralCoupon() {
  const code = document.getElementById("checkoutCouponInput").value.trim().toUpperCase();
  const msg = document.getElementById("couponStatusMsg");
  if (!code) {
    msg.style.color = "#dc2626"; msg.textContent = "Please enter a referral coupon code."; return;
  }

  msg.style.color = "#475569"; msg.textContent = "Verifying coupon...";
  try {
    const snap = await db.collection("partners")
      .where("couponCode", "==", code)
      .where("status", "==", "approved")
      .limit(1)
      .get();

    if (snap.empty) {
      appliedPartner = null;
      msg.style.color = "#dc2626";
      msg.textContent = "Invalid or inactive coupon code.";
      recalculateCheckoutSummary();
      return;
    }

    appliedPartner = { docId: snap.docs[0].id, ...snap.docs[0].data() };
    msg.style.color = "#15803d";
    msg.textContent = `Applied! You get Rs.${appliedPartner.discountAmount || 20} instant discount + ${appliedPartner.extraDays || 15} extra validity days.`;
    recalculateCheckoutSummary();
  } catch (e) {
    msg.style.color = "#dc2626"; msg.textContent = "Error checking coupon: " + e.message;
  }
}

function startRazorpayCheckout() {
  const couponDisc = appliedPartner ? Number(appliedPartner.discountAmount || 20) : 0;
  const extraDays = appliedPartner ? Number(appliedPartner.extraDays || 15) : 0;
  const finalPayable = Math.max(1, selectedPlan.price - couponDisc);
  const totalDays = selectedPlan.days + extraDays;

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: finalPayable * 100,
    currency: "INR",
    name: "TaiyariGhar",
    description: `${selectedPlan.name} (${totalDays} Days)`,
    prefill: {
      name: currentStudent.name,
      email: currentStudent.email,
      contact: currentStudent.mobile
    },
    handler: async function (response) {
      showProcessing("Activating your Pass...", "Generating receipt and updating validity");
      try {
        const now = new Date();
        const currentExp = currentStudent.passExpiry && new Date(currentStudent.passExpiry) > now
          ? new Date(currentStudent.passExpiry)
          : now;
        const newExpiry = new Date(currentExp.getTime() + totalDays * 86400000);
        const expiryIso = newExpiry.toISOString();
        const expiryFormatted = newExpiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const invoiceNumber = "INV-" + Date.now().toString().slice(-6);

        await db.collection("students").doc(currentStudent.studentId).update({
          passPlan: selectedPlan.name,
          passExpiry: expiryIso
        });

        await db.collection("payments").add({
          invoiceNumber,
          paymentId: response.razorpay_payment_id,
          studentId: currentStudent.studentId,
          studentName: currentStudent.name,
          email: currentStudent.email,
          planName: selectedPlan.name,
          amount: finalPayable,
          validityDays: totalDays,
          couponCode: appliedPartner ? appliedPartner.couponCode : "",
          partnerId: appliedPartner ? appliedPartner.partnerId : "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Credit referral partner commission automatically
        if (appliedPartner && appliedPartner.docId) {
          const comm = Number(appliedPartner.commissionPerSale || 25);
          await db.collection("partners").doc(appliedPartner.docId).update({
            usedCount: firebase.firestore.FieldValue.increment(1),
            totalCommission: firebase.firestore.FieldValue.increment(comm)
          });
        }

        // Send invoice email
        fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "send_invoice",
            email: currentStudent.email,
            invoiceNumber,
            paymentId: response.razorpay_payment_id,
            studentName: currentStudent.name,
            loginId: currentStudent.studentId,
            planName: selectedPlan.name,
            mrp: selectedPlan.mrp,
            discount: selectedPlan.mrp - finalPayable,
            amount: finalPayable,
            validityDays: totalDays,
            expiryDate: expiryFormatted
          })
        }).catch(() => {});

        currentStudent.passPlan = selectedPlan.name;
        currentStudent.passExpiry = expiryIso;
        localStorage.setItem("tg_student_session", JSON.stringify(currentStudent));

        hideProcessing();
        closeUpgradeModal();
        renderStudentDashboard();
        alert(`Payment Successful! Your ${selectedPlan.name} is active till ${expiryFormatted}.`);
      } catch (err) {
        hideProcessing();
        alert("Payment captured, contact support if pass not updated: " + err.message);
      }
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

// ----------------------------------------------------------------------------
// 6. Home Categories, Live Tests, Current Affairs & Updates Pages
// ----------------------------------------------------------------------------
async function loadHomeCategories() {
  const grid = document.getElementById("homeCategoriesGrid");
  if (!grid) return;
  try {
    const snap = await db.collection("exam_categories").get();
    if (snap.empty) {
      grid.innerHTML = `<div style="color:#64748b; font-size:13px;">SSC, Railway, UP Police, Banking &amp; State Exam test series available after login.</div>`;
      return;
    }
    grid.innerHTML = snap.docs.map(d => {
      const c = d.data();
      return `
        <div class="pb-subject-card" onclick="navigateTo('dashboard')">
          <div style="font-size:15px; font-weight:700; color:#0f172a;">${c.name || d.id}</div>
          <div style="font-size:12px; color:#64748b; margin-top:4px;">${c.description || "Bilingual Mock Tests & PYQs"}</div>
        </div>
      `;
    }).join("");
  } catch (e) { console.error(e); }
}

async function renderLiveTestsPage() {
  const dyn = document.getElementById("view-dynamic");
  dyn.innerHTML = `<div style="padding:20px; color:#64748b;">Loading All-India Live Exams...</div>`;
  const snap = await db.collection("tests").where("testType", "==", "live").get();
  if (snap.empty) {
    dyn.innerHTML = `<div class="pb-workspace"><h2>All-India Live Exams</h2><p style="color:#64748b; margin-top:6px;">No live exam scheduled right now. Check back soon!</p></div>`;
    return;
  }
  dyn.innerHTML = `
    <div class="pb-workspace">
      <h2 style="margin-bottom:12px;">All-India Live Exams</h2>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
        ${snap.docs.map(doc => {
          const t = doc.data();
          return `
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:15px;">
              <div style="font-size:11px; font-weight:700; color:#dc2626;">LIVE EXAM</div>
              <div style="font-size:15px; font-weight:700; margin:4px 0;">${t.title}</div>
              <div style="font-size:12px; color:#64748b; margin-bottom:12px;">${t.totalQuestions || 0} Qs &bull; ${t.durationMinutes || 60} Mins</div>
              <button class="btn btn-primary" style="width:100%;" onclick="${currentStudent ? `launchMockTest('${doc.id}')` : `navigateTo('login')`}">Attempt Live Exam</button>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

async function renderCurrentAffairsPage() {
  const dyn = document.getElementById("view-dynamic");
  dyn.innerHTML = `<div style="padding:20px; color:#64748b;">Loading Current Affairs...</div>`;
  const snap = await db.collection("current_affairs").orderBy("createdAt", "desc").limit(20).get();
  dyn.innerHTML = `
    <div class="pb-workspace">
      <h2 style="margin-bottom:12px;">Daily &amp; Monthly Current Affairs</h2>
      ${snap.empty ? `<p style="color:#64748b;">No current affairs posts yet.</p>` : snap.docs.map(d => {
        const item = d.data();
        return `
          <div style="border-bottom:1px solid #e2e8f0; padding:12px 0;">
            <strong style="font-size:14.5px; color:#0f172a;">${item.title || "Current Affairs Update"}</strong>
            <p style="font-size:13px; color:#475569; margin-top:4px;">${item.summary || item.content || ""}</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function renderUpdatesPage() {
  const dyn = document.getElementById("view-dynamic");
  dyn.innerHTML = `<div style="padding:20px; color:#64748b;">Loading Latest Govt Jobs &amp; Syllabus...</div>`;
  const snap = await db.collection("job_updates").orderBy("createdAt", "desc").limit(20).get();
  dyn.innerHTML = `
    <div class="pb-workspace">
      <h2 style="margin-bottom:12px;">Latest Govt Jobs, Admit Cards &amp; Syllabus</h2>
      ${snap.empty ? `<p style="color:#64748b;">No job notifications posted yet.</p>` : snap.docs.map(d => {
        const j = d.data();
        return `
          <div style="border-bottom:1px solid #e2e8f0; padding:12px 0;">
            <strong style="font-size:14.5px; color:#0f172a;">${j.title || "Notification"}</strong>
            <p style="font-size:13px; color:#475569; margin-top:4px;">${j.description || ""}</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", async () => {
  const saved = localStorage.getItem("tg_student_session");
  if (saved) {
    try {
      currentStudent = JSON.parse(saved);
      await loadStudentPracticeProgress();
    } catch (e) { currentStudent = null; }
  }
  updateHeaderAuthUI();

  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  if (page === "practice-bank") {
    openSmartPracticeBank();
  } else if (page && ["live-tests", "current-affairs", "updates", "login", "register", "dashboard"].includes(page)) {
    navigateTo(page);
  } else {
    navigateTo("home");
  }
});
