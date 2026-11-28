// TaiyariGhar Admin Control Panel Script (admin-app.js v33.0)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxvoU_mH8BjfE7QdC_UOQyzDfmJsUoVcIvq9Kp3VtXutzYTFRFY0vXpzw6Uv2XAjnng5Q/exec";

const firebaseConfig = {
  apiKey: "AIzaSyA7x6gQziPYlxrXnyVJJ80mvJkh3VCm24",
  authDomain: "taiyarighar.firebaseapp.com",
  projectId: "taiyarighar",
  storageBucket: "taiyarighar.firebasestorage.app",
  messagingSenderId: "329150812714",
  appId: "1:329150812714:web:1f292d05aaba0cb918e953"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentAdminTab = "overview";
let loadedTabs = {};

let cacheCategories = [];
let cacheTests = [];
let cacheBundles = [];
let allPartnersList = [];
let cacheStudents = [];
let cachePayments = [];
let cacheResults = [];
let cacheReports = [];
let cacheJobs = [];
let cacheCaArticles = [];
let cacheStudyNotes = [];

let partnerSubFilter = "pending";
let approvingPartnerDoc = null;
let partnerRegOpen = true;
let editingStudentDocId = null;

const safeGet = (colName) => db.collection(colName).get().catch(() => ({ size: 0, docs: [], forEach: () => {} }));

function showAdminWorkspaceUI() {
  document.getElementById("adminLoginGate").classList.add("hidden");
  document.getElementById("adminWorkspace").classList.remove("hidden");
  loadOverviewStats();
}

function showAdminLoginUI() {
  document.getElementById("adminLoginGate").classList.remove("hidden");
  document.getElementById("adminWorkspace").classList.add("hidden");
}

auth.onAuthStateChanged(user => {
  if (user || sessionStorage.getItem("tg_admin_fs_auth") === "1") {
    showAdminWorkspaceUI();
  } else {
    showAdminLoginUI();
  }
});

window.loginAdmin = async function () {
  const email = document.getElementById("admEmail").value.trim().toLowerCase();
  const pass = document.getElementById("admPass").value;
  const err = document.getElementById("admLoginErr");
  err.innerText = "";

  if (!email || !pass) {
    err.innerText = "Please enter Admin Email and Password.";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    const code = e && e.code ? String(e.code) : "";
    const msg = e && e.message ? String(e.message) : "";
    if (code.includes("api-key") || msg.toLowerCase().includes("api-key") || msg.toLowerCase().includes("api key")) {
      try {
        const snap = await db.collection("settings").doc("admin_auth").get();
        if (snap.exists) {
          const cfg = snap.data();
          const allowedEmail = String(cfg.email || "madhupverma8@gmail.com").trim().toLowerCase();
          const allowedPass = String(cfg.password || "");
          if (allowedPass && email === allowedEmail && pass === allowedPass) {
            sessionStorage.setItem("tg_admin_fs_auth", "1");
            showAdminWorkspaceUI();
            return;
          }
        }
      } catch (fsErr) {
        console.error("Firestore admin fallback check failed:", fsErr);
      }
    }
    err.innerText = "Login failed: " + msg;
  }
};

window.logoutAdmin = function () {
  sessionStorage.removeItem("tg_admin_fs_auth");
  auth.signOut().catch(() => {});
  showAdminLoginUI();
};

const TAB_TITLES = {
  overview: "1. Overview & Platform Summary",
  categories: "2. Exam Categories & Sub-Categories Manager",
  tests: "3. Mock & All-India Live Tests Uploader",
  practice: "4. Unlimited Smart Practice Bank (100-Q Bundles)",
  partners: "5. Partners, Coupons & Payouts",
  students: "6. Students & Pro Pass Management",
  payments: "7. Subscription Payments & Invoices",
  results: "8. Test Results & Leaderboard",
  reports: "9. Reported Questions / Error Reports",
  updates: "10. Current Affairs, Jobs, Results & Study Notes",
  banners: "11. Self-Promotion & Sponsor Banners",
  settings: "12. Pro Pass Pricing & Global Settings"
};

window.switchAdminTab = function (tabKey) {
  currentAdminTab = tabKey;
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const nav = document.getElementById("nav-" + tabKey);
  if (nav) nav.classList.add("active");
  document.getElementById("topbarTitle").innerText = TAB_TITLES[tabKey] || "Admin Control Panel";

  Object.keys(TAB_TITLES).forEach(k => {
    const el = document.getElementById("tab-" + k);
    if (el) el.classList.toggle("hidden", k !== tabKey);
  });

  if (!loadedTabs[tabKey]) {
    loadTabOnDemand(tabKey);
  }
};

window.refreshCurrentTab = function () {
  loadedTabs[currentAdminTab] = false;
  loadTabOnDemand(currentAdminTab);
};

async function loadTabOnDemand(tabKey) {
  loadedTabs[tabKey] = true;
  if (tabKey === "overview") return loadOverviewStats();
  if (tabKey === "categories") return loadCategoriesData();
  if (tabKey === "tests") return loadTestsData();
  if (tabKey === "practice") return loadPracticeBundlesData();
  if (tabKey === "partners") return loadPartnersData();
  if (tabKey === "students") return loadStudentsData();
  if (tabKey === "payments") return loadPaymentsData();
  if (tabKey === "results") return loadResultsData();
  if (tabKey === "reports") return loadReportsData();
  if (tabKey === "updates") return loadUpdatesData();
  if (tabKey === "settings") return loadPricingSettings();
}

// 1. OVERVIEW
async function loadOverviewStats() {
  const [stSnap, tSnap, pbSnap, pSnap, repSnap] = await Promise.all([
    safeGet("students"),
    safeGet("tests"),
    safeGet("practice_bank_bundles"),
    safeGet("partners"),
    safeGet("reported_questions")
  ]);
  cacheStudents = stSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  loadedTabs["students"] = true;

  document.getElementById("kpiStudents").innerText = cacheStudents.length;
  document.getElementById("kpiPro").innerText = cacheStudents.filter(s => s.isPaid).length;
  document.getElementById("kpiTests").innerText = tSnap.size;

  let totalPbQs = 0;
  pbSnap.forEach(doc => {
    const b = doc.data();
    totalPbQs += Number(b.questionCount || (Array.isArray(b.questions) ? b.questions.length : 0));
  });
  document.getElementById("kpiPracticeQs").innerText = totalPbQs;

  allPartnersList = pSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
  loadedTabs["partners"] = true;
  document.getElementById("kpiPartners").innerText = allPartnersList.filter(p => p.status === "approved").length;

  cacheReports = repSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
  loadedTabs["reports"] = true;
  document.getElementById("kpiReports").innerText = cacheReports.filter(r => r.status !== "resolved").length;
}

// 2. EXAM CATEGORIES
async function loadCategoriesData() {
  const snap = await safeGet("exam_categories");
  cacheCategories = snap.docs.map(d => ({ docId: d.id, ...d.data() })).sort((a, b) => (a.order || 99) - (b.order || 99));
  renderCategoriesTable();
}

window.saveExamCategory = async function () {
  const mainName = document.getElementById("catMainName").value.trim();
  const subRaw = document.getElementById("catSubList").value.trim();
  const order = Number(document.getElementById("catOrder").value) || 1;
  const msg = document.getElementById("catSaveMsg");

  if (!mainName) { alert("Please enter Main Category Name."); return; }
  const subCategories = subRaw ? subRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
  const docId = mainName.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  msg.innerText = "Saving...";
  await db.collection("exam_categories").doc(docId).set({
    name: mainName,
    subCategories,
    order,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  msg.style.color = "#166534";
  msg.innerText = "Category Saved!";
  document.getElementById("catMainName").value = "";
  document.getElementById("catSubList").value = "";
  loadCategoriesData();
};

window.renderCategoriesTable = function () {
  const q = (document.getElementById("catSearchBox")?.value || "").toLowerCase();
  const body = document.getElementById("categoriesTableBody");
  if (!body) return;
  const list = cacheCategories.filter(c => !q || (c.name || "").toLowerCase().includes(q) || (c.subCategories || []).join(",").toLowerCase().includes(q));
  body.innerHTML = list.map(c => `<tr>
    <td>${c.order || "-"}</td>
    <td><strong>${c.name || c.docId}</strong></td>
    <td>${(c.subCategories || []).join(", ") || "-"}</td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteDocAndReload('exam_categories','${c.docId}','categories')">Delete</button></td>
  </tr>`).join("") || `<tr><td colspan="4" style="color:#64748b;">No categories found.</td></tr>`;
};

// 3. MOCK & LIVE TESTS
async function loadTestsData() {
  const snap = await safeGet("tests");
  cacheTests = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderTestsTable();
}

window.renderTestsTable = function (showAll = false) {
  const q = (document.getElementById("testSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("testsTableBody");
  if (!body) return;
  if (!q && !showAll) {
    body.innerHTML = `<tr><td colspan="6" style="color:#64748b;">Total ${cacheTests.length} tests in database. Type in the search box above or click "Show All Tests" to view.</td></tr>`;
    return;
  }
  const list = showAll && !q
    ? cacheTests
    : cacheTests.filter(t => (t.title || "").toLowerCase().includes(q) || (t.mainCat || "").toLowerCase().includes(q) || (t.subCat || "").toLowerCase().includes(q));
  body.innerHTML = list.slice(0, 60).map(t => `<tr>
    <td><strong>${t.title || t.docId}</strong></td>
    <td>${t.mainCat || "-"} / ${t.subCat || "-"}</td>
    <td>${t.isLive ? "All-India Live" : "Standard Mock"}</td>
    <td>${Array.isArray(t.questions) ? t.questions.length : 0} Qs</td>
    <td><span class="tag ${t.isFree ? 'tag-ok' : ''}">${t.isFree ? 'Free' : 'Pro Pass'}</span></td>
    <td><button class="btn btn-danger btn-sm" onclick="deleteDocAndReload('tests','${t.docId}','tests')">Delete</button></td>
  </tr>`).join("") || `<tr><td colspan="6" style="color:#64748b;">No tests matching search.</td></tr>`;
};

window.downloadSampleTestTemplate = function () {
  const ws = XLSX.utils.json_to_sheet([{
    Question: "What is the capital of India?",
    QuestionHi: "भारत की राजधानी क्या है?",
    OptionA: "Mumbai", OptionB: "New Delhi", OptionC: "Kolkata", OptionD: "Chennai",
    OptionAHi: "मुंबई", OptionBHi: "नई दिल्ली", OptionCHi: "कोलकाता", OptionDHi: "चेन्नई",
    CorrectOption: "B",
    Explanation: "New Delhi is the capital of India.",
    ExplanationHi: "नई दिल्ली भारत की राजधानी है।"
  }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MockTestQuestions");
  XLSX.writeFile(wb, "TaiyariGhar_MockTest_Bilingual_Template.xlsx");
};

window.createTestFromExcel = async function () {
  const title = document.getElementById("tTitle").value.trim();
  const cat = document.getElementById("tCat").value.trim();
  const subCat = document.getElementById("tSubCat").value.trim() || cat;
  const isLive = document.getElementById("tType").value === "live";
  const isFree = document.getElementById("tFree").value === "true";
  const duration = Number(document.getElementById("tDuration").value) || 60;
  const posMark = Number(document.getElementById("tPos").value) || 1;
  const negMark = Number(document.getElementById("tNeg").value) || 0;
  const liveEndTime = document.getElementById("tLiveEnd").value || "";
  const fileInput = document.getElementById("tFile");
  const msg = document.getElementById("tUploadMsg");

  if (!title || !cat || !fileInput.files.length) { alert("Title, Category, and Excel file are required."); return; }
  msg.innerText = "Uploading...";
  const data = await fileInput.files[0].arrayBuffer();
  const wb = XLSX.read(data);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  const questions = rows.map((r, i) => ({
    qId: "Q" + (i + 1),
    question: r.Question || "",
    questionHi: r.QuestionHi || r.Question || "",
    options: [r.OptionA || "", r.OptionB || "", r.OptionC || "", r.OptionD || ""],
    optionsHi: [r.OptionAHi || r.OptionA || "", r.OptionBHi || r.OptionB || "", r.OptionCHi || r.OptionC || "", r.OptionDHi || r.OptionD || ""],
    correctAnswer: ({ A: 0, B: 1, C: 2, D: 3 }[String(r.CorrectOption || "A").trim().toUpperCase()]) ?? 0,
    explanation: r.Explanation || "",
    explanationHi: r.ExplanationHi || r.Explanation || ""
  }));

  await db.collection("tests").add({
    title, mainCat: cat, subCat, examName: title,
    isLive, isFree, duration, posMark, negMark, liveEndTime,
    questions, createdAt: new Date().toISOString()
  });
  msg.style.color = "#166534";
  msg.innerText = `Test Published (${questions.length} Qs)!`;
  loadTestsData();
};

// 4. SMART PRACTICE BANK & NCERT BASE (LIGHTWEIGHT METADATA + SEPARATE QUESTION PAYLOADS FOR 10 LAKH+ Qs)
async function rebuildFastCatalogIndex(existingBundles = null) {
  const bundles = existingBundles || cacheBundles;
  const slimRecords = bundles.map(b => ({
    id: b.docId,
    sec: b.section || "practice",
    s: b.subject || "General",
    t: b.topic || "Mixed",
    p: b.packNumber || 1,
    c: Number(b.questionCount || (Array.isArray(b.questions) ? b.questions.length : 0))
  }));

  const SHARD_SIZE = 2500;
  const shardCount = Math.max(1, Math.ceil(slimRecords.length / SHARD_SIZE));
  const batch = db.batch();

  batch.set(db.collection("settings").doc("practice_catalog_meta"), {
    shardCount,
    totalBundles: slimRecords.length,
    totalQuestions: slimRecords.reduce((acc, x) => acc + x.c, 0),
    updatedAt: new Date().toISOString()
  });

  for (let i = 0; i < shardCount; i++) {
    const slice = slimRecords.slice(i * SHARD_SIZE, (i + 1) * SHARD_SIZE);
    batch.set(db.collection("settings").doc(`practice_catalog_shard_${i}`), {
      shardIndex: i,
      bundles: slice
    });
  }
  await batch.commit();
}

window.rebuildFastCatalogIndex = async function () {
  const statusEl = document.getElementById("pbUploadStatus");
  try {
    if (statusEl) { statusEl.style.color = "#1d4ed8"; statusEl.innerText = "Fetching bundles from database..."; }
    const snap = await Promise.race([
      db.collection("practice_bank_bundles").get(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("Request timed out. Check network or Firestore rules.")), 15000))
    ]);
    let migratedCount = 0;
    const slimList = [];

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const qCount = Number(d.questionCount || (Array.isArray(d.questions) ? d.questions.length : 0));
      // If an older bundle still stores heavy `questions` array directly on metadata doc, move it to `practice_bundle_data`!
      if (Array.isArray(d.questions) && d.questions.length > 0) {
        if (statusEl) statusEl.innerText = `Optimizing heavy bundle ${migratedCount + 1}...`;
        await db.collection("practice_bundle_data").doc(docSnap.id).set({
          questions: d.questions,
          updatedAt: new Date().toISOString()
        });
        await db.collection("practice_bank_bundles").doc(docSnap.id).set({
          section: d.section || "practice",
          subject: d.subject || "General",
          topic: d.topic || "Mixed",
          packNumber: d.packNumber || 1,
          questionCount: d.questions.length,
          updatedAt: new Date().toISOString()
        });
        migratedCount++;
      }
      slimList.push({
        docId: docSnap.id,
        section: d.section || "practice",
        subject: d.subject || "General",
        topic: d.topic || "Mixed",
        packNumber: d.packNumber || 1,
        questionCount: qCount
      });
    }

    cacheBundles = slimList;
    if (statusEl) statusEl.innerText = `Writing fast index for ${cacheBundles.length} bundle(s)...`;
    await rebuildFastCatalogIndex(cacheBundles);
    if (statusEl) {
      statusEl.style.color = "#166534";
      statusEl.innerText = `Fast Index Synced (${cacheBundles.length} bundles${migratedCount ? `, ${migratedCount} optimized` : ""})!`;
    }
    renderPracticeBundlesTable();
  } catch (err) {
    console.error("Sync Fast Index Error:", err);
    if (statusEl) {
      statusEl.style.color = "#dc2626";
      statusEl.innerText = "Sync Error: " + (err && err.message ? err.message : err);
    }
  }
};

async function loadPracticeBundlesData() {
  const body = document.getElementById("pbBundlesBody");
  if (body) body.innerHTML = `<tr><td colspan="7" style="color:#1d4ed8;">Loading bundle index...</td></tr>`;
  try {
    // Try fast sharded catalog first so Admin loads instantly even with 10,000+ bundles
    const metaSnap = await db.collection("settings").doc("practice_catalog_meta").get();
    if (metaSnap.exists && Number(metaSnap.data().shardCount || 0) > 0) {
      const count = Number(metaSnap.data().shardCount);
      const shardPromises = [];
      for (let i = 0; i < count; i++) {
        shardPromises.push(db.collection("settings").doc(`practice_catalog_shard_${i}`).get());
      }
      const shardSnaps = await Promise.all(shardPromises);
      const combined = [];
      shardSnaps.forEach(s => {
        if (s.exists && Array.isArray(s.data().bundles)) {
          s.data().bundles.forEach(b => {
            combined.push({
              docId: b.id,
              section: b.sec || "practice",
              subject: b.s || "General",
              topic: b.t || "Mixed",
              packNumber: b.p || 1,
              questionCount: Number(b.c || 0)
            });
          });
        }
      });
      if (combined.length > 0) {
        cacheBundles = combined;
        renderPracticeBundlesTable();
        return;
      }
    }
  } catch (e) {
    console.warn("Sharded admin index fallback:", e);
  }

  const snap = await safeGet("practice_bank_bundles");
  cacheBundles = snap.docs.map(d => {
    const data = d.data();
    return {
      docId: d.id,
      section: data.section || "practice",
      subject: data.subject || "General",
      topic: data.topic || "Mixed",
      packNumber: data.packNumber || 1,
      questionCount: Number(data.questionCount || (Array.isArray(data.questions) ? data.questions.length : 0))
    };
  });
  renderPracticeBundlesTable();
}

let lastRenderedPbList = [];

window.updatePbSelectedCount = function () {
  const cnt = document.querySelectorAll(".pb-row-chk:checked").length;
  const el = document.getElementById("pbSelCount");
  if (el) el.innerText = cnt;
};

window.toggleAllPbBundles = function (checked) {
  document.querySelectorAll(".pb-row-chk").forEach(cb => { cb.checked = checked; });
  updatePbSelectedCount();
};

window.bulkDeleteSelectedBundles = async function () {
  const ids = Array.from(document.querySelectorAll(".pb-row-chk:checked")).map(cb => cb.value);
  if (!ids.length) { alert("Pehle checkboxes select karein jin bundles ko delete karna hai."); return; }
  if (!confirm(`Kya aap selected ${ids.length} bundle(s) ko permanently delete karna chahte hain?`)) return;
  const statusEl = document.getElementById("pbUploadStatus");
  if (statusEl) statusEl.innerText = `Deleting ${ids.length} bundles...`;
  for (let i = 0; i < ids.length; i += 200) {
    const batch = db.batch();
    ids.slice(i, i + 200).forEach(id => {
      batch.delete(db.collection("practice_bank_bundles").doc(id));
      batch.delete(db.collection("practice_bundle_data").doc(id));
    });
    await batch.commit();
  }
  cacheBundles = cacheBundles.filter(b => !ids.includes(b.docId));
  await rebuildFastCatalogIndex(cacheBundles);
  if (statusEl) { statusEl.style.color = "#166534"; statusEl.innerText = `Deleted ${ids.length} bundle(s) successfully!`; }
  renderPracticeBundlesTable();
};

window.bulkDeleteFilteredBundles = async function () {
  const secFilter = document.getElementById("pbFilterSection")?.value || "all";
  const q = (document.getElementById("pbSearchBox")?.value || "").trim().toLowerCase();
  const targetList = (q || secFilter !== "all")
    ? cacheBundles.filter(b => {
        const matchSec = secFilter === "all" || (b.section || "practice") === secFilter;
        const matchQ = !q || (b.subject || "").toLowerCase().includes(q) || (b.topic || "").toLowerCase().includes(q) || (b.docId || "").toLowerCase().includes(q);
        return matchSec && matchQ;
      })
    : lastRenderedPbList;
  if (!targetList.length) { alert("Delete karne ke liye koi bundle list mein nahi hai."); return; }
  if (!confirm(`Kya aap in sabhi ${targetList.length} matching bundle(s) ko ek saath delete karna chahte hain?`)) return;
  const statusEl = document.getElementById("pbUploadStatus");
  if (statusEl) statusEl.innerText = `Bulk deleting ${targetList.length} bundles...`;
  const delIds = new Set(targetList.map(b => b.docId));
  for (let i = 0; i < targetList.length; i += 200) {
    const batch = db.batch();
    targetList.slice(i, i + 200).forEach(b => {
      batch.delete(db.collection("practice_bank_bundles").doc(b.docId));
      batch.delete(db.collection("practice_bundle_data").doc(b.docId));
    });
    await batch.commit();
  }
  cacheBundles = cacheBundles.filter(b => !delIds.has(b.docId));
  await rebuildFastCatalogIndex(cacheBundles);
  if (statusEl) { statusEl.style.color = "#166534"; statusEl.innerText = `Deleted ${targetList.length} bundle(s) successfully!`; }
  renderPracticeBundlesTable();
};

window.renderPracticeBundlesTable = function (showAll = false) {
  const secFilter = document.getElementById("pbFilterSection")?.value || "all";
  const q = (document.getElementById("pbSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("pbBundlesBody");
  if (!body) return;
  if (document.getElementById("pbSelectAllChk")) document.getElementById("pbSelectAllChk").checked = false;
  if (!q && secFilter === "all" && !showAll) {
    lastRenderedPbList = [];
    updatePbSelectedCount();
    const totalQs = cacheBundles.reduce((s, b) => s + Number(b.questionCount || (Array.isArray(b.questions) ? b.questions.length : 0)), 0);
    body.innerHTML = `<tr><td colspan="7" style="color:#64748b;">Total <strong>${cacheBundles.length}</strong> bundle(s) (${totalQs.toLocaleString()} Questions) in database. Filter by Section/Subject or click "Show Bundles".</td></tr>`;
    return;
  }
  const list = cacheBundles.filter(b => {
    const matchSec = secFilter === "all" || (b.section || "practice") === secFilter;
    const matchQ = !q || (b.subject || "").toLowerCase().includes(q) || (b.topic || "").toLowerCase().includes(q) || (b.docId || "").toLowerCase().includes(q);
    return matchSec && matchQ;
  });
  lastRenderedPbList = list;
  updatePbSelectedCount();
  body.innerHTML = list.slice(0, 250).map(b => {
    const isNcert = (b.section || "practice") === "ncert";
    const qCnt = Number(b.questionCount || (Array.isArray(b.questions) ? b.questions.length : 0));
    return `<tr>
      <td><input type="checkbox" class="pb-row-chk" value="${b.docId}" onchange="updatePbSelectedCount()" /></td>
      <td><span class="tag ${isNcert ? 'tag-ok' : ''}">${isNcert ? 'NCERT' : 'Practice'}</span></td>
      <td><strong>${b.subject || "-"}</strong></td>
      <td>${b.topic || "-"}</td>
      <td>Pack ${b.packNumber || 1}</td>
      <td>${qCnt} Qs</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteDocAndReload('practice_bank_bundles','${b.docId}','practice')">Delete</button></td>
    </tr>`;
  }).join("") || `<tr><td colspan="7" style="color:#64748b;">No bundles found.</td></tr>`;
};

window.uploadPracticeBankExcel = async function () {
  const fileInput = document.getElementById("pbExcelFile");
  const sectionType = document.getElementById("pbSectionType")?.value || "practice";
  const defSub = document.getElementById("pbDefSubject").value.trim();
  const defTop = document.getElementById("pbDefTopic").value.trim();
  const statusEl = document.getElementById("pbUploadStatus");
  const btn = document.getElementById("btnUploadPb");

  if (!fileInput.files.length) { alert("Please select an Excel or CSV file."); return; }
  if (btn) btn.disabled = true;
  statusEl.style.color = "#1d4ed8";
  statusEl.innerText = "Reading Excel file...";

  try {
    const data = await fileInput.files[0].arrayBuffer();
    const wb = XLSX.read(data);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    if (!rows.length) { statusEl.innerText = "File is empty."; return; }

    const grouped = {};
    rows.forEach(r => {
      const clsPrefix = r.ClassLevel ? `${String(r.ClassLevel).trim()} - ` : "";
      const rawSub = (r.Subject || defSub || (sectionType === "ncert" ? "NCERT General" : "General")).trim();
      const subj = clsPrefix && !rawSub.startsWith(clsPrefix) ? `${clsPrefix}${rawSub}` : rawSub;
      const top = (r.Topic || r.Chapter || defTop || "Mixed").trim();
      const key = `${sectionType}___${subj}___${top}`;
      if (!grouped[key]) grouped[key] = { section: sectionType, subject: subj, topic: top, items: [] };
      const ansChar = String(r.CorrectOption || r.Answer || "A").trim().toUpperCase();
      const ansIdx = { A: 0, B: 1, C: 2, D: 3 }[ansChar] ?? 0;
      const qIdx = grouped[key].items.length + 1;
      const qEnVal = r.Question || r["Question En"] || r["Question_En"] || "";
      const qHiVal = r.QuestionHi || r["Question Hi"] || r["Question_Hi"] || "";
      const expEnVal = r.Explanation || r["Explanation En"] || r["Explanation_En"] || "";
      const expHiVal = r.ExplanationHi || r["Explanation Hi"] || r["Explanation_Hi"] || "";
      grouped[key].items.push({
        id: `${sectionType}_${subj}_${top}_q${qIdx}_${Math.random().toString(36).slice(2, 6)}`.replace(/[^a-zA-Z0-9_]/g, "_"),
        topic: top,
        q: qEnVal || qHiVal || "",
        qHi: qHiVal || qEnVal || "",
        options: [r.OptionA || r.OptionAHi || "", r.OptionB || r.OptionBHi || "", r.OptionC || r.OptionCHi || "", r.OptionD || r.OptionDHi || ""],
        optionsHi: [r.OptionAHi || r.OptionA || "", r.OptionBHi || r.OptionB || "", r.OptionCHi || r.OptionC || "", r.OptionDHi || r.OptionD || ""],
        ans: ansIdx,
        exp: expEnVal || expHiVal || "",
        expHi: expHiVal || expEnVal || ""
      });
    });

    const BUNDLE_SIZE = 250;
    const docsToWrite = [];
    const ts = Date.now();
    for (const key in grouped) {
      const grp = grouped[key];
      for (let i = 0; i < grp.items.length; i += BUNDLE_SIZE) {
        const chunk = grp.items.slice(i, i + BUNDLE_SIZE);
        const packNum = Math.floor(i / BUNDLE_SIZE) + 1;
        const docId = `${grp.section}_${grp.subject}_${grp.topic}_p${packNum}_${ts}_${docsToWrite.length}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 120);
        docsToWrite.push({
          docId,
          metaPayload: {
            section: grp.section,
            subject: grp.subject,
            topic: grp.topic,
            packNumber: packNum,
            questionCount: chunk.length,
            updatedAt: new Date().toISOString()
          },
          dataPayload: {
            questions: chunk,
            updatedAt: new Date().toISOString()
          }
        });
      }
    }

    // Write slim metadata to `practice_bank_bundles` and heavy questions to `practice_bundle_data`
    for (let i = 0; i < docsToWrite.length; i += 50) {
      statusEl.innerText = `Uploading bundles ${i + 1} to ${Math.min(i + 50, docsToWrite.length)} of ${docsToWrite.length}...`;
      const batch = db.batch();
      docsToWrite.slice(i, i + 50).forEach(d => {
        batch.set(db.collection("practice_bank_bundles").doc(d.docId), d.metaPayload);
        batch.set(db.collection("practice_bundle_data").doc(d.docId), d.dataPayload);
        cacheBundles.push({ docId: d.docId, ...d.metaPayload });
      });
      await batch.commit();
    }

    statusEl.innerText = "Updating fast search catalog...";
    await rebuildFastCatalogIndex(cacheBundles);

    statusEl.style.color = "#166534";
    statusEl.innerText = `Uploaded ${rows.length} ${sectionType === "ncert" ? "NCERT" : "Practice"} questions into ${docsToWrite.length} bundle(s)!`;
    renderPracticeBundlesTable();
  } catch (err) {
    statusEl.style.color = "#dc2626";
    statusEl.innerText = "Upload error: " + err.message;
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.downloadSampleNcertTemplate = function () {
  const ws = XLSX.utils.json_to_sheet([
    {
      ClassLevel: "Class 10",
      Subject: "Science",
      Topic: "Ch 1: Chemical Reactions and Equations",
      Question: "Which gas is produced when dilute hydrochloric acid reacts with zinc granules?",
      QuestionHi: "तनु हाइड्रोक्लोरिक अम्ल की जस्ता (ज़िंक) के दानों से अभिक्रिया होने पर कौन सी गैस निकलती है?",
      OptionA: "Oxygen", OptionB: "Hydrogen", OptionC: "Nitrogen", OptionD: "Carbon Dioxide",
      OptionAHi: "ऑक्सीजन", OptionBHi: "हाइड्रोजन", OptionCHi: "नाइट्रोजन", OptionDHi: "कार्बन डाइऑक्साइड",
      CorrectOption: "B",
      Explanation: "NCERT Class 10 Science Ch-1: Zn + 2HCl → ZnCl2 + H2 (Hydrogen gas is evolved).",
      ExplanationHi: "NCERT कक्षा 10 विज्ञान अध्याय-1: जस्ता तनु HCl से क्रिया करके हाइड्रोजन (H2) गैस मुक्त करता है।"
    }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NCERT_Questions");
  XLSX.writeFile(wb, "TaiyariGhar_NCERT_Base_Template.xlsx");
};

window.downloadSamplePracticeTemplate = function () {
  const ws = XLSX.utils.json_to_sheet([
    {
      Subject: "General Science", Topic: "Physics",
      Question: "What is the SI unit of electric current?",
      QuestionHi: "विद्युत धारा का SI मात्रक क्या है?",
      OptionA: "Volt", OptionB: "Ampere", OptionC: "Ohm", OptionD: "Watt",
      OptionAHi: "वोल्ट", OptionBHi: "एम्पियर", OptionCHi: "ओम", OptionDHi: "वाट",
      CorrectOption: "B",
      Explanation: "Ampere (A) is the SI unit of electric current.",
      ExplanationHi: "एम्पियर (A) विद्युत धारा का SI मात्रक है।"
    }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PracticeBankBilingual");
  XLSX.writeFile(wb, "TaiyariGhar_PracticeBank_Bilingual_Template.xlsx");
};

// 5. PARTNERS & COUPONS
async function loadPartnersData() {
  const snap = await safeGet("partners");
  allPartnersList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderPartnersTable();
}

window.filterPartnersTab = function (status) {
  partnerSubFilter = status;
  ["pending", "approved", "rejected"].forEach(s => {
    const b = document.getElementById("pSub-" + s);
    if (b) b.className = s === status ? "btn btn-primary" : "btn btn-outline";
  });
  renderPartnersTable();
};

window.renderPartnersTable = function () {
  const q = (document.getElementById("partnerSearchBox")?.value || "").toLowerCase();
  const body = document.getElementById("partnersTableBody");
  if (!body) return;

  const list = allPartnersList.filter(p => (p.status || "pending") === partnerSubFilter && (
    !q || (p.partnerId || "").toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q) ||
    (p.couponCode || "").toLowerCase().includes(q) || (p.mobile || "").includes(q)
  ));

  body.innerHTML = list.map(p => `<tr>
    <td><strong>${p.partnerId || p.docId}</strong></td>
    <td>${p.name || "-"}<br><small>${p.channelName || ""}</small></td>
    <td>${p.mobile || "-"}<br><small>${p.email || ""}</small></td>
    <td>${p.bankAccount || "-"}<br><small>${p.ifsc || ""} / ${p.upi || ""}</small></td>
    <td><strong>${p.couponCode || "-"}</strong><br><small>₹${p.discount || 0} off + ${p.extraDays || 0}d</small></td>
    <td>${p.totalSales || 0} Sales<br><strong>₹${p.totalEarned || 0}</strong></td>
    <td style="display:flex; gap:4px; flex-wrap:wrap;">
      ${partnerSubFilter === "pending" ? `
        <button class="btn btn-primary btn-sm" onclick="openApproveModal('${p.docId}')">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="rejectPartner('${p.docId}')">Reject</button>
      ` : ""}
      ${partnerSubFilter === "approved" ? `
        <button class="btn btn-outline btn-sm" onclick="openApproveModal('${p.docId}')">Edit</button>
        <button class="btn btn-primary btn-sm" onclick="markPartnerPaid('${p.docId}')">Mark Paid</button>
      ` : ""}
    </td>
  </tr>`).join("") || `<tr><td colspan="7" style="color:#64748b;">No partners in this view.</td></tr>`;
};

window.openApproveModal = function (docId) {
  approvingPartnerDoc = allPartnersList.find(p => p.docId === docId);
  if (!approvingPartnerDoc) return;
  document.getElementById("apModalPid").innerText = approvingPartnerDoc.partnerId || docId;
  document.getElementById("apCouponCode").value = approvingPartnerDoc.couponCode || "";
  document.getElementById("apDiscount").value = approvingPartnerDoc.discount || 20;
  document.getElementById("apExtraDays").value = approvingPartnerDoc.extraDays || 15;
  document.getElementById("apCommission").value = approvingPartnerDoc.commission || 25;
  document.getElementById("approvePartnerModal").classList.remove("hidden");
};

window.confirmApprovePartner = async function () {
  if (!approvingPartnerDoc) return;
  const couponCode = document.getElementById("apCouponCode").value.trim().toUpperCase();
  const discount = Number(document.getElementById("apDiscount").value) || 20;
  const extraDays = Number(document.getElementById("apExtraDays").value) || 15;
  const commission = Number(document.getElementById("apCommission").value) || 25;

  await db.collection("partners").doc(approvingPartnerDoc.docId).update({
    status: "approved", couponCode, discount, extraDays, commission
  });
  document.getElementById("approvePartnerModal").classList.add("hidden");
  loadPartnersData();
};

window.rejectPartner = async function (docId) {
  if (!confirm("Reject this partner application?")) return;
  await db.collection("partners").doc(docId).update({ status: "rejected" });
  loadPartnersData();
};

window.markPartnerPaid = async function (docId) {
  if (!confirm("Reset payable balance to ₹0 after payout transfer?")) return;
  await db.collection("partners").doc(docId).update({ totalEarned: 0, lastPaidAt: new Date().toISOString() });
  loadPartnersData();
};

window.togglePartnerRegSetting = async function () {
  partnerRegOpen = !partnerRegOpen;
  await db.collection("settings").doc("partner_program").set({ isOpen: partnerRegOpen }, { merge: true });
  document.getElementById("partnerRegStatusText").innerText = partnerRegOpen ? "OPEN" : "CLOSED";
};

window.exportPartnersCsv = function (mode) {
  const rows = allPartnersList.filter(p => p.status === "approved").map(p => mode === "payout"
    ? { PartnerID: p.partnerId, Name: p.name, AccountNo: p.bankAccount, IFSC: p.ifsc, UPI: p.upi, PayableAmount: p.totalEarned || 0 }
    : { PartnerID: p.partnerId, Name: p.name, Mobile: p.mobile, Email: p.email, Coupon: p.couponCode, Sales: p.totalSales || 0, Earned: p.totalEarned || 0 }
  );
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Partners");
  XLSX.writeFile(wb, `TaiyariGhar_Partners_${mode}.csv`);
};

// 6. STUDENTS & PASSES (SEARCH-FIRST)
async function loadStudentsData() {
  const snap = await safeGet("students");
  cacheStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderStudentsTable();
}

window.renderStudentsTable = function () {
  const q = (document.getElementById("studentSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("studentsTableBody");
  const note = document.getElementById("studentCountNote");
  if (!body) return;

  const filtered = q
    ? cacheStudents.filter(s =>
        (s.loginId || s.id || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.mobile || "").includes(q)
      )
    : cacheStudents.slice(0, 25);

  if (note) {
    note.innerText = q
      ? `Showing ${filtered.length} matching student(s) out of ${cacheStudents.length}`
      : `Showing latest 25 of ${cacheStudents.length} students (use search box to find any student)`;
  }

  body.innerHTML = filtered.slice(0, 60).map(s => `<tr>
    <td><strong>${s.loginId || s.id}</strong></td>
    <td>${s.name || "-"}</td>
    <td>${s.email || "-"}<br><small>${s.mobile || ""}</small></td>
    <td>${s.targetExam || "-"}</td>
    <td><span class="tag ${s.isPaid ? 'tag-ok' : ''}">${s.isPaid ? 'PRO (' + (s.expiry || '') + ')' : 'FREE'}</span></td>
    <td style="display:flex; gap:4px; flex-wrap:wrap;">
      <button class="btn btn-primary btn-sm" onclick="openStudentPassModal('${s.id}')">Give Pro</button>
      ${s.isPaid ? `<button class="btn btn-outline btn-sm" onclick="removeStudentPass('${s.id}')">Remove Pass</button>` : ""}
      <button class="btn btn-danger btn-sm" onclick="deleteDocAndReload('students','${s.id}','students')">Delete</button>
    </td>
  </tr>`).join("") || `<tr><td colspan="6" style="color:#64748b;">No matching students found.</td></tr>`;
};

window.openStudentPassModal = function (docId) {
  const st = cacheStudents.find(s => s.id === docId);
  if (!st) return;
  editingStudentDocId = docId;
  document.getElementById("spModalStudentInfo").innerText = `${st.name || "Student"} (${st.email || st.id})`;
  document.getElementById("studentPassModal").classList.remove("hidden");
};

window.confirmStudentProPass = async function () {
  if (!editingStudentDocId) return;
  const days = Number(document.getElementById("spValidityDays").value) || 365;
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
  const expiryStr = expDate.toISOString().split("T")[0];

  await db.collection("students").doc(editingStudentDocId).update({
    isPaid: true,
    expiry: expiryStr,
    planName: `Admin Granted (${days} Days)`
  });
  document.getElementById("studentPassModal").classList.add("hidden");
  loadStudentsData();
};

window.removeStudentPass = async function (docId) {
  if (!confirm("Remove Pro Pass from this student?")) return;
  await db.collection("students").doc(docId).update({ isPaid: false, expiry: "" });
  loadStudentsData();
};

// 7. PAYMENTS & INVOICES
async function loadPaymentsData() {
  const snap = await safeGet("payments");
  cachePayments = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderPaymentsTable();
}

window.renderPaymentsTable = function () {
  const q = (document.getElementById("paymentSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("paymentsTableBody");
  if (!body) return;
  const list = q
    ? cachePayments.filter(p =>
        (p.invoiceNo || p.docId || "").toLowerCase().includes(q) ||
        (p.studentName || p.studentId || "").toLowerCase().includes(q) ||
        (p.paymentId || "").toLowerCase().includes(q) ||
        (p.coupon || "").toLowerCase().includes(q)
      )
    : cachePayments.slice(0, 30);

  body.innerHTML = list.slice(0, 60).map(p => `<tr>
    <td><strong>${p.invoiceNo || p.docId}</strong></td>
    <td>${p.studentName || p.studentId || "-"}</td>
    <td>${p.plan || "-"}</td>
    <td>₹${p.amount || 0}</td>
    <td>${p.coupon || "-"}</td>
    <td>${p.paymentId || "-"}</td>
    <td>${(p.createdAt || "").slice(0, 10)}</td>
  </tr>`).join("") || `<tr><td colspan="7" style="color:#64748b;">No payment records found.</td></tr>`;
};

// 8. TEST RESULTS & LEADERBOARD
async function loadResultsData() {
  const snap = await safeGet("results");
  cacheResults = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderResultsTable();
}

window.renderResultsTable = function () {
  const q = (document.getElementById("resultSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("resultsTableBody");
  if (!body) return;
  const list = q
    ? cacheResults.filter(r =>
        (r.testTitle || "").toLowerCase().includes(q) ||
        (r.studentName || "").toLowerCase().includes(q) ||
        (r.studentId || "").toLowerCase().includes(q)
      )
    : cacheResults.slice(0, 30);

  body.innerHTML = list.slice(0, 60).map(r => `<tr>
    <td><strong>${r.testTitle || "-"}</strong></td>
    <td>${r.studentName || r.studentId || "-"}</td>
    <td><strong>${r.score ?? 0}</strong> / ${r.totalMarks ?? "-"}</td>
    <td>${r.correct ?? 0} ✔ / ${r.wrong ?? 0} ✘</td>
    <td>${r.accuracy || "-"}</td>
    <td>${(r.submittedAt || r.createdAt || "").slice(0, 10)}</td>
  </tr>`).join("") || `<tr><td colspan="6" style="color:#64748b;">No test attempts found.</td></tr>`;
};

// 9. REPORTED QUESTIONS
async function loadReportsData() {
  const snap = await safeGet("reported_questions");
  cacheReports = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderReportsTable();
}

window.renderReportsTable = function () {
  const q = (document.getElementById("reportSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("reportsTableBody");
  if (!body) return;
  const list = cacheReports.filter(r => !q || (r.testTitle || "").toLowerCase().includes(q) || (r.questionText || "").toLowerCase().includes(q));
  body.innerHTML = list.map(r => `<tr>
    <td>${r.testTitle || r.subject || "-"}</td>
    <td>${(r.questionText || "").slice(0, 120)}</td>
    <td>${r.reason || r.comment || "-"}</td>
    <td><span class="tag ${r.status === 'resolved' ? 'tag-ok' : 'tag-warn'}">${r.status || 'pending'}</span></td>
    <td style="display:flex; gap:4px;">
      ${r.status !== "resolved" ? `<button class="btn btn-primary btn-sm" onclick="resolveQuestionReport('${r.docId}')">Resolve</button>` : ""}
      <button class="btn btn-danger btn-sm" onclick="deleteDocAndReload('reported_questions','${r.docId}','reports')">Delete</button>
    </td>
  </tr>`).join("") || `<tr><td colspan="5" style="color:#64748b;">No reported questions.</td></tr>`;
};

window.resolveQuestionReport = async function (docId) {
  await db.collection("reported_questions").doc(docId).update({ status: "resolved" });
  loadReportsData();
};

// 10. CURRENT AFFAIRS, JOBS & STUDY NOTES (With Edit, Hindi/English, Formatting & Attached Questions)
let editingCaDocId = null;
let editingJobDocId = null;

window.formatTargetField = function (fieldId, mode) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const start = el.selectionStart || 0;
  const end = el.selectionEnd || 0;
  const selected = el.value.slice(start, end) || "Selected Text";
  let wrapped = selected;
  if (mode === "bold") wrapped = `<strong>${selected}</strong>`;
  else if (mode === "red") wrapped = `<span style="color:#dc2626; font-weight:600;">${selected}</span>`;
  else if (mode === "blue") wrapped = `<span style="color:#1d4ed8; font-weight:600;">${selected}</span>`;
  else if (mode === "green") wrapped = `<span style="color:#059669; font-weight:600;">${selected}</span>`;
  el.value = el.value.slice(0, start) + wrapped + el.value.slice(end);
  el.focus();
};

window.addCaAttachedQuestion = function (existingQ = null) {
  const wrap = document.getElementById("caAttachedQuestionsContainer");
  if (!wrap) return;
  const idx = wrap.children.length + 1;
  const qData = existingQ || {};
  const opts = qData.options || ["", "", "", ""];
  const optsHi = qData.optionsHi || ["", "", "", ""];
  const card = document.createElement("div");
  card.className = "ca-q-editor-card";
  card.style = "background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:10px; margin-bottom:10px;";
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <strong>Question ${idx}</strong>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.ca-q-editor-card').remove()">Remove Q</button>
    </div>
    <div class="form-row">
      <div><label>Question (English)</label><input type="text" class="caq-en" value="${(qData.q || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Question (Hindi)</label><input type="text" class="caq-hi" value="${(qData.qHi || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Correct Option</label>
        <select class="caq-ans">
          <option value="0" ${Number(qData.ans) === 0 ? 'selected' : ''}>A</option>
          <option value="1" ${Number(qData.ans) === 1 ? 'selected' : ''}>B</option>
          <option value="2" ${Number(qData.ans) === 2 ? 'selected' : ''}>C</option>
          <option value="3" ${Number(qData.ans) === 3 ? 'selected' : ''}>D</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div><label>Opt A (EN)</label><input type="text" class="caq-oa" value="${(opts[0] || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Opt B (EN)</label><input type="text" class="caq-ob" value="${(opts[1] || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Opt C (EN)</label><input type="text" class="caq-oc" value="${(opts[2] || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Opt D (EN)</label><input type="text" class="caq-od" value="${(opts[3] || '').replace(/"/g, '&quot;')}" /></div>
    </div>
    <div class="form-row">
      <div><label>Opt A (HI)</label><input type="text" class="caq-oahi" value="${(optsHi[0] || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Opt B (HI)</label><input type="text" class="caq-obhi" value="${(optsHi[1] || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Opt C (HI)</label><input type="text" class="caq-ochi" value="${(optsHi[2] || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Opt D (HI)</label><input type="text" class="caq-odhi" value="${(optsHi[3] || '').replace(/"/g, '&quot;')}" /></div>
    </div>
    <div class="form-row">
      <div><label>Explanation (EN)</label><input type="text" class="caq-exp" value="${(qData.exp || '').replace(/"/g, '&quot;')}" /></div>
      <div><label>Explanation (HI)</label><input type="text" class="caq-exphi" value="${(qData.expHi || '').replace(/"/g, '&quot;')}" /></div>
    </div>
  `;
  wrap.appendChild(card);
};

async function loadUpdatesData() {
  const [jSnap, caSnap, snSnap] = await Promise.all([
    safeGet("job_updates"),
    safeGet("ca_articles"),
    safeGet("study_notes")
  ]);
  cacheJobs = jSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
  cacheCaArticles = caSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
  cacheStudyNotes = snSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderPublishedContentTable(false);
}

window.renderPublishedContentTable = function (showAll = false) {
  const type = document.getElementById("pubContentTypeFilter")?.value || "jobs";
  const q = (document.getElementById("pubContentSearchBox")?.value || "").trim().toLowerCase();
  const body = document.getElementById("publishedContentAdminBody");
  if (!body) return;

  if (!q && !showAll) {
    body.innerHTML = `<tr><td colspan="4" style="color:#64748b;">Type in the search box above or click "Show All" to view &amp; edit published posts.</td></tr>`;
    return;
  }

  let items = [];
  let colName = "job_updates";
  if (type === "jobs") { items = cacheJobs; colName = "job_updates"; }
  else if (type === "ca") { items = cacheCaArticles; colName = "ca_articles"; }
  else { items = cacheStudyNotes; colName = "study_notes"; }

  const filtered = showAll && !q
    ? items
    : items.filter(it => (it.title || "").toLowerCase().includes(q) || (it.titleHi || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q));

  body.innerHTML = filtered.slice(0, 50).map(it => {
    const editFn = colName === "ca_articles"
      ? `startEditCaArticle('${it.docId}')`
      : (colName === "job_updates" ? `startEditJobUpdate('${it.docId}')` : "");
    return `<tr>
      <td><span class="tag">${it.category || "-"}</span></td>
      <td>${it.title || "-"}</td>
      <td>${it.date || "-"}</td>
      <td style="display:flex; gap:6px;">
        ${editFn ? `<button class="btn btn-outline btn-sm" onclick="${editFn}">Edit</button>` : ""}
        <button class="btn btn-danger btn-sm" onclick="deleteDocAndReload('${colName}','${it.docId}','updates')">Delete</button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" style="color:#64748b;">No matching items found.</td></tr>`;
};

window.startEditCaArticle = function (docId) {
  const art = cacheCaArticles.find(a => a.docId === docId);
  if (!art) return;
  editingCaDocId = docId;
  document.getElementById("caArtTitle").value = art.title || "";
  document.getElementById("caArtTitleHi").value = art.titleHi || "";
  document.getElementById("caArtCat").value = art.category || "Daily Current Affairs";
  document.getElementById("caArtDate").value = art.date || "";
  document.getElementById("caArtPdf").value = art.pdfLink || "";
  document.getElementById("caArtBody").value = art.content || "";
  document.getElementById("caArtBodyHi").value = art.contentHi || "";
  const qWrap = document.getElementById("caAttachedQuestionsContainer");
  qWrap.innerHTML = "";
  (art.questions || []).forEach(q => addCaAttachedQuestion(q));
  document.getElementById("btnSaveCaArt").innerText = "Update Current Affairs Article";
  document.getElementById("btnCancelEditCa").classList.remove("hidden");
  document.getElementById("caArtTitle").scrollIntoView({ behavior: "smooth" });
};

window.cancelEditCaArticle = function () {
  editingCaDocId = null;
  document.getElementById("caArtTitle").value = "";
  document.getElementById("caArtTitleHi").value = "";
  document.getElementById("caArtBody").value = "";
  document.getElementById("caArtBodyHi").value = "";
  document.getElementById("caAttachedQuestionsContainer").innerHTML = "";
  document.getElementById("btnSaveCaArt").innerText = "Publish Current Affairs Article";
  document.getElementById("btnCancelEditCa").classList.add("hidden");
};

window.startEditJobUpdate = function (docId) {
  const job = cacheJobs.find(j => j.docId === docId);
  if (!job) return;
  editingJobDocId = docId;
  document.getElementById("jobCat").value = job.category || "Latest Job";
  document.getElementById("jobTitle").value = job.title || "";
  document.getElementById("jobTitleHi").value = job.titleHi || "";
  document.getElementById("jobDate").value = job.date || "";
  document.getElementById("jobDesc").value = job.description || "";
  document.getElementById("jobDescHi").value = job.descriptionHi || "";

  const linksWrap = document.getElementById("dynamicJobLinksContainer");
  linksWrap.innerHTML = "";
  const links = Array.isArray(job.links) && job.links.length ? job.links : [{ label: "Apply Online", url: job.link || "" }];
  links.forEach(l => {
    const row = document.createElement("div");
    row.className = "form-row job-link-row";
    row.style.marginBottom = "6px";
    row.innerHTML = `
      <div><input type="text" class="jl-label" value="${(l.label || '').replace(/"/g, '&quot;')}" /></div>
      <div><input type="url" class="jl-url" value="${(l.url || '').replace(/"/g, '&quot;')}" /></div>
    `;
    linksWrap.appendChild(row);
  });

  document.getElementById("btnSaveJob").innerText = "Update Post";
  document.getElementById("btnCancelEditJob").classList.remove("hidden");
  document.getElementById("jobTitle").scrollIntoView({ behavior: "smooth" });
};

window.cancelEditJob = function () {
  editingJobDocId = null;
  document.getElementById("jobTitle").value = "";
  document.getElementById("jobTitleHi").value = "";
  document.getElementById("jobDesc").value = "";
  document.getElementById("jobDescHi").value = "";
  document.getElementById("btnSaveJob").innerText = "Publish Update";
  document.getElementById("btnCancelEditJob").classList.add("hidden");
};

window.addJobLinkRow = function () {
  const wrap = document.getElementById("dynamicJobLinksContainer");
  const row = document.createElement("div");
  row.className = "form-row job-link-row";
  row.style.marginBottom = "6px";
  row.innerHTML = `
    <div><input type="text" class="jl-label" placeholder="Link Name (e.g., Admit Card / Result)" /></div>
    <div style="display:flex; gap:6px;">
      <input type="url" class="jl-url" placeholder="https://..." />
      <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.job-link-row').remove()">✕</button>
    </div>
  `;
  wrap.appendChild(row);
};

window.publishCaArticle = async function () {
  const title = document.getElementById("caArtTitle").value.trim();
  const titleHi = document.getElementById("caArtTitleHi").value.trim();
  const category = document.getElementById("caArtCat").value.trim() || "Daily Current Affairs";
  const date = document.getElementById("caArtDate").value.trim();
  const pdfLink = document.getElementById("caArtPdf").value.trim();
  const content = document.getElementById("caArtBody").value.trim();
  const contentHi = document.getElementById("caArtBodyHi").value.trim();
  const msg = document.getElementById("caArtMsg");

  if (!title || (!content && !contentHi)) { alert("Please enter headline and article content."); return; }

  const questions = [];
  document.querySelectorAll(".ca-q-editor-card").forEach(card => {
    const q = card.querySelector(".caq-en").value.trim();
    const qHi = card.querySelector(".caq-hi").value.trim();
    const ans = Number(card.querySelector(".caq-ans").value) || 0;
    const options = [
      card.querySelector(".caq-oa").value.trim(),
      card.querySelector(".caq-ob").value.trim(),
      card.querySelector(".caq-oc").value.trim(),
      card.querySelector(".caq-od").value.trim()
    ];
    const optionsHi = [
      card.querySelector(".caq-oahi").value.trim(),
      card.querySelector(".caq-obhi").value.trim(),
      card.querySelector(".caq-ochi").value.trim(),
      card.querySelector(".caq-odhi").value.trim()
    ];
    const exp = card.querySelector(".caq-exp").value.trim();
    const expHi = card.querySelector(".caq-exphi").value.trim();
    if (q || qHi) questions.push({ q, qHi, ans, options, optionsHi, exp, expHi });
  });

  msg.innerText = editingCaDocId ? "Updating..." : "Publishing...";
  const payload = {
    title, titleHi, category, date, pdfLink, content, contentHi, questions,
    summary: (content || contentHi).replace(/<[^>]+>/g, "").slice(0, 220),
    updatedAt: new Date().toISOString()
  };

  if (editingCaDocId) {
    await db.collection("ca_articles").doc(editingCaDocId).set(payload, { merge: true });
    msg.style.color = "#166534";
    msg.innerText = "Article Updated!";
    cancelEditCaArticle();
  } else {
    payload.createdAt = new Date().toISOString();
    await db.collection("ca_articles").add(payload);
    msg.style.color = "#166534";
    msg.innerText = "Article Published!";
    cancelEditCaArticle();
  }
  loadUpdatesData();
};

window.publishJobWithLinks = async function () {
  const category = document.getElementById("jobCat").value;
  const title = document.getElementById("jobTitle").value.trim();
  const titleHi = document.getElementById("jobTitleHi").value.trim();
  const date = document.getElementById("jobDate").value.trim();
  const description = document.getElementById("jobDesc").value.trim();
  const descriptionHi = document.getElementById("jobDescHi").value.trim();
  const msg = document.getElementById("jobPubMsg");

  if (!title) { alert("Please enter Post / Exam Headline."); return; }
  const links = [];
  document.querySelectorAll(".job-link-row").forEach(row => {
    const label = row.querySelector(".jl-label").value.trim();
    const url = row.querySelector(".jl-url").value.trim();
    if (label && url) links.push({ label, url });
  });

  msg.innerText = editingJobDocId ? "Updating..." : "Publishing...";
  const payload = {
    category, title, titleHi, date, description, descriptionHi, links,
    link: links.length > 0 ? links[0].url : "",
    updatedAt: new Date().toISOString()
  };

  if (editingJobDocId) {
    await db.collection("job_updates").doc(editingJobDocId).set(payload, { merge: true });
    msg.style.color = "#166534";
    msg.innerText = "Post Updated Successfully!";
    cancelEditJob();
  } else {
    payload.createdAt = new Date().toISOString();
    await db.collection("job_updates").add(payload);
    msg.style.color = "#166534";
    msg.innerText = "Published Successfully!";
    cancelEditJob();
  }
  loadUpdatesData();
};

window.publishStudyNote = async function () {
  const category = document.getElementById("snCat").value;
  const title = document.getElementById("snTitle").value.trim();
  const date = document.getElementById("snDate").value.trim();
  const pdfLink = document.getElementById("snPdf").value.trim();
  const content = document.getElementById("snBody").value.trim();
  const msg = document.getElementById("snPubMsg");

  if (!title || !content) { alert("Please enter title and study notes content."); return; }
  msg.innerText = "Publishing...";
  await db.collection("study_notes").add({
    category, title, date, pdfLink, content,
    createdAt: new Date().toISOString()
  });
  msg.style.color = "#166534";
  msg.innerText = "Study Note Published!";
  document.getElementById("snTitle").value = "";
  document.getElementById("snBody").value = "";
  loadUpdatesData();
};

// 11. PROMO BANNERS
window.saveBannerSetting = async function () {
  const slotKey = document.getElementById("bnSlotKey").value;
  const active = document.getElementById("bnActive").value === "true";
  const imgUrl = document.getElementById("bnImgUrl").value.trim();
  const linkUrl = document.getElementById("bnLinkUrl").value.trim();
  const msg = document.getElementById("bnSaveMsg");

  msg.innerText = "Saving...";
  await db.collection("settings").doc("banners").set({
    [slotKey]: { active, imgUrl, linkUrl, updatedAt: new Date().toISOString() }
  }, { merge: true });
  msg.style.color = "#166534";
  msg.innerText = "Banner Updated!";
};

// 12. PRICING & GLOBAL SETTINGS
async function loadPricingSettings() {
  const snap = await db.collection("settings").doc("pricing").get().catch(() => null);
  if (snap && snap.exists) {
    const d = snap.data();
    if (d.price1M) document.getElementById("setPrice1M").value = d.price1M;
    if (d.price6M) document.getElementById("setPrice6M").value = d.price6M;
    if (d.price12M) document.getElementById("setPrice12M").value = d.price12M;
    if (d.globalCoupon) document.getElementById("setGlobalCoupon").value = d.globalCoupon;
    if (d.globalDiscount !== undefined) document.getElementById("setGlobalDiscount").value = d.globalDiscount;
    if (d.supportLink) document.getElementById("setSupportLink").value = d.supportLink;
  }
}

window.savePricingSettings = async function () {
  const msg = document.getElementById("setSaveMsg");
  msg.innerText = "Saving...";
  await db.collection("settings").doc("pricing").set({
    price1M: Number(document.getElementById("setPrice1M").value) || 99,
    price6M: Number(document.getElementById("setPrice6M").value) || 249,
    price12M: Number(document.getElementById("setPrice12M").value) || 399,
    globalCoupon: document.getElementById("setGlobalCoupon").value.trim().toUpperCase(),
    globalDiscount: Number(document.getElementById("setGlobalDiscount").value) || 0,
    supportLink: document.getElementById("setSupportLink").value.trim(),
    updatedAt: new Date().toISOString()
  }, { merge: true });
  msg.style.color = "#166534";
  msg.innerText = "Pricing & Settings Saved!";
};

window.deleteDocAndReload = async function (col, id, tabToReload) {
  if (!confirm("Delete this item permanently?")) return;
  await db.collection(col).doc(id).delete();
  if (col === "practice_bank_bundles") {
    await db.collection("practice_bundle_data").doc(id).delete().catch(() => {});
    cacheBundles = cacheBundles.filter(b => b.docId !== id);
    await rebuildFastCatalogIndex(cacheBundles);
    renderPracticeBundlesTable();
    return;
  }
  loadedTabs[tabToReload] = false;
  loadTabOnDemand(tabToReload);
};

// BULK DATA EXCEL EXPORT (OVERVIEW TAB)
window.exportAllDataExcel = async function (type) {
  const status = document.getElementById("bulkExportStatus");
  if (status) status.innerText = "Preparing Excel download...";
  let rows = [];
  let fileName = `TaiyariGhar_${type}_Backup.xlsx`;

  if (type === "students") {
    const snap = await safeGet("students");
    rows = snap.docs.map(d => {
      const s = d.data();
      return { StudentID: s.loginId || d.id, Name: s.name || "", Email: s.email || "", Mobile: s.mobile || "", TargetExam: s.targetExam || "", IsPro: s.isPaid ? "Yes" : "No", Expiry: s.expiry || "" };
    });
  } else if (type === "tests") {
    const snap = await safeGet("tests");
    rows = snap.docs.map(d => {
      const t = d.data();
      return { TestID: d.id, Title: t.title || "", Category: t.mainCat || "", SubCategory: t.subCat || "", Mode: t.isLive ? "Live" : "Mock", QuestionsCount: Array.isArray(t.questions) ? t.questions.length : 0, Access: t.isFree ? "Free" : "Pro" };
    });
  } else if (type === "practice") {
    const snap = await safeGet("practice_bank_bundles");
    snap.forEach(d => {
      const b = d.data();
      (b.questions || []).forEach(q => {
        rows.push({
          Subject: b.subject || "", Topic: b.topic || "", Question: q.q || "",
          OptionA: (q.options || [])[0] || "", OptionB: (q.options || [])[1] || "",
          OptionC: (q.options || [])[2] || "", OptionD: (q.options || [])[3] || "",
          CorrectOption: ["A", "B", "C", "D"][q.ans] || "A", Explanation: q.exp || ""
        });
      });
    });
  } else if (type === "payments") {
    const snap = await safeGet("payments");
    rows = snap.docs.map(d => {
      const p = d.data();
      return { InvoiceNo: p.invoiceNo || d.id, StudentID: p.studentId || "", StudentName: p.studentName || "", Plan: p.plan || "", Amount: p.amount || 0, Coupon: p.coupon || "", PaymentID: p.paymentId || "", Date: p.createdAt || "" };
    });
  } else if (type === "partners") {
    const snap = await safeGet("partners");
    rows = snap.docs.map(d => {
      const p = d.data();
      return { PartnerID: p.partnerId || d.id, Name: p.name || "", Mobile: p.mobile || "", Email: p.email || "", Coupon: p.couponCode || "", Status: p.status || "", Sales: p.totalSales || 0, Earned: p.totalEarned || 0, UPI: p.upi || "", BankAccount: p.bankAccount || "", IFSC: p.ifsc || "" };
    });
  }

  if (!rows.length) {
    if (status) status.innerText = "No records found to export.";
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, fileName);
  if (status) status.innerText = `Downloaded ${rows.length} record(s) into ${fileName}!`;
};


// =========================================================================
// CLOUDFLARE D1 & WORKER ADMIN INTEGRATION LAYER (Firebase Login Preserved)
// =========================================================================
(function initAdminD1Integration() {
  const adminApi = () => window.TG_ADMIN_API;

  // Bulk Upload Practice & NCERT Questions directly to Cloudflare D1
  window.uploadPracticeBankExcel = async function () {
    const fileInput = document.getElementById("pbExcelFile");
    const sectionType = document.getElementById("pbSectionType")?.value || "practice";
    const defSub = document.getElementById("pbDefSubject").value.trim();
    const defTop = document.getElementById("pbDefTopic").value.trim();
    const statusEl = document.getElementById("pbUploadStatus");
    const btn = document.getElementById("btnUploadPb");

    if (!fileInput.files.length) {
      alert("Please select an Excel or CSV file.");
      return;
    }
    if (!adminApi()) {
      alert("TG_ADMIN_API bridge not loaded. Check tg-admin-bridge.js.");
      return;
    }
    if (!adminApi().getAdminKey()) {
      const enteredKey = prompt("Apni Cloudflare ADMIN_API_KEY secret daalein:");
      if (!enteredKey || !enteredKey.trim()) {
        alert("ADMIN_API_KEY ke bina Cloudflare D1 upload nahi hoga.");
        return;
      }
      adminApi().setAdminKey(enteredKey.trim());
    }

    if (btn) btn.disabled = true;
    statusEl.style.color = "#1d4ed8";
    statusEl.innerText = "Reading Excel file for Cloudflare D1 upload...";

    try {
      const data = await fileInput.files[0].arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) {
        statusEl.innerText = "File is empty.";
        return;
      }

      const grouped = {};
      rows.forEach((r) => {
        const clsLevel = r.ClassLevel ? String(r.ClassLevel).trim() : "";
        const rawSub = (r.Subject || defSub || (sectionType === "ncert" ? "NCERT General" : "General")).trim();
        const top = (r.Topic || r.Chapter || defTop || "Mixed").trim();
        const key = `${sectionType}___${clsLevel}___${rawSub}___${top}`;
        if (!grouped[key]) {
          grouped[key] = {
            section: sectionType,
            ncert_class: sectionType === "ncert" ? (clsLevel || "NCERT") : "",
            subject: rawSub,
            topic: top,
            items: []
          };
        }

        const ansChar = String(r.CorrectOption || r.Answer || "A").trim().toUpperCase();
        const qEnVal = String(r.Question || r["Question En"] || r["Question_En"] || "").trim();
        const qHiVal = String(r.QuestionHi || r["Question Hi"] || r["Question_Hi"] || "").trim();
        const expEnVal = String(r.Explanation || r["Explanation En"] || r["Explanation_En"] || "").trim();
        const expHiVal = String(r.ExplanationHi || r["Explanation Hi"] || r["Explanation_Hi"] || "").trim();

        const opts = [
          { en: String(r.OptionA || "").trim(), hi: String(r.OptionAHi || r.OptionA || "").trim() },
          { en: String(r.OptionB || "").trim(), hi: String(r.OptionBHi || r.OptionB || "").trim() },
          { en: String(r.OptionC || "").trim(), hi: String(r.OptionCHi || r.OptionC || "").trim() },
          { en: String(r.OptionD || "").trim(), hi: String(r.OptionDHi || r.OptionD || "").trim() }
        ];

        grouped[key].items.push({
          q_no: grouped[key].items.length + 1,
          subject: rawSub,
          topic: top,
          ncert_class: sectionType === "ncert" ? (clsLevel || "NCERT") : "",
          question_en: qEnVal || qHiVal,
          question_hi: qHiVal || qEnVal,
          options: opts,
          correct_option: ["A", "B", "C", "D"].includes(ansChar) ? ansChar : "A",
          explanation_en: expEnVal || expHiVal,
          explanation_hi: expHiVal || expEnVal
        });
      });

      const BUNDLE_SIZE = 250;
      const batches = [];
      const ts = Date.now();
      for (const key in grouped) {
        const grp = grouped[key];
        for (let i = 0; i < grp.items.length; i += BUNDLE_SIZE) {
          const chunk = grp.items.slice(i, i + BUNDLE_SIZE);
          const packNum = Math.floor(i / BUNDLE_SIZE) + 1;
          const bundleId = `${grp.section}_${grp.ncert_class}_${grp.subject}_${grp.topic}_p${packNum}_${ts}_${batches.length}`
            .replace(/[^a-zA-Z0-9_]+/g, "_")
            .slice(0, 110);
          batches.push({
            bundle: {
              bundle_id: bundleId,
              subject: grp.subject,
              topic: grp.topic,
              ncert_class: grp.ncert_class,
              title_en: `${grp.subject} - ${grp.topic} (Pack ${packNum})`,
              title_hi: `${grp.subject} - ${grp.topic} (सेट ${packNum})`,
              is_free_sample: packNum === 1 ? 1 : 0
            },
            questions: chunk
          });
        }
      }

      let uploadedQs = 0;
      for (let i = 0; i < batches.length; i++) {
        statusEl.innerText = `Uploading pack ${i + 1} of ${batches.length} to Cloudflare D1...`;
        const resp = await adminApi().bulkUploadBundle(batches[i].bundle, batches[i].questions);
        if (!resp || !resp.ok) {
          throw new Error((resp && resp.error) || "Cloudflare D1 upload failed");
        }
        uploadedQs += Number(resp.inserted_questions || batches[i].questions.length);
      }

      statusEl.style.color = "#166534";
      statusEl.innerText = `✅ Cloudflare D1 में ${uploadedQs} Questions (${batches.length} Bundles) सफलतापूर्वक Upload हो गए!`;
      fileInput.value = "";
      await loadPracticeBundlesData();
    } catch (err) {
      console.error("D1 Upload Error:", err);
      statusEl.style.color = "#dc2626";
      statusEl.innerText = "Upload Error: " + (err.message || err);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // Load Practice & NCERT Bundles list from Cloudflare D1
  window.loadPracticeBundlesData = async function () {
    const body = document.getElementById("pbBundlesBody");
    if (body) body.innerHTML = `<tr><td colspan="7" style="color:#1d4ed8;">Loading bundles from Cloudflare D1...</td></tr>`;
    try {
      if (adminApi()) {
        const res = await adminApi().getBundles({});
        if (res && res.ok && Array.isArray(res.bundles)) {
          cacheBundles = res.bundles.map((b, idx) => ({
            docId: b.bundle_id,
            section: (b.ncert_class || String(b.bundle_id || "").startsWith("ncert_")) ? "ncert" : "practice",
            subject: b.ncert_class ? `${b.ncert_class} - ${b.subject}` : (b.subject || "General"),
            topic: b.topic || "Mixed",
            packNumber: idx + 1,
            questionCount: Number(b.question_count || 0)
          }));
          renderPracticeBundlesTable(false);
          return;
        }
      }
    } catch (e) {
      console.error("D1 bundle load error:", e);
    }
  };

  // Delete single or multiple bundles from Cloudflare D1
  const origDeleteDocAndReload = window.deleteDocAndReload;
  window.deleteDocAndReload = async function (col, id, tabToReload) {
    if (col === "practice_bank_bundles" && adminApi()) {
      if (!confirm("Kya aap is bundle ko Cloudflare D1 se permanently delete karna chahte hain?")) return;
      await adminApi().deleteBundles([id]);
      await loadPracticeBundlesData();
      return;
    }
    if (typeof origDeleteDocAndReload === "function") {
      return origDeleteDocAndReload(col, id, tabToReload);
    }
  };

  window.bulkDeleteSelectedBundles = async function () {
    const ids = Array.from(document.querySelectorAll(".pb-row-chk:checked")).map((cb) => cb.value);
    if (!ids.length) {
      alert("Pehle checkboxes select karein.");
      return;
    }
    if (!confirm(`Selected ${ids.length} bundle(s) ko Cloudflare D1 se delete karein?`)) return;
    if (adminApi()) {
      await adminApi().deleteBundles(ids);
      await loadPracticeBundlesData();
    }
  };

  window.bulkDeleteFilteredBundles = async function () {
    if (!lastRenderedPbList.length) {
      alert("Delete karne ke liye koi bundle list mein nahi hai.");
      return;
    }
    if (!confirm(`Sabhi ${lastRenderedPbList.length} matching bundle(s) ko Cloudflare D1 se delete karein?`)) return;
    if (adminApi()) {
      await adminApi().deleteBundles(lastRenderedPbList.map((b) => b.docId));
      await loadPracticeBundlesData();
    }
  };
})();


// =========================================================================
// MOCK & LIVE TESTS CLOUDFLARE D1 INTEGRATION (Tab 10, Auth, Students, Partners, Banners remain on Firebase)
// =========================================================================
(function initAdminMockTestsD1() {
  const adminApi = () => window.TG_ADMIN_API;

  window.loadTestsData = async function () {
    const d1Tests = [];
    try {
      if (adminApi()) {
        const res = await adminApi().getTests("");
        if (res && res.ok && Array.isArray(res.tests)) {
          res.tests.forEach((t) => {
            let extra = {};
            try { extra = JSON.parse(t.title_hi || "{}"); } catch {}
            d1Tests.push({
              docId: t.test_id,
              source: "d1",
              title: t.title_en || t.test_id,
              mainCat: t.category || "General",
              subCat: extra.subCat || t.category || "General",
              isLive: Boolean(extra.isLive),
              isFree: !Boolean(t.is_paid),
              duration: Number(t.duration_mins || 60),
              marks: Number(t.total_marks || 100),
              negMark: Number(t.negative_marking || 0),
              qCount: Number(extra.qCount || 0)
            });
          });
        }
      }
    } catch (e) {
      console.warn("D1 tests load warning:", e);
    }

    const fbSnap = await safeGet("tests");
    const fbTests = fbSnap.docs.map((d) => ({ docId: d.id, source: "firebase", ...d.data() }));
    cacheTests = [...d1Tests, ...fbTests];
    renderTestsTable(false);
  };

  window.renderTestsTable = function (showAll = false) {
    const q = (document.getElementById("testSearchBox")?.value || "").trim().toLowerCase();
    const body = document.getElementById("testsTableBody");
    if (!body) return;
    if (!q && !showAll) {
      body.innerHTML = `<tr><td colspan="6" style="color:#64748b;">Total ${cacheTests.length} tests in database. Type in the search box above or click "Show All Tests" to view.</td></tr>`;
      return;
    }
    const list = showAll && !q
      ? cacheTests
      : cacheTests.filter((t) => (t.title || "").toLowerCase().includes(q) || (t.mainCat || "").toLowerCase().includes(q) || (t.subCat || "").toLowerCase().includes(q));
    body.innerHTML = list.slice(0, 60).map((t) => {
      const cnt = t.source === "d1" ? (t.qCount || "D1") : (Array.isArray(t.questions) ? t.questions.length : 0);
      const badge = t.source === "d1" ? `<span class="tag tag-ok">Cloudflare D1</span>` : `<span class="tag">Firebase</span>`;
      return `<tr>
        <td><strong>${t.title || t.docId}</strong> ${badge}</td>
        <td>${t.mainCat || "-"} / ${t.subCat || "-"}</td>
        <td>${t.isLive ? "All-India Live" : "Standard Mock"}</td>
        <td>${cnt} Qs</td>
        <td><span class="tag ${t.isFree ? 'tag-ok' : ''}">${t.isFree ? 'Free' : 'Pro Pass'}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteMockTestEntry('${t.docId}','${t.source || 'firebase'}')">Delete</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="6" style="color:#64748b;">No tests matching search.</td></tr>`;
  };

  window.deleteMockTestEntry = async function (docId, source) {
    if (!confirm("Delete this Mock / Live test permanently?")) return;
    if (source === "d1" && adminApi()) {
      await adminApi().deleteMockTest(docId);
    } else {
      await db.collection("tests").doc(docId).delete();
    }
    await loadTestsData();
  };

  window.createTestFromExcel = async function () {
    const title = document.getElementById("tTitle").value.trim();
    const cat = document.getElementById("tCat").value.trim();
    const subCat = document.getElementById("tSubCat").value.trim() || cat;
    const isLive = document.getElementById("tType").value === "live";
    const isFree = document.getElementById("tFree").value === "true";
    const duration = Number(document.getElementById("tDuration").value) || 60;
    const posMark = Number(document.getElementById("tPos").value) || 1;
    const negMark = Number(document.getElementById("tNeg").value) || 0;
    const liveEndTime = document.getElementById("tLiveEnd").value || "";
    const fileInput = document.getElementById("tFile");
    const msg = document.getElementById("tUploadMsg");

    if (!title || !cat || !fileInput.files.length) {
      alert("Title, Category, and Excel file are required.");
      return;
    }
    if (!adminApi()) {
      alert("TG_ADMIN_API not loaded.");
      return;
    }

    msg.style.color = "#1d4ed8";
    msg.innerText = "Uploading Mock/Live Test to Cloudflare D1...";

    try {
      const data = await fileInput.files[0].arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const questions = rows.map((r, i) => ({
        qId: "Q" + (i + 1),
        question: r.Question || r.QuestionHi || "",
        questionHi: r.QuestionHi || r.Question || "",
        options: [r.OptionA || "", r.OptionB || "", r.OptionC || "", r.OptionD || ""],
        optionsHi: [r.OptionAHi || r.OptionA || "", r.OptionBHi || r.OptionB || "", r.OptionCHi || r.OptionC || "", r.OptionDHi || r.OptionD || ""],
        correctAnswer: ({ A: 0, B: 1, C: 2, D: 3 }[String(r.CorrectOption || "A").trim().toUpperCase()]) ?? 0,
        explanation: r.Explanation || "",
        explanationHi: r.ExplanationHi || r.Explanation || ""
      }));

      const testId = "test_" + Date.now();
      const totalMarks = Number((questions.length * posMark).toFixed(2));
      const metaHeader = JSON.stringify({
        subCat,
        isLive,
        liveEndTime,
        posMark,
        qCount: questions.length
      });

      const resp = await adminApi().saveMockTest({
        test_id: testId,
        category: cat,
        title_en: title,
        title_hi: metaHeader,
        duration_mins: duration,
        total_marks: totalMarks,
        negative_marking: negMark,
        is_paid: isFree ? 0 : 1,
        sub_cat: subCat,
        is_live: isLive,
        live_end_time: liveEndTime,
        pos_mark: posMark,
        questions
      });

      if (!resp || !resp.ok) {
        throw new Error((resp && resp.error) || "Cloudflare D1 save failed");
      }

      msg.style.color = "#166534";
      msg.innerText = `✅ Cloudflare D1 में Test Published (${questions.length} Qs)!`;
      fileInput.value = "";
      await loadTestsData();
    } catch (err) {
      msg.style.color = "#dc2626";
      msg.innerText = "Error: " + (err.message || err);
    }
  };
})();


// =========================================================================
// SUBJECT-WISE PYQ BULK UPLOADER IN ADMIN TAB 4 (CLOUDFLARE D1)
// =========================================================================
(function initAdminPyqUploader() {
  const hostTab = document.getElementById("tab-practice");
  if (!hostTab || document.getElementById("pyqBulkUploaderCard")) return;

  const card = document.createElement("div");
  card.id = "pyqBulkUploaderCard";
  card.className = "panel-card";
  card.innerHTML = `
    <h3>Subject-Wise Previous Year Questions (PYQs) Bulk Uploader (Cloudflare D1)</h3>
    <p style="color:#64748b; margin-bottom:10px;">Upload Excel/CSV with columns: <strong>Subject, Topic, ExamYear</strong> (e.g., <em>SSC CGL 2024; UP Police 2024</em>), <strong>Question, QuestionHi, OptionA..D, OptionAHi..DHi, CorrectOption, Explanation, ExplanationHi</strong>. Students can read these free with green answers &amp; explanations even without login.</p>
    <div class="form-row">
      <div><label>Default Subject (if column empty)</label><input type="text" id="pyqDefSubject" placeholder="e.g., History, Polity, General Hindi" /></div>
      <div><label>Default Topic (if column empty)</label><input type="text" id="pyqDefTopic" placeholder="e.g., Modern History, Fundamental Rights" /></div>
      <div><label>Default Exam &amp; Year (if column empty)</label><input type="text" id="pyqDefExamYear" placeholder="e.g., SSC CGL 2024" /></div>
      <div><label>Select PYQ Excel / CSV File *</label><input type="file" id="pyqExcelFile" accept=".xlsx,.xls,.csv" /></div>
    </div>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <button type="button" class="btn btn-primary" id="btnUploadPyqs" onclick="uploadSubjectPyqExcel()">Upload PYQs to D1</button>
      <button type="button" class="btn btn-outline" onclick="downloadSamplePyqTemplate()">Download PYQ Template (.xlsx)</button>
      <span id="pyqUploadStatus" style="font-weight:600;"></span>
    </div>
  `;
  hostTab.appendChild(card);

  window.downloadSamplePyqTemplate = function () {
    const ws = XLSX.utils.json_to_sheet([{
      Subject: "Indian Polity",
      Topic: "Fundamental Rights",
      ExamYear: "SSC CGL 2024; UP Police Constable 2024",
      Question: "Which article of the Indian Constitution abolishes untouchability?",
      QuestionHi: "भारतीय संविधान का कौन सा अनुच्छेद अस्पृश्यता का अंत करता है?",
      OptionA: "Article 15", OptionB: "Article 17", OptionC: "Article 19", OptionD: "Article 21",
      OptionAHi: "अनुच्छेद 15", OptionBHi: "अनुच्छेद 17", OptionCHi: "अनुच्छेद 19", OptionDHi: "अनुच्छेद 21",
      CorrectOption: "B",
      Explanation: "Article 17 abolishes untouchability and forbids its practice in any form.",
      ExplanationHi: "अनुच्छेद 17 अस्पृश्यता को समाप्त करता है और इसके किसी भी रूप में आचरण को निषिद्ध करता है।"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PYQ_Questions");
    XLSX.writeFile(wb, "TaiyariGhar_SubjectWise_PYQ_Template.xlsx");
  };

  window.uploadSubjectPyqExcel = async function () {
    const fileInput = document.getElementById("pyqExcelFile");
    const defSub = document.getElementById("pyqDefSubject")?.value.trim() || "General";
    const defTop = document.getElementById("pyqDefTopic")?.value.trim() || "Mixed";
    const defExam = document.getElementById("pyqDefExamYear")?.value.trim() || "";
    const statusEl = document.getElementById("pyqUploadStatus");
    const btn = document.getElementById("btnUploadPyqs");

    if (!fileInput || !fileInput.files.length) {
      alert("Please select a PYQ Excel or CSV file.");
      return;
    }
    if (!window.TG_ADMIN_API?.bulkUploadPyqs) {
      alert("TG_ADMIN_API PYQ method missing.");
      return;
    }

    if (btn) btn.disabled = true;
    statusEl.style.color = "#1d4ed8";
    statusEl.innerText = "Reading PYQ file...";

    try {
      const data = await fileInput.files[0].arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) {
        statusEl.innerText = "File is empty.";
        return;
      }

      const ts = Date.now();
      const formatted = rows.map((r, idx) => {
        const qEn = String(r.Question || r["Question En"] || r.QuestionHi || "").trim();
        const qHi = String(r.QuestionHi || r["Question Hi"] || r.Question || "").trim();
        const expEn = String(r.Explanation || r["Explanation En"] || r.ExplanationHi || "").trim();
        const expHi = String(r.ExplanationHi || r["Explanation Hi"] || r.Explanation || "").trim();
        const ansChar = String(r.CorrectOption || r.Answer || "A").trim().toUpperCase();
        return {
          pyq_id: `pyq_${ts}_${idx + 1}`,
          subject: String(r.Subject || defSub).trim(),
          topic: String(r.Topic || r.Chapter || defTop).trim(),
          exam_year: String(r.ExamYear || r["Exam / Year"] || defExam).trim(),
          question_en: qEn,
          question_hi: qHi,
          options: [
            { en: String(r.OptionA || "").trim(), hi: String(r.OptionAHi || r.OptionA || "").trim() },
            { en: String(r.OptionB || "").trim(), hi: String(r.OptionBHi || r.OptionB || "").trim() },
            { en: String(r.OptionC || "").trim(), hi: String(r.OptionCHi || r.OptionC || "").trim() },
            { en: String(r.OptionD || "").trim(), hi: String(r.OptionDHi || r.OptionD || "").trim() }
          ],
          correct_option: ["A", "B", "C", "D"].includes(ansChar) ? ansChar : "A",
          explanation_en: expEn,
          explanation_hi: expHi
        };
      });

      const CHUNK = 100;
      let uploaded = 0;
      for (let i = 0; i < formatted.length; i += CHUNK) {
        const slice = formatted.slice(i, i + CHUNK);
        statusEl.innerText = `Uploading PYQs ${i + 1} to ${Math.min(i + CHUNK, formatted.length)} of ${formatted.length} to D1...`;
        const resp = await window.TG_ADMIN_API.bulkUploadPyqs(slice);
        if (!resp || !resp.ok) throw new Error((resp && resp.error) || "PYQ upload failed");
        uploaded += Number(resp.inserted || slice.length);
      }

      statusEl.style.color = "#166534";
      statusEl.innerText = `✅ Cloudflare D1 में ${uploaded} Subject-Wise PYQs Upload हो गए!`;
      fileInput.value = "";
    } catch (err) {
      statusEl.style.color = "#dc2626";
      statusEl.innerText = "Error: " + (err.message || err);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
})();


// =========================================================================
// DIRECT BILINGUAL CURRENT AFFAIRS OBJECTIVE QUESTIONS (SINGLE + EXCEL BULK)
// =========================================================================
(function initDirectCaQuestionsAdmin() {
  const hostTab = document.getElementById("tab-updates");
  if (!hostTab || document.getElementById("directCaQuestionCard")) return;

  const todayIso = new Date().toISOString().split("T")[0];
  const card = document.createElement("div");
  card.id = "directCaQuestionCard";
  card.className = "panel-card";
  card.innerHTML = `
    <h3>🎯 Add Direct Current Affairs Objective Question (Bilingual EN / HI)</h3>
    <p style="color:#64748b; margin-bottom:10px;">
      Add standalone Current Affairs MCQs directly (single question or Excel bulk upload). Current month questions automatically appear in <strong>Daily CA Practice</strong> and auto-shift to <strong>Monthly CA Revision</strong> once the month ends!
    </p>
    <div class="form-row">
      <div><label>Question Date (YYYY-MM-DD) *</label><input type="date" id="dcaDate" value="${todayIso}" /></div>
      <div><label>Topic / Tag (Optional)</label><input type="text" id="dcaTopic" placeholder="e.g., Defence, Economy, Sports, Awards" /></div>
      <div><label>Correct Option *</label>
        <select id="dcaAns">
          <option value="0">Option A</option>
          <option value="1">Option B</option>
          <option value="2">Option C</option>
          <option value="3">Option D</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div><label>Question (English) *</label><input type="text" id="dcaQEn" placeholder="Enter question in English" /></div>
      <div><label>Question (Hindi) *</label><input type="text" id="dcaQHi" placeholder="हिंदी में प्रश्न लिखें" /></div>
    </div>
    <div class="form-row">
      <div><label>Option A (EN)</label><input type="text" id="dcaOaEn" /></div>
      <div><label>Option B (EN)</label><input type="text" id="dcaObEn" /></div>
      <div><label>Option C (EN)</label><input type="text" id="dcaOcEn" /></div>
      <div><label>Option D (EN)</label><input type="text" id="dcaOdEn" /></div>
    </div>
    <div class="form-row">
      <div><label>Option A (HI)</label><input type="text" id="dcaOaHi" /></div>
      <div><label>Option B (HI)</label><input type="text" id="dcaObHi" /></div>
      <div><label>Option C (HI)</label><input type="text" id="dcaOcHi" /></div>
      <div><label>Option D (HI)</label><input type="text" id="dcaOdHi" /></div>
    </div>
    <div class="form-row">
      <div><label>Explanation (English)</label><input type="text" id="dcaExpEn" placeholder="Detailed explanation in English" /></div>
      <div><label>Explanation (Hindi)</label><input type="text" id="dcaExpHi" placeholder="हिंदी में विस्तृत व्याख्या" /></div>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px;">
      <button type="button" class="btn btn-primary" id="btnSaveDirectCaQ" onclick="saveDirectCaQuestion()">Publish Direct CA Question</button>
      <span id="dcaSaveMsg" style="font-weight:600;"></span>
    </div>

    <hr style="border:none; border-top:1px dashed #cbd5e1; margin:14px 0;">
    <div class="form-row">
      <div><label>Bulk Upload CA MCQs via Excel / CSV (.xlsx, .csv)</label><input type="file" id="dcaExcelFile" accept=".xlsx,.xls,.csv" /></div>
      <div><label>Default Date (if Date column empty)</label><input type="date" id="dcaBulkDate" value="${todayIso}" /></div>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      <button type="button" class="btn btn-primary" id="btnBulkDirectCaQ" onclick="bulkUploadDirectCaExcel()">Bulk Upload CA Excel</button>
      <button type="button" class="btn btn-outline" onclick="downloadSampleCaMcqTemplate()">Download CA MCQ Template (.xlsx)</button>
      <span id="dcaBulkMsg" style="font-weight:600;"></span>
    </div>
  `;

  // Insert right before the Published Content Manage table card if present
  const pubTable = document.getElementById("publishedContentAdminBody");
  const pubCard = pubTable ? pubTable.closest(".panel-card") : null;
  if (pubCard && pubCard.parentNode === hostTab) {
    hostTab.insertBefore(card, pubCard);
  } else {
    hostTab.appendChild(card);
  }

  window.downloadSampleCaMcqTemplate = function () {
    const ws = XLSX.utils.json_to_sheet([{
      Date: todayIso,
      Topic: "National & Defence",
      Question: "Which two Union Ministers represented India in the India-Japan 2+2 Ministerial Meeting?",
      QuestionHi: "भारत-जापान 2+2 मंत्रिस्तरीय बैठक में भारत का प्रतिनिधित्व किन दो केंद्रीय मंत्रियों ने किया?",
      OptionA: "Rajnath Singh and Dr. S. Jaishankar",
      OptionB: "Amit Shah and Nirmala Sitharaman",
      OptionC: "Nitin Gadkari and Piyush Goyal",
      OptionD: "Dharmendra Pradhan and Ashwini Vaishnaw",
      OptionAHi: "राजनाथ सिंह और डॉ. एस. जयशंकर",
      OptionBHi: "अमित शाह और निर्मला सीतारमण",
      OptionCHi: "नितिन गडकरी और पीयूष गोयल",
      OptionDHi: "धर्मेंद्र प्रधान और अश्विनी वैष्णव",
      CorrectOption: "A",
      Explanation: "Defence Minister Rajnath Singh and External Affairs Minister Dr. S. Jaishankar co-chaired the meeting.",
      ExplanationHi: "रक्षा मंत्री राजनाथ सिंह और विदेश मंत्री डॉ. एस. जयशंकर ने इस बैठक की सह-अध्यक्षता की।"
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CA_MCQs");
    XLSX.writeFile(wb, "TaiyariGhar_CurrentAffairs_MCQ_Template.xlsx");
  };

  window.saveDirectCaQuestion = async function () {
    const dateVal = document.getElementById("dcaDate")?.value || todayIso;
    const topicVal = document.getElementById("dcaTopic")?.value.trim() || "Current Affairs";
    const ansIdx = Number(document.getElementById("dcaAns")?.value || 0);
    const qEn = document.getElementById("dcaQEn")?.value.trim() || "";
    const qHi = document.getElementById("dcaQHi")?.value.trim() || "";
    const optsEn = [
      document.getElementById("dcaOaEn")?.value.trim() || "",
      document.getElementById("dcaObEn")?.value.trim() || "",
      document.getElementById("dcaOcEn")?.value.trim() || "",
      document.getElementById("dcaOdEn")?.value.trim() || ""
    ];
    const optsHi = [
      document.getElementById("dcaOaHi")?.value.trim() || "",
      document.getElementById("dcaObHi")?.value.trim() || "",
      document.getElementById("dcaOcHi")?.value.trim() || "",
      document.getElementById("dcaOdHi")?.value.trim() || ""
    ];
    const expEn = document.getElementById("dcaExpEn")?.value.trim() || "";
    const expHi = document.getElementById("dcaExpHi")?.value.trim() || "";
    const msg = document.getElementById("dcaSaveMsg");

    if (!qEn && !qHi) {
      alert("Please enter the question in English or Hindi.");
      return;
    }
    msg.style.color = "#1d4ed8";
    msg.innerText = "Saving question...";
    await db.collection("current_affairs").add({
      type: "Daily",
      title: topicVal,
      titleHi: topicVal,
      date: dateVal,
      question: qEn || qHi,
      questionHi: qHi || qEn,
      options: optsEn.map((o, i) => o || optsHi[i] || ""),
      optionsHi: optsHi.map((o, i) => o || optsEn[i] || ""),
      correctAnswer: ansIdx,
      explanation: expEn || expHi,
      explanationHi: expHi || expEn,
      createdAt: new Date().toISOString()
    });
    msg.style.color = "#166534";
    msg.innerText = "✅ Direct CA Objective Question Published!";
    ["dcaQEn", "dcaQHi", "dcaOaEn", "dcaObEn", "dcaOcEn", "dcaOdEn", "dcaOaHi", "dcaObHi", "dcaOcHi", "dcaOdHi", "dcaExpEn", "dcaExpHi"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  };

  window.bulkUploadDirectCaExcel = async function () {
    const fileInput = document.getElementById("dcaExcelFile");
    const defDate = document.getElementById("dcaBulkDate")?.value || todayIso;
    const msg = document.getElementById("dcaBulkMsg");
    if (!fileInput || !fileInput.files.length) {
      alert("Please select an Excel or CSV file.");
      return;
    }
    msg.style.color = "#1d4ed8";
    msg.innerText = "Uploading CA MCQs...";
    try {
      const data = await fileInput.files[0].arrayBuffer();
      const wb = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!rows.length) { msg.innerText = "File is empty."; return; }

      const batch = db.batch();
      let count = 0;
      rows.forEach(r => {
        const qEn = String(r.Question || r["Question En"] || "").trim();
        const qHi = String(r.QuestionHi || r["Question Hi"] || "").trim();
        if (!qEn && !qHi) return;
        const ansChar = String(r.CorrectOption || r.Answer || "A").trim().toUpperCase();
        const ansIdx = { A: 0, B: 1, C: 2, D: 3 }[ansChar] ?? 0;
        const dStr = String(r.Date || defDate).trim();
        const topic = String(r.Topic || r.Category || "Current Affairs").trim();
        const ref = db.collection("current_affairs").doc();
        batch.set(ref, {
          type: "Daily",
          title: topic,
          titleHi: topic,
          date: dStr,
          question: qEn || qHi,
          questionHi: qHi || qEn,
          options: [
            String(r.OptionA || r.OptionAHi || "").trim(),
            String(r.OptionB || r.OptionBHi || "").trim(),
            String(r.OptionC || r.OptionCHi || "").trim(),
            String(r.OptionD || r.OptionDHi || "").trim()
          ],
          optionsHi: [
            String(r.OptionAHi || r.OptionA || "").trim(),
            String(r.OptionBHi || r.OptionB || "").trim(),
            String(r.OptionCHi || r.OptionC || "").trim(),
            String(r.OptionDHi || r.OptionD || "").trim()
          ],
          correctAnswer: ansIdx,
          explanation: String(r.Explanation || r.ExplanationHi || "").trim(),
          explanationHi: String(r.ExplanationHi || r.Explanation || "").trim(),
          createdAt: new Date().toISOString()
        });
        count++;
      });
      await batch.commit();
      msg.style.color = "#166534";
      msg.innerText = `✅ Uploaded ${count} Bilingual Current Affairs MCQs!`;
      fileInput.value = "";
    } catch (err) {
      msg.style.color = "#dc2626";
      msg.innerText = "Error: " + err.message;
    }
  };
})();
