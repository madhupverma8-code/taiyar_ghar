// Copyright (c) 2026 TaiyariGhar. All Rights Reserved.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Official Firebase Configuration (Matched with student-app.js)
const firebaseConfig = {
    apiKey: "AIzaSyA7x6gQziPYlxrXnyVJJ80mvJjkh3VCm24",
    authDomain: "taiyarighar.firebaseapp.com",
    projectId: "taiyarighar",
    storageBucket: "taiyarighar.firebasestorage.app",
    messagingSenderId: "329150812714",
    appId: "1:329150812714:web:1f292d05aaba0cb918e953"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allCategoriesData = [];
let loadedTabs = {}; // Lazy Loading Cache (Har tab ek hi baar load hoga)

// Helper for UTF-8 CSV Download (Hindi text Excel me bilkul sahi dikhega)
function triggerCsvDownload(filename, headers, rows) {
    const csvContent = "\uFEFF" + Papa.unparse({ fields: headers, data: rows });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Check if admin is already signed in via Firebase Auth
onAuthStateChanged(auth, (user) => {
    if (user && user.email && user.email.toLowerCase() === "madhupverma8@gmail.com") {
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        initFastAdminDashboard();
    }
});

// 1. Official Firebase Authentication Login
window.checkPass = async function() {
    const emailEl = document.getElementById('adminEmail');
    const passEl = document.getElementById('adminPass');
    const errMsg = document.getElementById('errMsg');
    const btn = document.getElementById('btnUnlock');

    if (!emailEl || !passEl) return;
    const email = emailEl.value.trim().toLowerCase();
    const pass = passEl.value.trim();

    if (!email || !pass) {
        if (errMsg) {
            errMsg.textContent = "❌ Please enter both Admin Email and Password!";
            errMsg.style.display = 'block';
        }
        return;
    }

    if (email !== "madhupverma8@gmail.com") {
        if (errMsg) {
            errMsg.textContent = "❌ Unauthorized Admin Email!";
            errMsg.style.display = 'block';
        }
        return;
    }

    if (errMsg) errMsg.style.display = 'none';
    if (btn) btn.textContent = "Authenticating...";

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        if (btn) btn.textContent = "Unlock Panel";
        initFastAdminDashboard();
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        if (errMsg) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                errMsg.textContent = "❌ Incorrect Firebase Admin Password!";
            } else if (error.code === 'auth/too-many-requests') {
                errMsg.textContent = "❌ Too many failed attempts. Please wait a few minutes.";
            } else {
                errMsg.textContent = "❌ Login Failed: " + error.message;
            }
            errMsg.style.display = 'block';
        }
        if (btn) btn.textContent = "Unlock Panel";
    }
};

window.logoutAdmin = async function() {
    await signOut(auth);
    loadedTabs = {};
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('lockScreen').style.display = 'flex';
    document.getElementById('adminPass').value = '';
};

// FAST INIT: Parallel load only Settings & Categories first (< 1 Second)
async function initFastAdminDashboard() {
    if (loadedTabs.init) return;
    loadedTabs.init = true;
    await Promise.all([loadSettings(), loadCategories()]);
}

// LAZY TAB LOADER: Load heavy tables only when user clicks that tab
window.openTab = function(tabId, btn) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    if (btn) btn.classList.add('active');

    if (!loadedTabs[tabId]) {
        loadedTabs[tabId] = true;
        if (tabId === 'tabReports') loadReportedQuestions();
        if (tabId === 'tabPartners') initPartnerAdmin();
    }
};

// 2. Settings & 3-Tier Subscription Pricing
window.loadSettings = async function() {
    try {
        const docSnap = await getDoc(doc(db, "settings", "global"));
        if (docSnap.exists()) {
            const d = docSnap.data();
            if (document.getElementById('plan3Mrp')) document.getElementById('plan3Mrp').value = d.Plan3_MRP || 149;
            if (document.getElementById('plan3Price')) document.getElementById('plan3Price').value = d.Plan3_Price || 99;
            if (document.getElementById('plan6Mrp')) document.getElementById('plan6Mrp').value = d.Plan6_MRP || 249;
            if (document.getElementById('plan6Price')) document.getElementById('plan6Price').value = d.Plan6_Price || 199;
            if (document.getElementById('plan12Mrp')) document.getElementById('plan12Mrp').value = d.Plan12_MRP || 399;
            if (document.getElementById('plan12Price')) document.getElementById('plan12Price').value = d.Plan12_Price || 249;
            if (document.getElementById('setUpi')) document.getElementById('setUpi').value = d.UPI_ID || "taiyarighar@ptye";
            if (document.getElementById('setMobile')) document.getElementById('setMobile').value = d.Mobile || "9140281870";
        }
    } catch (e) { console.error("Settings load error:", e); }
};

window.saveSettings = async function() {
    try {
        const data = {
            Plan3_MRP: Number(document.getElementById('plan3Mrp').value),
            Plan3_Price: Number(document.getElementById('plan3Price').value),
            Plan6_MRP: Number(document.getElementById('plan6Mrp').value),
            Plan6_Price: Number(document.getElementById('plan6Price').value),
            Plan12_MRP: Number(document.getElementById('plan12Mrp').value),
            Plan12_Price: Number(document.getElementById('plan12Price').value),
            UPI_ID: document.getElementById('setUpi').value.trim(),
            Mobile: document.getElementById('setMobile').value.trim()
        };
        await setDoc(doc(db, "settings", "global"), data, { merge: true });
        const msg = document.getElementById('settingsMsg');
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
    } catch (e) {
        alert("❌ Error saving settings: " + e.message);
    }
};

