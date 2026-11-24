// ============================================================================
// TaiyariGhar Admin Control Panel Script (admin-app.js)
// ============================================================================

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

auth.onAuthStateChanged(user => {
  if (user && user.email === "madhupverma8@gmail.com") {
    document.getElementById("adminLoginGate").classList.add("hidden");
    document.getElementById("adminWorkspace").classList.remove("hidden");
    loadAdminDashboardData();
  } else {
    document.getElementById("adminLoginGate").classList.remove("hidden");
    document.getElementById("adminWorkspace").classList.add("hidden");
  }
});

async function loginAdmin() {
  const email = document.getElementById("admEmail").value.trim();
  const pass = document.getElementById("admPass").value;
  const err = document.getElementById("admLoginErr");
  err.textContent = "";
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    err.textContent = "Login failed: " + e.message;
  }
}

function logoutAdmin() {
  auth.signOut();
}

function switchAdminTab(tab) {
  ["overview", "tests", "practice", "partners", "students", "payments", "updates"].forEach(t => {
    document.getElementById("tab-" + t)?.classList.add("hidden");
    document.getElementById("nav-" + t)?.classList.remove("active");
  });
  document.getElementById("tab-" + tab)?.classList.remove("hidden");
  document.getElementById("nav-" + tab)?.classList.add("active");

  const titles = {
    overview: "Overview & Platform Summary",
    tests: "Mock & All-India Live Tests",
    practice: "Unlimited Smart Practice Bank (100-Q Bundles)",
    partners: "Official Referral Partners & Coupons",
    students: "Registered Candidates",
    payments: "Subscription Payments & Invoices",
    updates: "Current Affairs & Govt Job Updates"
  };
  document.getElementById("topbarTitle").textContent = titles[tab] || "Admin Panel";

  if (tab === "practice") loadPracticeBundlesTable();
  if (tab === "partners") loadPartnersList();
  if (tab === "tests") loadTestsTable();
  if (tab === "students") loadStudentsTable();
  if (tab === "payments") loadPaymentsTable();
}

async function loadAdminDashboardData() {
  try {
    const [stSnap, testSnap, partSnap, catDoc] = await Promise.all([
      db.collection("students").get(),
      db.collection("tests").get(),
      db.collection("partners").where("status", "==", "approved").get(),
      db.collection("settings").doc("practice_catalog").get()
    ]);
    document.getElementById("kpiStudents").textContent = stSnap.size;
    let proCount = 0;
    stSnap.forEach(d => {
      if (d.data().passExpiry && new Date(d.data().passExpiry).getTime() > Date.now()) proCount++;
    });
    document.getElementById("kpiPro").textContent = proCount;
    document.getElementById("kpiTests").textContent = testSnap.size;
    document.getElementById("kpiPartners").textContent = partSnap.size;

    let totalPbQs = 0;
    if (catDoc.exists && Array.isArray(catDoc.data().bundles)) {
      catDoc.data().bundles.forEach(b => totalPbQs += Number(b.count || 0));
    }
    document.getElementById("kpiPracticeQs").textContent = totalPbQs;
  } catch (e) { console.error(e); }
}

