// TaiyariGhar Admin Control Panel Script (admin-app.js v29.0)
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

let allPartnersList = [];
let partnerSubFilter = "pending";
let approvingPartnerDoc = null;
let partnerRegOpen = true;

function showAdminWorkspaceUI() {
  document.getElementById("adminLoginGate").classList.add("hidden");
  document.getElementById("adminWorkspace").classList.remove("hidden");
  loadAdminDashboardData();
}

function showAdminLoginUI() {
  document.getElementById("adminLoginGate").classList.remove("hidden");
  document.getElementById("adminWorkspace").classList.add("hidden");
}

auth.onAuthStateChanged(user => {
  if (user) {
    showAdminWorkspaceUI();
  } else if (sessionStorage.getItem("tg_admin_fs_auth") === "1") {
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

window.switchAdminTab = function (tabKey) {
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  const nav = document.getElementById("nav-" + tabKey);
  if (nav) nav.classList.add("active");

  ["overview", "tests", "practice", "partners", "students", "payments", "updates", "banners"].forEach(k => {
    const el = document.getElementById("tab-" + k);
    if (el) el.classList.toggle("hidden", k !== tabKey);
  });
};

async function loadAdminDashboardData() {
  try {
    const safeGet = (colName) => db.collection(colName).get().catch(() => ({ size: 0, docs: [], forEach: () => {} }));
    const [stSnap, tSnap, pbSnap, pSnap, paySnap, jobSnap] = await Promise.all([
      safeGet("students"),
      safeGet("tests"),
      safeGet("practice_bank_bundles"),
      safeGet("partners"),
      safeGet("payments"),
      safeGet("job_updates")
    ]);

    const students = stSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const proCount = students.filter(s => s.isPaid).length;
    document.getElementById("kpiStudents").innerText = students.length;
    document.getElementById("kpiPro").innerText = proCount;
    document.getElementById("kpiTests").innerText = tSnap.size;

    let totalPbQs = 0;
    const pbBody = document.getElementById("pbBundlesBody");
    pbBody.innerHTML = "";
    pbSnap.forEach(doc => {
      const b = doc.data();
      const cnt = Array.isArray(b.questions) ? b.questions.length : 0;
      totalPbQs += cnt;
      pbBody.innerHTML += `<tr>
        <td>${doc.id}</td><td>${b.subject || "-"}</td><td>${b.topic || "-"}</td>
        <td>Pack ${b.packNumber || 1}</td><td>${cnt}</td>
        <td><button class="btn btn-danger" onclick="deleteDocItem('practice_bank_bundles','${doc.id}')">Delete</button></td>
      </tr>`;
    });
    document.getElementById("kpiPracticeQs").innerText = totalPbQs;

    // Tests table
    const tBody = document.getElementById("testsTableBody");
    tBody.innerHTML = "";
    tSnap.forEach(doc => {
      const t = doc.data();
      tBody.innerHTML += `<tr>
        <td>${t.title || doc.id}</td><td>${t.mainCat || t.category || "-"}</td>
        <td>${t.isLive ? "All-India Live" : "Standard Mock"}</td>
        <td>${Array.isArray(t.questions) ? t.questions.length : 0}</td>
        <td>${t.isFree ? "Free" : "Pro Pass"}</td>
        <td><button class="btn btn-danger" onclick="deleteDocItem('tests','${doc.id}')">Delete</button></td>
      </tr>`;
    });

    // Partners
    allPartnersList = pSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
    document.getElementById("kpiPartners").innerText = allPartnersList.filter(p => p.status === "approved").length;
    renderPartnersTable();

    // Students table
    const sBody = document.getElementById("studentsTableBody");
    sBody.innerHTML = students.slice(0, 100).map(s => `<tr>
      <td>${s.loginId || s.id}</td><td>${s.name || "-"}</td><td>${s.email || "-"}<br>${s.mobile || ""}</td>
      <td>${s.targetExam || "-"}</td><td>${s.cityState || "-"}</td>
      <td><span class="tag ${s.isPaid ? 'tag-ok' : ''}">${s.isPaid ? 'PRO (' + (s.expiry || '') + ')' : 'FREE'}</span></td>
    </tr>`).join("");

    // Payments table
    const payBody = document.getElementById("paymentsTableBody");
    payBody.innerHTML = paySnap.docs.slice(0, 100).map(d => {
      const p = d.data();
      return `<tr>
        <td>${p.invoiceNo || d.id}</td><td>${p.studentName || p.studentId || "-"}</td>
        <td>${p.plan || "-"}</td><td>₹${p.amount || 0}</td><td>${p.coupon || "-"}</td><td>${p.paymentId || "-"}</td>
      </tr>`;
    }).join("");

    // Published Jobs / Results / Admit Cards
    const jBody = document.getElementById("publishedJobsAdminBody");
    if (jBody) {
      jBody.innerHTML = jobSnap.docs.map(d => {
        const j = d.data();
        const lCount = Array.isArray(j.links) ? j.links.length : (j.link ? 1 : 0);
        return `<tr>
          <td><span class="tag">${j.category || 'Latest Job'}</span></td>
          <td>${j.title || '-'}</td><td>${lCount} Links</td><td>${j.date || '-'}</td>
          <td><button class="btn btn-danger" onclick="deleteDocItem('job_updates','${d.id}')">Delete</button></td>
        </tr>`;
      }).join("");
    }
  } catch (e) {
    console.error("Admin dashboard load error:", e);
  }
}

window.deleteDocItem = async function (col, id) {
  if (!confirm("Delete this item permanently?")) return;
  await db.collection(col).doc(id).delete();
  loadAdminDashboardData();
};

// Dynamic Link Rows for Jobs / Results / Admit Cards
window.addJobLinkRow = function () {
  const wrap = document.getElementById("dynamicJobLinksContainer");
  const row = document.createElement("div");
  row.className = "form-row job-link-row";
  row.style.marginBottom = "6px";
  row.innerHTML = `
    <div><input type="text" class="jl-label" placeholder="Link Name (e.g., Admit Card / Result)" /></div>
    <div style="display:flex; gap:6px;">
      <input type="url" class="jl-url" placeholder="https://..." />
      <button type="button" class="btn btn-danger" onclick="this.closest('.job-link-row').remove()">✕</button>
    </div>
  `;
  wrap.appendChild(row);
};

window.publishCaArticle = async function () {
  const title = document.getElementById("caArtTitle").value.trim();
  const category = document.getElementById("caArtCat").value.trim() || "Daily Current Affairs";
  const date = document.getElementById("caArtDate").value.trim();
  const pdfLink = document.getElementById("caArtPdf").value.trim();
  const content = document.getElementById("caArtBody").value.trim();
  const msg = document.getElementById("caArtMsg");

  if (!title || !content) { alert("Please enter headline and full article content."); return; }
  msg.innerText = "Publishing...";
  await db.collection("ca_articles").add({
    title, category, date, pdfLink, content,
    summary: content.slice(0, 220),
    createdAt: new Date().toISOString()
  });
  msg.style.color = "#166534";
  msg.innerText = "Article Published!";
  document.getElementById("caArtTitle").value = "";
  document.getElementById("caArtBody").value = "";
};

window.publishJobWithLinks = async function () {
  const category = document.getElementById("jobCat").value;
  const title = document.getElementById("jobTitle").value.trim();
  const date = document.getElementById("jobDate").value.trim();
  const description = document.getElementById("jobDesc").value.trim();
  const msg = document.getElementById("jobPubMsg");

  if (!title) { alert("Please enter Post / Exam Headline."); return; }
  const links = [];
  document.querySelectorAll(".job-link-row").forEach(row => {
    const label = row.querySelector(".jl-label").value.trim();
    const url = row.querySelector(".jl-url").value.trim();
    if (label && url) links.push({ label, url });
  });

  msg.innerText = "Publishing...";
  await db.collection("job_updates").add({
    category, title, date, description, links,
    link: links.length > 0 ? links[0].url : "",
    createdAt: new Date().toISOString()
  });
  msg.style.color = "#166534";
  msg.innerText = "Published Successfully!";
  document.getElementById("jobTitle").value = "";
  document.getElementById("jobDesc").value = "";
  loadAdminDashboardData();
};

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

// Smart Practice Bank 100-Q Bundler
window.uploadPracticeBankExcel = async function () {
  const fileInput = document.getElementById("pbExcelFile");
  const defSub = document.getElementById("pbDefSubject").value.trim();
  const defTop = document.getElementById("pbDefTopic").value.trim();
  const statusEl = document.getElementById("pbUploadStatus");

  if (!fileInput.files.length) { alert("Please select an Excel or CSV file."); return; }
  statusEl.innerText = "Reading file...";

  const data = await fileInput.files[0].arrayBuffer();
  const wb = XLSX.read(data);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  if (!rows.length) { statusEl.innerText = "File is empty."; return; }

  const grouped = {};
  rows.forEach(r => {
    const subj = (r.Subject || defSub || "General").trim();
    const top = (r.Topic || defTop || "Mixed").trim();
    const key = subj + "___" + top;
    if (!grouped[key]) grouped[key] = { subject: subj, topic: top, items: [] };
    const ansChar = String(r.CorrectOption || r.Answer || "A").trim().toUpperCase();
    const ansIdx = { A: 0, B: 1, C: 2, D: 3 }[ansChar] ?? 0;
    grouped[key].items.push({
      q: r.Question || "",
      options: [r.OptionA || "", r.OptionB || "", r.OptionC || "", r.OptionD || ""],
      ans: ansIdx,
      exp: r.Explanation || ""
    });
  });

  let bundlesCreated = 0;
  for (const key in grouped) {
    const grp = grouped[key];
    for (let i = 0; i < grp.items.length; i += 100) {
      const chunk = grp.items.slice(i, i + 100);
      const packNum = Math.floor(i / 100) + 1;
      const docId = `${grp.subject}_${grp.topic}_pack_${packNum}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
      await db.collection("practice_bank_bundles").doc(docId).set({
        subject: grp.subject,
        topic: grp.topic,
        packNumber: packNum,
        questions: chunk,
        updatedAt: new Date().toISOString()
      });
      bundlesCreated++;
    }
  }
  statusEl.style.color = "#166534";
  statusEl.innerText = `Uploaded ${rows.length} questions into ${bundlesCreated} bundle(s)!`;
  loadAdminDashboardData();
};

window.downloadSamplePracticeTemplate = function () {
  const ws = XLSX.utils.json_to_sheet([{
    Subject: "Hindi", Topic: "Vilom Shabd",
    Question: "'अमृत' का विलोम शब्द क्या है?",
    OptionA: "विष", OptionB: "सुधा", OptionC: "पीयूष", OptionD: "जल",
    CorrectOption: "A", Explanation: "अमृत का सही विलोम विष होता है।"
  }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PracticeBank");
  XLSX.writeFile(wb, "TaiyariGhar_PracticeBank_Sample.xlsx");
};

window.createTestFromExcel = async function () {
  const title = document.getElementById("tTitle").value.trim();
  const cat = document.getElementById("tCat").value.trim();
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
    explanation: r.Explanation || ""
  }));

  await db.collection("tests").add({
    title, mainCat: cat, subCat: cat, examName: title,
    isLive, isFree, duration, posMark, negMark, liveEndTime,
    questions, createdAt: new Date().toISOString()
  });
  msg.style.color = "#166534";
  msg.innerText = "Test Published!";
  loadAdminDashboardData();
};

// Partners Management
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
    <td>
      ${partnerSubFilter === "pending" ? `<button class="btn btn-primary" onclick="openApproveModal('${p.docId}')">Approve</button>` : ""}
    </td>
  </tr>`).join("");
};

window.openApproveModal = function (docId) {
  approvingPartnerDoc = allPartnersList.find(p => p.docId === docId);
  if (!approvingPartnerDoc) return;
  document.getElementById("apModalPid").innerText = approvingPartnerDoc.partnerId || docId;
  document.getElementById("apCouponCode").value = approvingPartnerDoc.couponCode || "";
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
  loadAdminDashboardData();
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
};