// 3. Students Management
window.loadStudents = async function() {
    try {
        const snap = await getDocs(collection(db, "students"));
        const tbody = document.querySelector("#studentsTable tbody");
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No students found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const s = d.data();
            html += `<tr>
                <td>${s.name || '-'}</td>
                <td>${s.mobile || '-'}</td>
                <td>${s.loginId || s.studentId || '-'}</td>
                <td>${s.email || '-'}</td>
                <td class="${s.isPaid ? 'status-paid' : 'status-free'}">${s.isPaid ? 'PRO' : 'FREE'}</td>
                <td>${s.expiryDate || 'N/A'}</td>
                <td>${(s.device1 ? 1 : 0) + (s.device2 ? 1 : 0)}/2</td>
                <td>
                    <button class="btn-approve" onclick="makePro('${d.id}')">Make Pro</button>
                    <button class="btn-unpaid" onclick="makeFree('${d.id}')">Free</button>
                    <button style="background:#4F46E5; color:white; border:none; padding:6px 10px; border-radius:5px; cursor:pointer; font-size:11px; margin-top:3px;" onclick="resetStudentDevices('${d.id}')">🔄 Reset Devices</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error("Students load error:", e); }
};

window.makePro = async function(id) {
    const exp = new Date();
    exp.setDate(exp.getDate() + 365);
    await updateDoc(doc(db, "students", id), { isPaid: true, expiryDate: exp.toISOString().split('T')[0] });
    alert("✅ Upgraded to Pro!");
    loadStudents();
};


window.resetStudentDevices = async function(id) {
    if (confirm("Reset registered devices for this student to 0/2?")) {
        await updateDoc(doc(db, "students", id), { device1: "", device2: "" });
        alert("✅ Devices Reset to 0/2!");
        loadStudents();
    }
};

window.makeFree = async function(id) {
    await updateDoc(doc(db, "students", id), { isPaid: false, expiryDate: 'N/A' });
    alert("Downgraded to Free!");
    loadStudents();
};

// 4. Categories & Dropdowns
window.loadCategories = async function() {
    try {
        const snap = await getDocs(collection(db, "exam_categories"));
        const tbody = document.querySelector("#categoriesTable tbody");
        allCategoriesData = [];
        let html = "";
        snap.forEach(d => {
            const c = { id: d.id, ...d.data() };
            allCategoriesData.push(c);
            html += `<tr><td>${c.mainCat}</td><td>${c.subCat}</td><td>${c.examName}</td><td><button class="btn-delete" onclick="deleteCat('${d.id}')">Delete</button></td></tr>`;
        });
        if (tbody) tbody.innerHTML = html || `<tr><td colspan="4" style="text-align:center;">No categories found</td></tr>`;
        
        const mainSelect = document.getElementById('tMain');
        if (mainSelect) {
            const uniqueMains = [...new Set(allCategoriesData.map(item => item.mainCat))];
            mainSelect.innerHTML = `<option value="">Select Main Category</option>` + uniqueMains.map(m => `<option value="${m}">${m}</option>`).join('');
        }
    } catch (e) { console.error("Categories load error:", e); }
};

window.updateSubCatDropdown = function() {
    const mainVal = document.getElementById('tMain').value;
    const subSelect = document.getElementById('tSub');
    const filtered = allCategoriesData.filter(c => c.mainCat === mainVal);
    const uniqueSubs = [...new Set(filtered.map(item => item.subCat))];
    subSelect.innerHTML = `<option value="">Select Sub Category</option>` + uniqueSubs.map(s => `<option value="${s}">${s}</option>`).join('');
};

window.updateExamNameDropdown = function() {
    const mainVal = document.getElementById('tMain').value;
    const subVal = document.getElementById('tSub').value;
    const examSelect = document.getElementById('tExam');
    const filtered = allCategoriesData.filter(c => c.mainCat === mainVal && c.subCat === subVal);
    const uniqueExams = [...new Set(filtered.map(item => item.examName))];
    examSelect.innerHTML = `<option value="">Select Exam Name / Type</option>` + uniqueExams.map(e => `<option value="${e}">${e}</option>`).join('');
};

window.saveCategory = async function() {
    const mainCat = document.getElementById('newMainCat').value.trim();
    const subCat = document.getElementById('newSubCat').value.trim();
    const examName = document.getElementById('newExamName').value.trim();
    if (!mainCat || !subCat || !examName) { alert("Please fill all category fields!"); return; }
    await addDoc(collection(db, "exam_categories"), { mainCat, subCat, examName });
    document.getElementById('newMainCat').value = '';
    document.getElementById('newSubCat').value = '';
    document.getElementById('newExamName').value = '';
    loadCategories();
};

window.deleteCat = async function(id) {
    if (confirm("Delete this category?")) {
        await deleteDoc(doc(db, "exam_categories", id));
        loadCategories();
    }
};

// 5. Tests & Live Exams Management
window.toggleTestNeg = function() {
    const val = document.getElementById('tHasNeg').value;
    document.getElementById('tNegBox').style.display = val === 'Yes' ? 'block' : 'none';
};

window.loadTests = async function() {
    try {
        const snap = await getDocs(collection(db, "tests"));
        const tbody = document.querySelector("#testsTable tbody");
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No tests found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const t = d.data();
            html += `<tr>
                <td>${t.testId || d.id}</td>
                <td>${t.mainCat || '-'}</td>
                <td>${t.testName}</td>
                <td style="color:${t.isLive==='Yes'?'red':'green'}; font-weight:bold;">${t.isLive || 'No'}</td>
                <td>${t.marks || t.totalMarks || 100}</td>
                <td>${t.totalQs || '-'}</td>
                <td>${t.hasNegative === 'Yes' || t.hasNeg === 'Yes' ? (t.negativeMark || t.negMark) : 'No'}</td>
                <td><button class="btn-delete" onclick="deleteTest('${d.id}')">Delete</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error("Tests load error:", e); }
};

window.saveTest = async function() {
    const testId = document.getElementById('tId').value.trim();
    const testName = document.getElementById('tName').value.trim();
    if (!testId || !testName) { alert("Test ID and Name are required!"); return; }

    const testData = {
        testId,
        mainCat: document.getElementById('tMain').value,
        subCat: document.getElementById('tSub').value,
        examName: document.getElementById('tExam').value,
        testName,
        duration: Number(document.getElementById('tDur').value || 60),
        marks: Number(document.getElementById('tMarks').value || 100),
        totalMarks: Number(document.getElementById('tMarks').value || 100),
        totalQs: Number(document.getElementById('tTotalQs').value || 100),
        language: document.getElementById('tLanguage').value,
        hasNegative: document.getElementById('tHasNeg').value,
        negativeMark: Number(document.getElementById('tNegMark').value || 0),
        isFree: document.getElementById('tFree').value,
        isLive: document.getElementById('tIsLive').value,
        liveStart: document.getElementById('tLiveStart') ? document.getElementById('tLiveStart').value : "",
        liveEnd: document.getElementById('tLiveEnd') ? document.getElementById('tLiveEnd').value : "",
        liveReleaseTime: document.getElementById('tLiveEnd') && document.getElementById('tLiveEnd').value ? document.getElementById('tLiveEnd').value : "12:00 AM"
    };

    await addDoc(collection(db, "tests"), testData);
    alert("✅ Test Added Successfully!");
    loadTests();
};

window.deleteTest = async function(id) {
    if (confirm("Delete this test?")) {
        await deleteDoc(doc(db, "tests", id));
        loadTests();
    }
};

// 6. Questions Management
let searchedQuestionsCache = {};