// ----------------------------------------------------------------------------
// Smart Practice Bank: 100-Question Smart Bundle Excel/CSV Uploader
// ----------------------------------------------------------------------------
function downloadSamplePracticeTemplate() {
  const rows = [
    {
      Subject: "Hindi",
      Topic: "Vilom Shabd",
      Question: "अमृत का विलोम शब्द क्या है?",
      OptionA: "विष",
      OptionB: "सुधा",
      OptionC: "पीयूष",
      OptionD: "अमी",
      CorrectOption: "A",
      Explanation: "अमृत का सही विलोम शब्द विष होता है।"
    }
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PracticeQuestions");
  XLSX.writeFile(wb, "TaiyariGhar_Practice_Bank_Template.xlsx");
}

async function uploadPracticeBankExcel() {
  const fileInput = document.getElementById("pbExcelFile");
  const defSub = document.getElementById("pbDefSubject").value.trim() || "General";
  const defTop = document.getElementById("pbDefTopic").value.trim() || "General Practice";
  const statusEl = document.getElementById("pbUploadStatus");
  const btn = document.getElementById("btnUploadPb");

  if (!fileInput.files || !fileInput.files[0]) {
    statusEl.style.color = "#dc2626"; statusEl.textContent = "Please choose an Excel/CSV file first."; return;
  }

  btn.disabled = true;
  statusEl.style.color = "#2563eb";
  statusEl.textContent = "Reading Excel & bundling into 100-question packs...";

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) throw new Error("Excel file is empty.");

      // Group rows by Subject + Topic
      const grouped = {};
      rows.forEach((r, idx) => {
        const subject = String(r.Subject || r.subject || defSub).trim();
        const topic = String(r.Topic || r.topic || defTop).trim();
        const key = `${subject}|||${topic}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          id: "PB_" + Date.now() + "_" + idx,
          subject,
          topic,
          question: String(r.Question || r.question || "").trim(),
          optionA: String(r.OptionA || r.optionA || r["Option A"] || "").trim(),
          optionB: String(r.OptionB || r.optionB || r["Option B"] || "").trim(),
          optionC: String(r.OptionC || r.optionC || r["Option C"] || "").trim(),
          optionD: String(r.OptionD || r.optionD || r["Option D"] || "").trim(),
          correctOption: String(r.CorrectOption || r.correctOption || r.Answer || "A").trim().toUpperCase(),
          explanation: String(r.Explanation || r.explanation || "").trim()
        });
      });

      // Load existing catalog metadata
      const catRef = db.collection("settings").doc("practice_catalog");
      const catSnap = await catRef.get();
      let catalogBundles = catSnap.exists && Array.isArray(catSnap.data().bundles) ? catSnap.data().bundles : [];

      let packsCreated = 0;
      for (const key of Object.keys(grouped)) {
        const [subject, topic] = key.split("|||");
        const qList = grouped[key];
        const slug = (subject + "_" + topic).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

        // Find highest existing packIndex for this subject+topic
        const existingPacks = catalogBundles.filter(b => b.subject === subject && b.topic === topic);
        let nextPack = existingPacks.length > 0 ? Math.max(...existingPacks.map(p => p.packIndex || 1)) + 1 : 1;

        // Chunk into 100-question bundles
        for (let i = 0; i < qList.length; i += 100) {
          const chunk = qList.slice(i, i + 100);
          const bundleId = `${slug}_pack_${nextPack}`;
          await db.collection("practice_bank").doc(bundleId).set({
            bundleId,
            subject,
            topic,
            packIndex: nextPack,
            questions: chunk,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          catalogBundles = catalogBundles.filter(b => b.bundleId !== bundleId);
          catalogBundles.push({
            bundleId,
            subject,
            topic,
            packIndex: nextPack,
            count: chunk.length
          });
          nextPack++;
          packsCreated++;
        }
      }

      await catRef.set({ bundles: catalogBundles }, { merge: true });

      btn.disabled = false;
      fileInput.value = "";
      statusEl.style.color = "#15803d";
      statusEl.textContent = `Uploaded ${rows.length} questions across ${packsCreated} smart bundle(s)!`;
      loadPracticeBundlesTable();
      loadAdminDashboardData();
    } catch (err) {
      btn.disabled = false;
      statusEl.style.color = "#dc2626";
      statusEl.textContent = "Error: " + err.message;
    }
  };
  reader.readAsBinaryString(fileInput.files[0]);
}

async function loadPracticeBundlesTable() {
  const tbody = document.getElementById("pbBundlesBody");
  tbody.innerHTML = `<tr><td colspan="6">Loading bundles...</td></tr>`;
  const catSnap = await db.collection("settings").doc("practice_catalog").get();
  const bundles = catSnap.exists && Array.isArray(catSnap.data().bundles) ? catSnap.data().bundles : [];
  if (!bundles.length) {
    tbody.innerHTML = `<tr><td colspan="6">No practice bundles uploaded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = bundles.map(b => `
    <tr>
      <td><strong>${b.bundleId}</strong></td>
      <td>${b.subject}</td>
      <td>${b.topic}</td>
      <td>Pack #${b.packIndex}</td>
      <td>${b.count} Qs</td>
      <td><button class="btn btn-danger" onclick="deletePracticeBundle('${b.bundleId}')">Delete</button></td>
    </tr>
  `).join("");
}

async function deletePracticeBundle(bundleId) {
  if (!confirm("Delete bundle " + bundleId + "?")) return;
  await db.collection("practice_bank").doc(bundleId).delete();
  const catRef = db.collection("settings").doc("practice_catalog");
  const snap = await catRef.get();
  if (snap.exists) {
    const updated = (snap.data().bundles || []).filter(b => b.bundleId !== bundleId);
    await catRef.set({ bundles: updated }, { merge: true });
  }
  loadPracticeBundlesTable();
  loadAdminDashboardData();
}

// ----------------------------------------------------------------------------
// Referral Partners & Coupons Management
// ----------------------------------------------------------------------------
async function loadPartnersList() {
  const cfg = await db.collection("settings").doc("app_config").get();
  partnerRegOpen = !(cfg.exists && cfg.data().partnerRegEnabled === false);
  const stEl = document.getElementById("partnerRegStatusText");
  stEl.textContent = partnerRegOpen ? "OPEN" : "CLOSED";
  stEl.className = partnerRegOpen ? "tag tag-ok" : "tag tag-err";

  const snap = await db.collection("partners").get();
  allPartnersList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  renderPartnersTable();
}

async function togglePartnerRegSetting() {
  partnerRegOpen = !partnerRegOpen;
  await db.collection("settings").doc("app_config").set({ partnerRegEnabled: partnerRegOpen }, { merge: true });
  loadPartnersList();
}

function filterPartnersTab(status) {
  partnerSubFilter = status;
  ["pending", "approved", "rejected"].forEach(s => {
    document.getElementById("pSub-" + s).className = s === status ? "btn btn-primary" : "btn btn-outline";
  });
  renderPartnersTable();
}

function renderPartnersTable() {
  const q = (document.getElementById("partnerSearchBox").value || "").trim().toLowerCase();
  const filtered = allPartnersList.filter(p => {
    if ((p.status || "pending") !== partnerSubFilter) return false;
    if (!q) return true;
    return [p.partnerId, p.name, p.mobile, p.email, p.couponCode].some(val => String(val || "").toLowerCase().includes(q));
  });

  const tbody = document.getElementById("partnersTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7">No partners in this category.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><strong>${p.partnerId}</strong></td>
      <td>${p.name}<br /><span style="color:#64748b;">${p.channel || "-"}</span></td>
      <td>${p.mobile}<br />${p.email}</td>
      <td>${p.bankName} (${p.holderName})<br />A/C: ${p.accountNo} | IFSC: ${p.ifsc}<br />UPI: ${p.upi || "-"}</td>
      <td><strong>${p.couponCode || "-"}</strong><br /><span style="color:#64748b;">Rs.${p.discountAmount || 20} off + ${p.extraDays || 15}d</span></td>
      <td>${p.usedCount || 0} sales<br /><strong>Rs.${p.totalCommission || 0}</strong></td>
      <td>
        ${p.status !== "approved" ? `<button class="btn btn-primary" onclick="openApprovePartnerModal('${p.docId}')">Verify &amp; Approve</button>` : `<button class="btn btn-outline" onclick="openApprovePartnerModal('${p.docId}')">Edit Offer</button>`}
        ${p.status !== "rejected" ? `<button class="btn btn-danger" style="margin-top:4px;" onclick="rejectPartner('${p.docId}')">Reject</button>` : ""}
      </td>
    </tr>
  `).join("");
}

function generateUniqueCouponCode(partnerName) {
  const clean = (partnerName || "TG").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 5) || "TGP";
  const existing = new Set(allPartnersList.map(p => (p.couponCode || "").toUpperCase()));
  let code = "";
  do {
    code = clean + Math.floor(10 + Math.random() * 89);
  } while (existing.has(code));
  return code;
}

function openApprovePartnerModal(docId) {
  approvingPartnerDoc = allPartnersList.find(p => p.docId === docId);
  if (!approvingPartnerDoc) return;
  document.getElementById("apModalPid").textContent = approvingPartnerDoc.partnerId;
  document.getElementById("apCouponCode").value = approvingPartnerDoc.couponCode || generateUniqueCouponCode(approvingPartnerDoc.name);
  document.getElementById("apDiscount").value = approvingPartnerDoc.discountAmount || 20;
  document.getElementById("apExtraDays").value = approvingPartnerDoc.extraDays || 15;
  document.getElementById("apCommission").value = approvingPartnerDoc.commissionPerSale || 25;
  document.getElementById("approvePartnerModal").classList.remove("hidden");
}

async function confirmApprovePartner() {
  if (!approvingPartnerDoc) return;
  const couponCode = document.getElementById("apCouponCode").value.trim().toUpperCase();
  const discountAmount = Number(document.getElementById("apDiscount").value || 20);
  const extraDays = Number(document.getElementById("apExtraDays").value || 15);
  const commissionPerSale = Number(document.getElementById("apCommission").value || 25);

  const dup = allPartnersList.find(p => p.docId !== approvingPartnerDoc.docId && (p.couponCode || "").toUpperCase() === couponCode);
  if (dup) {
    alert("This coupon code is already assigned to " + dup.partnerId);
    return;
  }

  await db.collection("partners").doc(approvingPartnerDoc.docId).update({
    status: "approved",
    couponCode,
    discountAmount,
    extraDays,
    commissionPerSale,
    rejectReason: ""
  });

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "partner_status",
      email: approvingPartnerDoc.email,
      name: approvingPartnerDoc.name,
      status: "approved",
      partnerId: approvingPartnerDoc.partnerId,
      couponCode
    })
  }).catch(() => {});

  document.getElementById("approvePartnerModal").classList.add("hidden");
  loadPartnersList();
}

async function rejectPartner(docId) {
  const p = allPartnersList.find(x => x.docId === docId);
  if (!p) return;
  const reason = prompt("Enter rejection reason for " + p.name + ":", "Bank account holder name mismatch");
  if (reason === null) return;

  await db.collection("partners").doc(docId).update({
    status: "rejected",
    rejectReason: reason
  });

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "partner_status",
      email: p.email,
      name: p.name,
      status: "rejected",
      partnerId: p.partnerId,
      reason
    })
  }).catch(() => {});

  loadPartnersList();
}

function exportPartnersCsv(mode) {
  const rows = allPartnersList.filter(p => mode === "payout" ? p.status === "approved" && Number(p.totalCommission || 0) > 0 : true);
  if (!rows.length) { alert("No records to export."); return; }

  const headers = mode === "payout"
    ? ["PartnerID", "BeneficiaryName", "AccountNumber", "IFSC", "BankName", "UPI", "PayableAmountINR"]
    : ["PartnerID", "Name", "Mobile", "Email", "Status", "CouponCode", "BankName", "AccountNo", "IFSC", "UPI", "UsedCount", "TotalCommission"];

  const csvLines = [headers.join(",")];
  rows.forEach(p => {
    const vals = mode === "payout"
      ? [p.partnerId, p.holderName || p.name, `'${p.accountNo}`, p.ifsc, p.bankName, p.upi || "", p.totalCommission || 0]
      : [p.partnerId, p.name, p.mobile, p.email, p.status, p.couponCode || "", p.bankName, `'${p.accountNo}`, p.ifsc, p.upi || "", p.usedCount || 0, p.totalCommission || 0];
    csvLines.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = mode === "payout" ? "TaiyariGhar_Partner_Payout_NEFT.csv" : "TaiyariGhar_All_Partners.csv";
  a.click();
}

// ----------------------------------------------------------------------------
// Mock Tests, Students, Payments & Content Updates
// ----------------------------------------------------------------------------
async function createTestFromExcel() {
  const title = document.getElementById("tTitle").value.trim();
  const category = document.getElementById("tCat").value.trim();
  const testType = document.getElementById("tType").value;
  const isFree = document.getElementById("tFree").value === "true";
  const durationMinutes = Number(document.getElementById("tDuration").value || 60);
  const positiveMarks = Number(document.getElementById("tPos").value || 2);
  const negativeMarks = Number(document.getElementById("tNeg").value || 0.5);
  const liveEnd = document.getElementById("tLiveEnd").value || null;
  const file = document.getElementById("tFile").files[0];
  const msg = document.getElementById("tUploadMsg");

  if (!title || !file) { msg.style.color = "#dc2626"; msg.textContent = "Title and Excel file required."; return; }
  msg.style.color = "#2563eb"; msg.textContent = "Uploading test...";

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const testRef = await db.collection("tests").add({
        title, category, testType, isFree, durationMinutes,
        positiveMarks, negativeMarks, liveEnd,
        totalQuestions: rows.length,
        totalMarks: rows.length * positiveMarks,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      const batch = db.batch();
      rows.forEach((r, idx) => {
        const qRef = db.collection("questions").doc();
        batch.set(qRef, {
          testId: testRef.id,
          qIndex: idx + 1,
          questionText: String(r.Question || r.question || ""),
          optionA: String(r.OptionA || r.optionA || ""),
          optionB: String(r.OptionB || r.optionB || ""),
          optionC: String(r.OptionC || r.optionC || ""),
          optionD: String(r.OptionD || r.optionD || ""),
          correctOption: String(r.CorrectOption || r.correctOption || "A").toUpperCase(),
          explanation: String(r.Explanation || r.explanation || "")
        });
      });
      await batch.commit();
      msg.style.color = "#15803d"; msg.textContent = `Published "${title}" (${rows.length} Qs)!`;
      loadTestsTable();
    } catch (e) {
      msg.style.color = "#dc2626"; msg.textContent = e.message;
    }
  };
  reader.readAsBinaryString(file);
}

async function loadTestsTable() {
  const snap = await db.collection("tests").orderBy("createdAt", "desc").get();
  document.getElementById("testsTableBody").innerHTML = snap.docs.map(d => {
    const t = d.data();
    return `<tr>
      <td><strong>${t.title}</strong></td><td>${t.category || "-"}</td><td>${t.testType}</td>
      <td>${t.totalQuestions || 0}</td><td>${t.isFree ? "Free" : "Pro"}</td>
      <td><button class="btn btn-danger" onclick="db.collection('tests').doc('${d.id}').delete().then(loadTestsTable)">Delete</button></td>
    </tr>`;
  }).join("");
}

async function loadStudentsTable() {
  const snap = await db.collection("students").limit(100).get();
  document.getElementById("studentsTableBody").innerHTML = snap.docs.map(d => {
    const s = d.data();
    const active = s.passExpiry && new Date(s.passExpiry).getTime() > Date.now();
    return `<tr>
      <td>${s.studentId}</td><td>${s.name}</td><td>${s.email}<br />${s.mobile || "-"}</td>
      <td>${s.targetExam || "-"}</td><td>${s.cityState || "-"}</td>
      <td><span class="tag ${active ? "tag-ok" : ""}">${active ? s.passPlan : "Free"}</span></td>
    </tr>`;
  }).join("");
}

async function loadPaymentsTable() {
  const snap = await db.collection("payments").orderBy("createdAt", "desc").limit(100).get();
  document.getElementById("paymentsTableBody").innerHTML = snap.docs.map(d => {
    const p = d.data();
    return `<tr>
      <td>${p.invoiceNumber}</td><td>${p.studentName} (${p.studentId})</td>
      <td>${p.planName}</td><td>Rs.${p.amount}</td><td>${p.couponCode || "-"}</td><td>${p.paymentId}</td>
    </tr>`;
  }).join("");
}

async function publishContentUpdate() {
  const col = document.getElementById("updType").value;
  const title = document.getElementById("updTitle").value.trim();
  const body = document.getElementById("updBody").value.trim();
  if (!title || !body) return alert("Enter both title and details.");
  await db.collection(col).add({
    title, summary: body, description: body,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById("updTitle").value = "";
  document.getElementById("updBody").value = "";
  alert("Published successfully!");
}