window.searchQuestions = async function() {
    const keyword = document.getElementById('searchTestId').value.trim();
    if (!keyword) { alert("Enter Test ID or Question Unique ID (e.g., RRB001 or RRB001-Q01)"); return; }
    
    let snap = await getDocs(query(collection(db, "questions"), where("testId", "==", keyword)));
    if (snap.empty) {
        snap = await getDocs(query(collection(db, "questions"), where("uniqueId", "==", keyword)));
    }

    document.getElementById('questionListContainer').style.display = 'block';
    document.getElementById('displaySearchTestId').textContent = keyword;
    const tbody = document.querySelector("#questionsTable tbody");
    searchedQuestionsCache = {};
    let html = "";
    snap.forEach(d => {
        const item = d.data();
        const uid = item.uniqueId || (item.testId ? `${item.testId}-Q${d.id.slice(0,4).toUpperCase()}` : d.id.slice(0,6));
        searchedQuestionsCache[d.id] = { id: d.id, ...item, uniqueId: uid };
        html += `<tr>
            <td><b style="color:#4F46E5;">${uid}</b></td>
            <td>${item.questionHindi || item.qHindi || '-'}</td>
            <td>${item.questionEnglish || item.qEnglish || '-'}</td>
            <td>${item.questionMarks || item.marks || 1}</td>
            <td style="white-space:nowrap;">
                <button class="btn-approve" onclick="editQuestion('${d.id}')">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteQuestion('${d.id}')">Delete</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center;">No questions found for ${keyword}</td></tr>`;
};

window.editQuestion = function(docId) {
    const item = searchedQuestionsCache[docId];
    if (!item) return;
    document.getElementById('editQId').value = docId;
    document.getElementById('qTestId').value = item.testId || '';
    document.getElementById('qTextHindi').value = item.questionHindi || item.qHindi || '';
    document.getElementById('qTextEnglish').value = item.questionEnglish || item.qEnglish || '';
    const optH = item.optionsHindi || [];
    const optE = item.optionsEnglish || [];
    document.getElementById('qOptAHindi').value = optH[0] || '';
    document.getElementById('qOptBHindi').value = optH[1] || '';
    document.getElementById('qOptCHindi').value = optH[2] || '';
    document.getElementById('qOptDHindi').value = optH[3] || '';
    document.getElementById('qOptEHindi').value = optH[4] || '';
    document.getElementById('qOptAEnglish').value = optE[0] || '';
    document.getElementById('qOptBEnglish').value = optE[1] || '';
    document.getElementById('qOptCEnglish').value = optE[2] || '';
    document.getElementById('qOptDEnglish').value = optE[3] || '';
    document.getElementById('qOptEEnglish').value = optE[4] || '';
    document.getElementById('qAns').value = item.correctAnswer ?? 0;
    document.getElementById('qMarks').value = item.questionMarks || 1;
    document.getElementById('qNeg').value = item.questionNeg || 0;
    document.getElementById('qExp').value = item.explanation || '';
    const btn = document.getElementById('qBtn');
    if (btn) {
        btn.textContent = "✅ Update Question (" + (item.uniqueId || docId.slice(0,6)) + ")";
        btn.style.background = "#10B981";
    }
    document.getElementById('qTestId').scrollIntoView({ behavior: 'smooth' });
};

window.saveQuestion = async function() {
    const testId = document.getElementById('qTestId').value.trim();
    if (!testId) { alert("Enter Test ID"); return; }
    const editId = document.getElementById('editQId').value.trim();
    const autoUniqueId = `${testId}-Q${Math.floor(1000 + Math.random() * 9000)}`;
    const qData = {
        testId,
        uniqueId: editId && searchedQuestionsCache[editId] ? searchedQuestionsCache[editId].uniqueId : autoUniqueId,
        questionHindi: document.getElementById('qTextHindi').value.trim(),
        questionEnglish: document.getElementById('qTextEnglish').value.trim(),
        optionsHindi: [
            document.getElementById('qOptAHindi').value.trim(),
            document.getElementById('qOptBHindi').value.trim(),
            document.getElementById('qOptCHindi').value.trim(),
            document.getElementById('qOptDHindi').value.trim(),
            document.getElementById('qOptEHindi').value.trim()
        ],
        optionsEnglish: [
            document.getElementById('qOptAEnglish').value.trim(),
            document.getElementById('qOptBEnglish').value.trim(),
            document.getElementById('qOptCEnglish').value.trim(),
            document.getElementById('qOptDEnglish').value.trim(),
            document.getElementById('qOptEEnglish').value.trim()
        ],
        correctAnswer: Number(document.getElementById('qAns').value),
        questionMarks: Number(document.getElementById('qMarks').value || 1),
        questionNeg: Number(document.getElementById('qNeg').value || 0),
        explanation: document.getElementById('qExp').value.trim()
    };
    if (editId) {
        await updateDoc(doc(db, "questions", editId), qData);
        document.getElementById('editQId').value = '';
        const btn = document.getElementById('qBtn');
        if (btn) { btn.textContent = "Add Question"; btn.style.background = ""; }
        alert("✅ Question Updated Successfully!");
        searchQuestions();
    } else {
        await addDoc(collection(db, "questions"), qData);
        alert(`✅ Question Added! Unique ID: ${autoUniqueId}`);
    }
};

window.deleteQuestion = async function(id) {
    if (confirm("Delete question?")) {
        await deleteDoc(doc(db, "questions", id));
        searchQuestions();
    }
};

// 7. Results Management
window.loadResults = async function() {
    try {
        const snap = await getDocs(collection(db, "results"));
        const tbody = document.querySelector("#resultsTable tbody");
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No results yet</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const r = d.data();
            html += `<tr><td>${r.timestamp ? r.timestamp.split('T')[0] : '-'}</td><td>${r.studentName || '-'}</td><td>${r.testName || '-'}</td><td>${r.correctCount || 0}</td><td>${r.wrongCount || 0}</td><td>${r.negDeducted || 0}</td><td><b>${r.finalScore || 0}</b></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error("Results load error:", e); }
};

// 8. Current Affairs Management
window.loadCA = async function() {
    try {
        const snap = await getDocs(collection(db, "current_affairs"));
        const tbody = document.querySelector("#caTable tbody");
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No Current Affairs found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const c = d.data();
            html += `<tr><td>${c.type}</td><td>${c.date}</td><td>${c.title}</td><td>${c.question || '-'}</td><td><button class="btn-delete" onclick="deleteCA('${d.id}')">Delete</button></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error("CA load error:", e); }
};

window.saveCA = async function() {
    const title = document.getElementById('caTitle').value.trim();
    if (!title) { alert("Enter Title"); return; }
    await addDoc(collection(db, "current_affairs"), {
        type: document.getElementById('caType').value,
        date: document.getElementById('caDate').value,
        title,
        link: document.getElementById('caLink').value,
        question: document.getElementById('caQ').value,
        options: [
            document.getElementById('caOptA').value,
            document.getElementById('caOptB').value,
            document.getElementById('caOptC').value,
            document.getElementById('caOptD').value,
            document.getElementById('caOptE').value
        ],
        correctAnswer: Number(document.getElementById('caAns').value),
        explanation: document.getElementById('caExp').value
    });
    alert("✅ Current Affairs Added!");
    loadCA();
};

window.deleteCA = async function(id) {
    if (confirm("Delete item?")) {
        await deleteDoc(doc(db, "current_affairs", id));
        loadCA();
    }
};

// =========================================================================
// 9. ALL CSV TEMPLATE DOWNLOADS (Categories, Tests, Questions, CA)
// =========================================================================

window.downloadCategoriesTemplate = function() {
    const headers = ["mainCat", "subCat", "examName"];
    const rows = [
        ["Railway Exams", "RRB Group D", "Full Length Mock"],
        ["SSC Exams", "SSC CGL", "Tier-1 Practice Set"]
    ];
    triggerCsvDownload("TaiyariGhar_Categories_Template.csv", headers, rows);
};

window.downloadTestsTemplate = function() {
    const headers = ["testId", "mainCat", "subCat", "examName", "testName", "duration", "marks", "totalQs", "language", "hasNegative", "negativeMark", "isFree", "isLive", "liveStart", "liveEnd"];
    const rows = [
        ["RRB001", "Railway Exams", "RRB Group D", "Full Length Mock", "RRB Group D Mock Test 01", "90", "100", "100", "Both", "Yes", "0.33", "Yes", "No", "", ""]
    ];
    triggerCsvDownload("TaiyariGhar_Tests_Template.csv", headers, rows);
};

window.downloadQuestionsTemplate = function() {
    const headers = [
        "testId", "questionHindi", "questionEnglish",
        "optAHindi", "optBHindi", "optCHindi", "optDHindi",
        "optAEnglish", "optBEnglish", "optCEnglish", "optDEnglish",
        "correctAnswer", "questionMarks", "questionNeg", "explanation"
    ];
    const rows = [
        [
            "RRB001",
            "भारत की राजधानी क्या है?",
            "What is the capital of India?",
            "मुंबई", "नई दिल्ली", "कोलकाता", "चेन्नई",
            "Mumbai", "New Delhi", "Kolkata", "Chennai",
            "1", "1", "0.33", "नई दिल्ली भारत की राजधानी है (0=A, 1=B, 2=C, 3=D)"
        ]
    ];
    triggerCsvDownload("TaiyariGhar_Questions_Template.csv", headers, rows);
};

window.downloadCaTemplate = function() {
    const headers = ["type", "date", "title", "link", "question", "optA", "optB", "optC", "optD", "correctAnswer", "explanation"];
    const rows = [
        ["Daily", "2026-11-17", "National Science Update", "https://taiyarighar.in", "ISRO ka naya mission kaun sa hai?", "Gaganyaan", "Aditya L1", "Chandrayaan 4", "Shukrayaan", "0", "0=A, 1=B, 2=C, 3=D"]
    ];
    triggerCsvDownload("TaiyariGhar_CurrentAffairs_Template.csv", headers, rows);
};

// =========================================================================
// 10. ALL BULK CSV UPLOADS (Fast Parallel Batch Uploads)
// =========================================================================

window.uploadCategoriesCsv = function() {
    const file = document.getElementById('categoriesCsvFile').files[0];
    if (!file) { alert("Please select Categories CSV file!"); return; }
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            const promises = results.data.map(row => addDoc(collection(db, "exam_categories"), {
                mainCat: (row.mainCat || "").trim(),
                subCat: (row.subCat || "").trim(),
                examName: (row.examName || "").trim()
            }));
            await Promise.all(promises);
            alert(`✅ ${results.data.length} Categories Uploaded!`);
            loadCategories();
        }
    });
};

window.uploadTestsCsv = function() {
    const file = document.getElementById('testsCsvFile').files[0];
    if (!file) { alert("Select CSV file"); return; }
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            const status = document.getElementById('bulkStatus');
            if (status) status.textContent = "Uploading Tests...";
            const promises = results.data.map(row => addDoc(collection(db, "tests"), {
                testId: (row.testId || "").trim(),
                mainCat: (row.mainCat || "").trim(),
                subCat: (row.subCat || "").trim(),
                examName: (row.examName || "").trim(),
                testName: (row.testName || "").trim(),
                duration: Number(row.duration || 60),
                marks: Number(row.marks || 100),
                totalMarks: Number(row.marks || 100),
                totalQs: Number(row.totalQs || 100),
                language: (row.language || "Both").trim(),
                hasNegative: (row.hasNegative || "No").trim(),
                negativeMark: Number(row.negativeMark || 0),
                isFree: (row.isFree || "Yes").trim(),
                isLive: (row.isLive || "No").trim(),
                liveStart: (row.liveStart || "").trim(),
                liveEnd: (row.liveEnd || "").trim(),
                liveReleaseTime: (row.liveEnd || row.liveReleaseTime || "12:00 AM").trim()
            }));
            await Promise.all(promises);
            if (status) status.textContent = `✅ ${results.data.length} Tests Uploaded Successfully!`;
            alert(`✅ ${results.data.length} Tests Bulk Uploaded!`);
            loadTests();
        }
    });
};

window.uploadQuestionsCsv = function() {
    const file = document.getElementById('questionsCsvFile').files[0];
    if (!file) { alert("Select CSV file"); return; }
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            const status = document.getElementById('bulkStatus');
            if (status) status.textContent = "Uploading Questions...";
            const testCounters = {};
            const promises = results.data.map((row) => {
                const tid = (row.testId || "").trim();
                testCounters[tid] = (testCounters[tid] || 0) + 1;
                const qNumStr = String(testCounters[tid]).padStart(2, '0');
                const autoUid = (row.uniqueId && row.uniqueId.trim()) ? row.uniqueId.trim() : `${tid}-Q${qNumStr}`;

                let ans = String(row.correctAnswer || "0").trim().toUpperCase();
                const mapAns = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4 };
                const correctIdx = mapAns[ans] !== undefined ? mapAns[ans] : Number(ans || 0);

                return addDoc(collection(db, "questions"), {
                    testId: tid,
                    uniqueId: autoUid,
                    questionHindi: (row.questionHindi || "").trim(),
                    questionEnglish: (row.questionEnglish || "").trim(),
                    optionsHindi: [
                        (row.optAHindi || "").trim(),
                        (row.optBHindi || "").trim(),
                        (row.optCHindi || "").trim(),
                        (row.optDHindi || "").trim(),
                        (row.optEHindi || "").trim()
                    ],
                    optionsEnglish: [
                        (row.optAEnglish || "").trim(),
                        (row.optBEnglish || "").trim(),
                        (row.optCEnglish || "").trim(),
                        (row.optDEnglish || "").trim(),
                        (row.optEEnglish || "").trim()
                    ],
                    correctAnswer: correctIdx,
                    questionMarks: Number(row.questionMarks || 1),
                    questionNeg: Number(row.questionNeg || 0),
                    explanation: (row.explanation || "").trim()
                });
            });
            await Promise.all(promises);
            if (status) status.textContent = `✅ ${results.data.length} Questions Uploaded Successfully!`;
            alert(`✅ ${results.data.length} Questions Bulk Uploaded!`);
        }
    });
};

window.uploadCaCsv = function() {
    const file = document.getElementById('caCsvFile').files[0];
    if (!file) { alert("Select CA CSV file"); return; }
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            const status = document.getElementById('bulkStatus');
            if (status) status.textContent = "Uploading Current Affairs...";
            const promises = results.data.map(row => addDoc(collection(db, "current_affairs"), {
                type: (row.type || "Daily").trim(),
                date: (row.date || "").trim(),
                title: (row.title || "").trim(),
                link: (row.link || "").trim(),
                question: (row.question || "").trim(),
                options: [
                    (row.optA || "").trim(),
                    (row.optB || "").trim(),
                    (row.optC || "").trim(),
                    (row.optD || "").trim()
                ],
                correctAnswer: Number(row.correctAnswer || 0),
                explanation: (row.explanation || "").trim()
            }));
            await Promise.all(promises);
            if (status) status.textContent = `✅ ${results.data.length} Current Affairs Uploaded!`;
            alert(`✅ ${results.data.length} Current Affairs Uploaded!`);
            loadCA();
        }
    });
};

// =========================================================================
// 11. EXCEL / CSV DATA EXPORTS (Students, Tests, Results, Questions)
// =========================================================================

window.exportStudents = async function() {
    const snap = await getDocs(collection(db, "students"));
    const rows = [];
    snap.forEach(d => {
        const s = d.data();
        rows.push([s.name || "", s.mobile || "", s.loginId || "", s.email || "", s.isPaid ? "PRO" : "FREE", s.expiryDate || "N/A"]);
    });
    triggerCsvDownload("TaiyariGhar_Students_List.csv", ["Name", "Mobile", "LoginID", "Email", "Status", "ExpiryDate"], rows);
};

window.exportTests = async function() {
    const snap = await getDocs(collection(db, "tests"));
    const rows = [];
    snap.forEach(d => {
        const t = d.data();
        rows.push([t.testId || "", t.mainCat || "", t.subCat || "", t.testName || "", t.duration || "", t.marks || "", t.totalQs || "", t.isLive || "No"]);
    });
    triggerCsvDownload("TaiyariGhar_Tests_List.csv", ["TestID", "MainCategory", "SubCategory", "TestName", "Duration", "Marks", "TotalQs", "IsLive"], rows);
};

window.exportResults = async function() {
    const snap = await getDocs(collection(db, "results"));
    const rows = [];
    snap.forEach(d => {
        const r = d.data();
        rows.push([r.timestamp ? r.timestamp.split('T')[0] : "", r.studentName || "", r.testName || "", r.correctCount || 0, r.wrongCount || 0, r.negDeducted || 0, r.finalScore || 0]);
    });
    triggerCsvDownload("TaiyariGhar_Results_List.csv", ["Date", "StudentName", "TestName", "Correct", "Wrong", "Negative", "FinalScore"], rows);
};

window.downloadTestQuestions = async function() {
    const tid = document.getElementById('searchTestId').value.trim();
    if (!tid) { alert("Pehle Search box mein Test ID dalein!"); return; }
    const q = query(collection(db, "questions"), where("testId", "==", tid));
    const snap = await getDocs(q);
    if (snap.empty) { alert("Is Test ID ke koi questions nahi mile!"); return; }
    const rows = [];
    snap.forEach(d => {
        const item = d.data();
        const optH = item.optionsHindi || [];
        const optE = item.optionsEnglish || [];
        rows.push([
            item.testId, item.questionHindi || "", item.questionEnglish || "",
            optH[0] || "", optH[1] || "", optH[2] || "", optH[3] || "",
            optE[0] || "", optE[1] || "", optE[2] || "", optE[3] || "",
            item.correctAnswer ?? 0, item.questionMarks || 1, item.questionNeg || 0, item.explanation || ""
        ]);
    });
    triggerCsvDownload(`${tid}_Questions_Backup.csv`, [
        "testId", "questionHindi", "questionEnglish",
        "optAHindi", "optBHindi", "optCHindi", "optDHindi",
        "optAEnglish", "optBEnglish", "optCEnglish", "optDEnglish",
        "correctAnswer", "questionMarks", "questionNeg", "explanation"
    ], rows);
};


// =========================================================================
// 8B. JOBS, EXAM SYLLABUS & UPDATES MANAGEMENT
// =========================================================================
window.loadJobUpdates = async function() {
    try {
        const snap = await getDocs(collection(db, "job_updates"));
        const tbody = document.querySelector("#updatesTable tbody");
        if (!tbody) return;
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No Jobs or Syllabus updates published yet</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const u = d.data();
            html += `<tr>
                <td><b>${u.category || 'Latest Job'}</b></td>
                <td>${u.exam || '-'}</td>
                <td>${u.title || '-'}</td>
                <td>${u.date || '-'}</td>
                <td>${u.link ? `<a href="${u.link}" target="_blank">Open Link</a>` : '-'}</td>
                <td><button class="btn-delete" onclick="deleteJobUpdate('${d.id}')">Delete</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error("Job updates load error:", e); }
};

window.saveJobUpdate = async function() {
    const title = document.getElementById('updTitle').value.trim();
    if (!title) { alert("Please enter Title!"); return; }
    await addDoc(collection(db, "job_updates"), {
        category: document.getElementById('updCategory').value,
        exam: document.getElementById('updExam').value.trim(),
        date: document.getElementById('updDate').value.trim(),
        title,
        link: document.getElementById('updLink').value.trim(),
        description: document.getElementById('updDesc').value.trim(),
        createdAt: new Date().toISOString()
    });
    document.getElementById('updTitle').value = '';
    document.getElementById('updLink').value = '';
    document.getElementById('updDesc').value = '';
    alert("✅ Job / Syllabus Update Published!");
    loadJobUpdates();
};

window.deleteJobUpdate = async function(id) {
    if (confirm("Delete this update?")) {
        await deleteDoc(doc(db, "job_updates", id));
        loadJobUpdates();
    }
};

window.downloadUpdatesTemplate = function() {
    const headers = ["category", "exam", "title", "date", "link", "description"];
    const rows = [
        ["Syllabus", "RRB Group D", "RRB Group D 2026 Complete Syllabus & Exam Pattern", "Updated 2026", "https://taiyarighar.in", "General Science 25 Qs, Maths 25 Qs, Reasoning 30 Qs, GA/CA 20 Qs"],
        ["Latest Job", "UP Police", "UP Police Constable New Recruitment Notification", "Last Date: 15 Dec 2026", "https://uppbpb.gov.in", "Complete eligibility, age limit, and selection process details"]
    ];
    triggerCsvDownload("TaiyariGhar_Jobs_Syllabus_Template.csv", headers, rows);
};

window.uploadUpdatesCsv = function() {
    const file = document.getElementById('updatesCsvFile').files[0];
    if (!file) { alert("Select CSV file first!"); return; }
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            const promises = results.data.map(row => addDoc(collection(db, "job_updates"), {
                category: (row.category || "Latest Job").trim(),
                exam: (row.exam || "").trim(),
                title: (row.title || "").trim(),
                date: (row.date || "").trim(),
                link: (row.link || "").trim(),
                description: (row.description || "").trim(),
                createdAt: new Date().toISOString()
            }));
            await Promise.all(promises);
            alert(`✅ ${results.data.length} Updates Uploaded!`);
            loadJobUpdates();
        }
    });
};


const APPS_SCRIPT_MAILER_URL = "https://script.google.com/macros/s/AKfycbxvoU_mH8BjfE7QdC_UOQyzDfmJsUoVcIvq9Kp3VtXutzYTFRFY0vXpzw6Uv2XAjnng5Q/exec";

window.releaseLiveResultsAndSendEmails = async function() {
    if (!confirm("Kya aap sabhi pending Live Tests ke results unlock karke students ko Scorecard & All-India Rank email bhejna chahte hain?")) return;
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'flex';

    try {
        const resSnap = await getDocs(collection(db, "results"));
        const allDocs = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Group results by testId to compute All-India Rank
        const byTest = {};
        allDocs.forEach(r => {
            if (!r.testId) return;
            if (!byTest[r.testId]) byTest[r.testId] = [];
            byTest[r.testId].push(r);
        });

        Object.keys(byTest).forEach(tid => {
            byTest[tid].sort((a, b) => parseFloat(b.finalScore || 0) - parseFloat(a.finalScore || 0));
        });

        let releasedCount = 0;
        for (const r of allDocs) {
            if (r.isLivePending === true || r.emailResultSent === false) {
                const testRankList = byTest[r.testId] || [];
                const rankIndex = testRankList.findIndex(item => item.id === r.id);
                const rank = rankIndex !== -1 ? rankIndex + 1 : 1;
                const totalStudents = testRankList.length || 1;

                // Unlock on Student Dashboard
                await updateDoc(doc(db, "results", r.id), {
                    isLivePending: false,
                    emailResultSent: true,
                    allIndiaRank: rank,
                    totalParticipants: totalStudents
                });

                // Dispatch Email via Google Apps Script if studentEmail is present
                if (r.studentEmail && r.studentEmail.includes("@")) {
                    fetch(APPS_SCRIPT_MAILER_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({
                            action: "send_live_result",
                            email: r.studentEmail,
                            studentName: r.studentName || "Aspirant",
                            loginId: r.loginId || "",
                            testName: r.testName || "All-India Live Exam",
                            finalScore: r.finalScore || "0",
                            totalMarks: r.totalMarks || "100",
                            percent: r.percent || "0",
                            correctCount: r.correctCount || 0,
                            wrongCount: r.wrongCount || 0,
                            negDeducted: r.negDeducted || "0",
                            rank: rank,
                            totalStudents: totalStudents
                        })
                    }).catch(err => console.error("Email send error:", err));
                }
                releasedCount++;
            }
        }

        if (loadingEl) loadingEl.style.display = 'none';
        alert(`✅ ${releasedCount} Live Test Results released & Scorecard emails dispatched!`);
        loadResults();
    } catch (e) {
        if (loadingEl) loadingEl.style.display = 'none';
        alert("❌ Error releasing live results: " + e.message);
    }
};


// =========================================================================
// 12. ADMIN SEARCH, COLLAPSIBLE TABLES, PDF BULK EXPORT & REPORTED QUESTIONS
// =========================================================================
let cachedAdminLists = { students: [], categories: [], tests: [], results: [], ca: [], updates: [], reports: [] };

window.toggleAdminTable = async function(wrapId, btn, loaderFn) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    if (wrap.style.display === 'none') {
        wrap.style.display = 'block';
        if (btn) btn.textContent = '🙈 Hide List';
        if (typeof loaderFn === 'function') await loaderFn();
    } else {
        wrap.style.display = 'none';
        if (btn) btn.textContent = '👁️ Show All';
    }
};

window.filterAdminTable = async function(type) {
    if (type === 'students') {
        const wrap = document.getElementById('studentsTableWrap');
        if (wrap && wrap.style.display === 'none') { wrap.style.display = 'block'; await loadStudents(); }
        const q = (document.getElementById('searchStudentInput')?.value || '').toLowerCase();
        document.querySelectorAll('#studentsTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (type === 'categories') {
        const wrap = document.getElementById('categoriesTableWrap');
        if (wrap && wrap.style.display === 'none') { wrap.style.display = 'block'; await loadCategories(); }
        const q = (document.getElementById('searchCatInput')?.value || '').toLowerCase();
        document.querySelectorAll('#categoriesTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (type === 'tests') {
        const wrap = document.getElementById('testsTableWrap');
        if (wrap && wrap.style.display === 'none') { wrap.style.display = 'block'; await loadTests(); }
        const q = (document.getElementById('searchTestListInput')?.value || '').toLowerCase();
        document.querySelectorAll('#testsTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (type === 'results') {
        const wrap = document.getElementById('resultsTableWrap');
        if (wrap && wrap.style.display === 'none') { wrap.style.display = 'block'; await loadResults(); }
        const q = (document.getElementById('searchResultInput')?.value || '').toLowerCase();
        document.querySelectorAll('#resultsTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (type === 'ca') {
        const wrap = document.getElementById('caTableWrap');
        if (wrap && wrap.style.display === 'none') { wrap.style.display = 'block'; await loadCA(); }
        const q = (document.getElementById('searchCaInput')?.value || '').toLowerCase();
        document.querySelectorAll('#caTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (type === 'updates') {
        const wrap = document.getElementById('updatesTableWrap');
        if (wrap && wrap.style.display === 'none') { wrap.style.display = 'block'; await loadJobUpdates(); }
        const q = (document.getElementById('searchUpdInput')?.value || '').toLowerCase();
        document.querySelectorAll('#updatesTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    } else if (type === 'reports') {
        const q = (document.getElementById('searchReportInput')?.value || '').toLowerCase();
        document.querySelectorAll('#reportsTable tbody tr').forEach(tr => {
            tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
        });
    }
};

window.exportTableToPdf = async function(wrapId, titleText) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    // Ensure data is loaded before printing PDF
    if (wrapId === 'studentsTableWrap' && !document.querySelector('#studentsTable tbody tr')) await loadStudents();
    if (wrapId === 'categoriesTableWrap' && !document.querySelector('#categoriesTable tbody tr')) await loadCategories();
    if (wrapId === 'testsTableWrap' && !document.querySelector('#testsTable tbody tr')) await loadTests();
    if (wrapId === 'resultsTableWrap' && !document.querySelector('#resultsTable tbody tr')) await loadResults();
    if (wrapId === 'caTableWrap' && !document.querySelector('#caTable tbody tr')) await loadCA();
    if (wrapId === 'updatesTableWrap' && !document.querySelector('#updatesTable tbody tr')) await loadJobUpdates();

    const tableClone = wrap.querySelector('table').cloneNode(true);
    // Remove Action column from PDF if present
    tableClone.querySelectorAll('tr').forEach(tr => {
        const cells = tr.children;
        if (cells.length > 0 && (cells[cells.length - 1].innerText.includes('Action') || cells[cells.length - 1].querySelector('button'))) {
            tr.removeChild(cells[cells.length - 1]);
        }
    });

    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${titleText}</title><style>body{font-family:sans-serif;padding:24px;} h2{color:#4F46E5;margin-bottom:12px;} table{width:100%;border-collapse:collapse;font-size:12px;} th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;} th{background:#f1f5f9;}</style></head><body><h2>🏠 TaiyariGhar - ${titleText}</h2><p style="font-size:12px;color:#64748B;">Generated on: ${new Date().toLocaleString('en-IN')}</p>${tableClone.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
};

window.downloadTestQuestionsPdf = async function() {
    const keyword = document.getElementById('searchTestId').value.trim();
    if (!keyword) { alert("Pehle Search box mein Test ID dalein!"); return; }
    let snap = await getDocs(query(collection(db, "questions"), where("testId", "==", keyword)));
    if (snap.empty) {
        snap = await getDocs(query(collection(db, "questions"), where("uniqueId", "==", keyword)));
    }
    if (snap.empty) { alert("Is ID ke koi questions nahi mile!"); return; }

    let html = `<html><head><title>${keyword}_Questions_PDF</title><style>body{font-family:sans-serif;padding:25px;} .q{margin-bottom:18px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;} .uid{font-size:11px;color:#4F46E5;font-weight:bold;} .ans{color:#059669;font-weight:bold;}</style></head><body><h2 style="text-align:center;color:#1E1B4B;">🏠 TaiyariGhar - Question Bank (${keyword})</h2><hr>`;
    let idx = 1;
    snap.forEach(d => {
        const item = d.data();
        const uid = item.uniqueId || `${keyword}-Q${idx}`;
        const optH = item.optionsHindi || [];
        const optE = item.optionsEnglish || [];
        const ansLetter = ['A', 'B', 'C', 'D', 'E'][item.correctAnswer ?? 0] || 'A';
        html += `<div class="q"><div class="uid">Q-ID: ${uid} | Marks: +${item.questionMarks || 1} / -${item.questionNeg || 0}</div>
            <p><b>Q${idx}. ${item.questionHindi || ''}</b><br><span style="color:#475569;">${item.questionEnglish || ''}</span></p>
            <p>A) ${optH[0] || ''} (${optE[0] || ''}) &nbsp;&nbsp; B) ${optH[1] || ''} (${optE[1] || ''})<br>
               C) ${optH[2] || ''} (${optE[2] || ''}) &nbsp;&nbsp; D) ${optH[3] || ''} (${optE[3] || ''})</p>
            <p class="ans">Correct Answer: ${ansLetter}</p>
            ${item.explanation ? `<p style="font-size:12px;color:#1E3A8A;">Explanation: ${item.explanation}</p>` : ''}
        </div>`;
        idx++;
    });
    html += `</body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 450);
};

window.exportCategoriesExcel = async function() {
    const snap = await getDocs(collection(db, "exam_categories"));
    const rows = snap.docs.map(d => { const c = d.data(); return [c.mainCat || "", c.subCat || "", c.examName || ""]; });
    triggerCsvDownload("TaiyariGhar_Categories.csv", ["MainCategory", "SubCategory", "ExamName"], rows);
};

window.exportCaExcel = async function() {
    const snap = await getDocs(collection(db, "current_affairs"));
    const rows = snap.docs.map(d => { const c = d.data(); return [c.type || "", c.date || "", c.title || "", c.question || "", c.explanation || ""]; });
    triggerCsvDownload("TaiyariGhar_Current_Affairs.csv", ["Type", "Date", "Title", "Question", "Explanation"], rows);
};

window.exportUpdatesExcel = async function() {
    const snap = await getDocs(collection(db, "job_updates"));
    const rows = snap.docs.map(d => { const u = d.data(); return [u.category || "", u.exam || "", u.title || "", u.date || "", u.link || "", u.description || ""]; });
    triggerCsvDownload("TaiyariGhar_Jobs_Syllabus.csv", ["Category", "Exam", "Title", "Date", "Link", "Description"], rows);
};

window.cleanDuplicateResults = async function() {
    if (!confirm("Kya aap ek hi student ke ek hi test ke duplicate results delete karke sirf latest result rakhna chahte hain?")) return;
    const snap = await getDocs(collection(db, "results"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    const seen = new Set();
    let delCount = 0;
    for (const r of all) {
        const key = `${r.loginId}_${r.testId}`;
        if (seen.has(key)) {
            await deleteDoc(doc(db, "results", r.id));
            delCount++;
        } else {
            seen.add(key);
        }
    }
    alert(`✅ ${delCount} Duplicate Result rows removed!`);
    loadResults();
};

// Reported Questions Management
window.loadReportedQuestions = async function() {
    const tbody = document.querySelector("#reportsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading reports...</td></tr>`;
    try {
        const snap = await getDocs(collection(db, "reported_questions"));
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No reported questions yet!</td></tr>`;
            return;
        }
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        let html = "";
        items.forEach(r => {
            const hasImg = r.screenshotData && (r.screenshotData.startsWith('data:image') || r.screenshotData.startsWith('http'));
            html += `<tr>
                <td>${r.timestamp ? r.timestamp.split('T')[0] : '-'}</td>
                <td><b style="color:#4F46E5;">${r.uniqueId || '-'}</b><br><span style="font-size:11px;color:#64748B;">Test: ${r.testId || '-'}</span></td>
                <td style="max-width:280px;">
                    <span style="background:#FEF2F2;color:#DC2626;font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;">${r.issueType || 'Issue'}</span>
                    <div style="margin-top:4px;font-size:12.5px;"><b>Galti:</b> ${r.issue || '-'}</div>
                    ${r.suggestedCorrection ? `<div style="margin-top:3px;font-size:12.5px;color:#059669;"><b>Sahi Hoga:</b> ${r.suggestedCorrection}</div>` : ''}
                </td>
                <td>${hasImg ? `<a href="${r.screenshotData}" target="_blank"><img src="${r.screenshotData}" style="max-height:55px;border-radius:4px;border:1px solid #ccc;"></a>` : '-'}</td>
                <td>${r.reportedBy || '-'}</td>
                <td style="font-weight:700;color:${r.status === 'Resolved' ? '#10B981' : '#F59E0B'};">${r.status || 'Pending'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn-approve" onclick="jumpToFixQuestion('${r.uniqueId || r.testId}')">✏️ Fix Q</button>
                    <button style="background:#4F46E5;color:white;border:none;padding:6px 9px;border-radius:5px;cursor:pointer;font-size:11px;" onclick="markReportResolved('${r.id}')">✅ Done</button>
                    <button class="btn-delete" onclick="deleteQuestionReport('${r.id}')">Del</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Error: ${e.message}</td></tr>`;
    }
};

window.jumpToFixQuestion = async function(qUid) {
    if (!qUid) return;
    const qTabBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.innerText.includes('Questions'));
    openTab('tabQuestions', qTabBtn);
    const searchInput = document.getElementById('searchTestId');
    if (searchInput) {
        searchInput.value = qUid;
        await searchQuestions();
        const firstDocId = Object.keys(searchedQuestionsCache)[0];
        if (firstDocId) editQuestion(firstDocId);
    }
};

window.markReportResolved = async function(id) {
    await updateDoc(doc(db, "reported_questions", id), { status: "Resolved" });
    loadReportedQuestions();
};

window.deleteQuestionReport = async function(id) {
    if (confirm("Delete this report?")) {
        await deleteDoc(doc(db, "reported_questions", id));
        loadReportedQuestions();
    }
};

window.exportReportsExcel = async function() {
    const snap = await getDocs(collection(db, "reported_questions"));
    const rows = snap.docs.map(d => {
        const r = d.data();
        return [r.timestamp || "", r.uniqueId || "", r.testId || "", r.issueType || "", r.issue || "", r.suggestedCorrection || "", r.reportedBy || "", r.status || "Pending"];
    });
    triggerCsvDownload("TaiyariGhar_Reported_Questions.csv", ["Date", "UniqueQID", "TestID", "IssueType", "MistakeDescription", "SuggestedCorrection", "ReportedBy", "Status"], rows);
};


// =========================================================================
// 13. OFFICIAL REFERRAL PARTNERS & COUPONS MANAGEMENT
// =========================================================================
let allPartnersCache = [];
let currentPartnerFilterView = "pending";
let partnerRegEnabledState = true;

window.initPartnerAdmin = async function() {
    await loadPartnerRegistrationSetting();
    await loadAllPartnersAdmin();
};

async function loadPartnerRegistrationSetting() {
    try {
        const snap = await getDoc(doc(db, "settings", "partnerProgram"));
        partnerRegEnabledState = snap.exists() ? (snap.data().registrationEnabled !== false) : true;
        const btn = document.getElementById("btnToggleRegistration");
        if (btn) {
            btn.textContent = partnerRegEnabledState ? "ON (Click to Disable)" : "OFF (Click to Enable)";
            btn.style.background = partnerRegEnabledState ? "#10B981" : "#EF4444";
        }
    } catch (e) { console.error("Partner setting load error:", e); }
}

window.togglePartnerRegistrationSetting = async function() {
    const newState = !partnerRegEnabledState;
    await setDoc(doc(db, "settings", "partnerProgram"), { registrationEnabled: newState }, { merge: true });
    await loadPartnerRegistrationSetting();
};

window.loadAllPartnersAdmin = async function() {
    try {
        const snap = await getDocs(collection(db, "partners"));
        allPartnersCache = snap.docs.map(d => ({ docId: d.id, ...d.data() }));

        const pendingCount = allPartnersCache.filter(p => p.status === "pending").length;
        const completedCount = allPartnersCache.filter(p => p.status === "approved" || p.status === "disabled").length;
        const rejectedCount = allPartnersCache.filter(p => p.status === "rejected").length;

        if (document.getElementById("cntPending")) document.getElementById("cntPending").textContent = pendingCount;
        if (document.getElementById("cntCompleted")) document.getElementById("cntCompleted").textContent = completedCount;
        if (document.getElementById("cntRejected")) document.getElementById("cntRejected").textContent = rejectedCount;

        renderPartnerAdminList();
    } catch (e) { console.error("Load partners error:", e); }
};

window.switchPartnerFilter = function(view) {
    currentPartnerFilterView = view;
    renderPartnerAdminList();
};

window.renderPartnerAdminList = function() {
    const container = document.getElementById("partnerAdminList");
    if (!container) return;
    const term = (document.getElementById("adminPartnerSearch")?.value || "").trim().toLowerCase();

    if (term) {
        const matched = allPartnersCache.filter(p =>
            (p.partnerId || "").toLowerCase().includes(term) ||
            (p.couponCode || "").toLowerCase().includes(term) ||
            (p.mobile || "").toLowerCase().includes(term) ||
            (p.name || "").toLowerCase().includes(term)
        );
        if (matched.length === 0) {
            container.innerHTML = `<p style="color:#64748B; font-size:13px;">No partner matched "${term}".</p>`;
            return;
        }
        container.innerHTML = matched.map(renderPartnerCardHtml).join("");
        return;
    }

    if (currentPartnerFilterView === "pending") {
        const list = allPartnersCache.filter(p => p.status === "pending");
        container.innerHTML = list.length
            ? list.map(renderPartnerCardHtml).join("")
            : `<p style="color:#059669; font-size:13px; font-weight:600;">✅ No pending verifications right now.</p>`;
    } else if (currentPartnerFilterView === "rejected") {
        const list = allPartnersCache.filter(p => p.status === "rejected");
        container.innerHTML = list.length
            ? list.map(renderPartnerCardHtml).join("")
            : `<p style="color:#64748B; font-size:13px;">No rejected applications.</p>`;
    } else {
        const verifiedCount = allPartnersCache.filter(p => p.status === "approved" || p.status === "disabled").length;
        container.innerHTML = `<div style="padding:16px; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:10px; font-size:13px; color:#334155;">
            Total Verified Partners: <strong>${verifiedCount}</strong>.<br/>
            All verified partners remain hidden until searched. Enter a <strong>Partner ID (e.g. TGP-1001)</strong>, <strong>Coupon Code</strong>, <strong>Mobile</strong>, or <strong>Name</strong> in the search box above to inspect or manage a partner.
        </div>`;
    }
};

function renderPartnerCardHtml(p) {
    const unpaid = Math.max(0, Number(p.totalCommission || 0) - Number(p.paidCommission || 0)).toFixed(2);
    const nameMatchNote = (p.name || "").trim().toLowerCase() === (p.holderName || "").trim().toLowerCase()
        ? `<span style="color:#059669; font-weight:700;">(Exact Name Match)</span>`
        : `<span style="color:#D97706; font-weight:700;">(Check Name Match!)</span>`;

    return `
      <div style="border:1px solid #CBD5E1; border-radius:10px; padding:15px; margin-bottom:12px; background:#fff; font-size:12.5px;">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <div>
            <strong style="font-size:14.5px; color:#1E1B4B;">${p.name}</strong>
            <span style="background:#EEF2FF; color:#4F46E5; padding:2px 8px; border-radius:5px; font-weight:700; margin-left:6px;">${p.partnerId}</span>
            <span style="background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:5px; font-weight:700; margin-left:4px; text-transform:uppercase;">${p.status}</span>
          </div>
          <div>
            <a href="tel:${p.mobile}" style="margin-right:10px; color:#4F46E5; font-weight:600; text-decoration:none;">📞 Call: ${p.mobile}</a>
            <a href="https://wa.me/91${p.mobile}" target="_blank" style="color:#059669; font-weight:600; text-decoration:none;">💬 WhatsApp</a>
          </div>
        </div>

        <div style="margin-top:8px; display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:6px; background:#F8FAFC; padding:10px; border-radius:8px; border:1px solid #E2E8F0;">
          <div><strong>Gmail:</strong> ${p.email}</div>
          <div><strong>City:</strong> ${p.city}</div>
          <div><strong>Social/Channel:</strong> ${p.socialLink ? `<a href="${p.socialLink}" target="_blank">Open Link</a>` : "Optional / Not Provided"}</div>
          <div><strong>Bank Holder Name:</strong> ${p.holderName} ${nameMatchNote}</div>
          <div><strong>Bank & A/C:</strong> ${p.bankName} | <code>${p.accountNo}</code></div>
          <div><strong>IFSC & UPI:</strong> <code>${p.ifsc}</code> | <code>${p.upiId}</code></div>
        </div>

        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong>Coupon:</strong> <code style="font-size:13.5px; color:#4F46E5; font-weight:700;">${p.couponCode}</code>
            (₹${p.discountAmount} off + ${p.extraDays}d | Uses: ${p.usedCount || 0}/${p.maxUsageLimit} | Comm: ${p.commissionPercent}% | Unpaid: <strong>₹${unpaid}</strong>)
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="btn-approve" onclick="openApprovePartnerModal('${p.docId}')">
              ${p.status === "pending" ? "✅ Verify & Approve" : "✏️ Edit Coupon / Approve"}
            </button>
            <button type="button" class="btn-delete" onclick="rejectPartnerWithReason('${p.docId}')">
              ❌ Reject with Reason
            </button>
            ${p.status === "approved" ? `
              <button type="button" style="background:#475569; color:#fff; border:none; padding:6px 10px; border-radius:5px; cursor:pointer; font-size:11px;" onclick="togglePartnerDisableStatus('${p.docId}', 'disabled')">Disable</button>
              <button type="button" style="background:#0F766E; color:#fff; border:none; padding:6px 10px; border-radius:5px; cursor:pointer; font-size:11px;" onclick="markPartnerPayoutPaid('${p.docId}')">💸 Mark Paid</button>
            ` : ""}
            ${p.status === "disabled" ? `
              <button type="button" style="background:#2563EB; color:#fff; border:none; padding:6px 10px; border-radius:5px; cursor:pointer; font-size:11px;" onclick="togglePartnerDisableStatus('${p.docId}', 'approved')">Re-Enable</button>
            ` : ""}
          </div>
        </div>
        ${p.status === "rejected" && p.rejectionReason ? `<div style="margin-top:6px; color:#DC2626;"><strong>Rejection Reason:</strong> ${p.rejectionReason}</div>` : ""}
      </div>
    `;
}

window.openApprovePartnerModal = function(docId) {
    const p = allPartnersCache.find(item => item.docId === docId);
    if (!p) return;
    document.getElementById("editPartnerDocId").value = docId;
    document.getElementById("modalPartnerSummary").textContent = `${p.name} (${p.partnerId}) — Holder: ${p.holderName} | A/C: ${p.accountNo}`;
    document.getElementById("cfgCouponCode").value = p.couponCode || "";
    document.getElementById("cfgDiscount").value = p.discountAmount ?? 20;
    document.getElementById("cfgExtraDays").value = p.extraDays ?? 15;
    document.getElementById("cfgMaxLimit").value = p.maxUsageLimit ?? 100;
    document.getElementById("cfgCommPct").value = p.commissionPercent ?? 10;
    document.getElementById("approvePartnerModal").style.display = "flex";
};

window.confirmApprovePartner = async function() {
    const docId = document.getElementById("editPartnerDocId").value;
    const newCode = document.getElementById("cfgCouponCode").value.trim().toUpperCase();
    const discountAmount = Number(document.getElementById("cfgDiscount").value || 0);
    const extraDays = Number(document.getElementById("cfgExtraDays").value || 0);
    const maxUsageLimit = Number(document.getElementById("cfgMaxLimit").value || 100);
    const commissionPercent = Number(document.getElementById("cfgCommPct").value || 10);

    if (!newCode) { alert("Coupon code cannot be empty."); return; }

    const duplicate = allPartnersCache.find(p => p.docId !== docId && (p.couponCode || "").toUpperCase() === newCode);
    if (duplicate) {
        alert(`❌ Duplicate Coupon Blocked! Code "${newCode}" is already assigned to ${duplicate.name} (${duplicate.partnerId}).`);
        return;
    }

    const partner = allPartnersCache.find(p => p.docId === docId);
    await updateDoc(doc(db, "partners", docId), {
        status: "approved",
        rejectionReason: "",
        couponCode: newCode,
        discountAmount,
        extraDays,
        maxUsageLimit,
        commissionPercent
    });

    if (partner && partner.status !== "approved") {
        fetch(APPS_SCRIPT_MAILER_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "partner_status",
                email: partner.email,
                name: partner.name,
                status: "approved",
                partnerId: partner.partnerId,
                couponCode: newCode
            })
        }).catch(() => {});
    }

    document.getElementById("approvePartnerModal").style.display = "none";
    alert("✅ Partner verified and activated!");
    await loadAllPartnersAdmin();
};

window.rejectPartnerWithReason = async function(docId) {
    const reason = prompt("Enter Rejection Reason (this will be shown to the partner so they can fix & re-submit):");
    if (reason === null) return;
    if (!reason.trim()) { alert("Rejection reason is required."); return; }

    const partner = allPartnersCache.find(p => p.docId === docId);
    await updateDoc(doc(db, "partners", docId), {
        status: "rejected",
        rejectionReason: reason.trim()
    });

    if (partner) {
        fetch(APPS_SCRIPT_MAILER_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "partner_status",
                email: partner.email,
                name: partner.name,
                status: "rejected",
                partnerId: partner.partnerId,
                reason: reason.trim()
            })
        }).catch(() => {});
    }

    alert("Application rejected with reason.");
    await loadAllPartnersAdmin();
};

window.togglePartnerDisableStatus = async function(docId, targetStatus) {
    await updateDoc(doc(db, "partners", docId), { status: targetStatus });
    alert(`Partner status updated to: ${targetStatus.toUpperCase()}`);
    await loadAllPartnersAdmin();
};

window.markPartnerPayoutPaid = async function(docId) {
    const p = allPartnersCache.find(item => item.docId === docId);
    if (!p) return;
    const total = Number(p.totalCommission || 0);
    if (!confirm(`Mark full ₹${total.toFixed(2)} commission as PAID for ${p.name} (${p.partnerId})?`)) return;
    await updateDoc(doc(db, "partners", docId), { paidCommission: total });
    alert("✅ Payout marked as paid!");
    await loadAllPartnersAdmin();
};

window.exportFullPartnersCsv = function() {
    const headers = [
        "PartnerID", "Status", "ApplicantName", "Mobile", "Gmail", "City",
        "SocialLink", "AccountHolderName", "BankName", "AccountNumber",
        "IFSCCode", "UPI_ID", "CouponCode", "DiscountINR", "ExtraDays",
        "UsedCount", "MaxLimit", "CommissionPct", "TotalSales", "TotalCommission", "PaidCommission", "UnpaidBalance"
    ];
    const rows = allPartnersCache.map(p => {
        const unpaid = Math.max(0, Number(p.totalCommission || 0) - Number(p.paidCommission || 0)).toFixed(2);
        return [
            p.partnerId || "", p.status || "", p.name || "", p.mobile || "", p.email || "", p.city || "",
            p.socialLink || "", p.holderName || "", p.bankName || "", p.accountNo || "",
            p.ifsc || "", p.upiId || "", p.couponCode || "", p.discountAmount || 0, p.extraDays || 0,
            p.usedCount || 0, p.maxUsageLimit || 0, p.commissionPercent || 10,
            p.totalSales || 0, p.totalCommission || 0, p.paidCommission || 0, unpaid
        ];
    });
    triggerCsvDownload("TaiyariGhar_All_Partners_Data.csv", headers, rows);
};

window.exportMonthlyPayoutCsv = function() {
    const headers = [
        "PartnerID", "AccountHolderName", "BankName", "AccountNumber",
        "IFSCCode", "UPI_ID", "Mobile", "PayableCommissionINR", "Remarks"
    ];
    const rows = [];
    allPartnersCache.forEach(p => {
        const unpaid = Number(p.totalCommission || 0) - Number(p.paidCommission || 0);
        if (p.status === "approved" && unpaid > 0) {
            rows.push([
                p.partnerId || "", p.holderName || "", p.bankName || "", p.accountNo || "",
                p.ifsc || "", p.upiId || "", p.mobile || "", unpaid.toFixed(2),
                `TaiyariGhar Referral Payout - ${p.partnerId}`
            ]);
        }
    });
    triggerCsvDownload("TaiyariGhar_Monthly_Payout_Sheet.csv", headers, rows);
};
