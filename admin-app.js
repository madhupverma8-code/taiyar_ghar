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
        if (tabId === 'tabStudents') loadStudents();
        else if (tabId === 'tabTests') loadTests();
        else if (tabId === 'tabResults') loadResults();
        else if (tabId === 'tabCA') loadCA();
        else if (tabId === 'tabUpdates') loadJobUpdates();
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
        tbody.innerHTML = html || `<tr><td colspan="4" style="text-align:center;">No categories found</td></tr>`;
        
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
        liveReleaseTime: document.getElementById('tLiveReleaseTime').value.trim()
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
window.searchQuestions = async function() {
    const tid = document.getElementById('searchTestId').value.trim();
    if (!tid) { alert("Enter Test ID"); return; }
    const q = query(collection(db, "questions"), where("testId", "==", tid));
    const snap = await getDocs(q);
    document.getElementById('questionListContainer').style.display = 'block';
    document.getElementById('displaySearchTestId').textContent = tid;
    const tbody = document.querySelector("#questionsTable tbody");
    let html = "";
    snap.forEach(d => {
        const item = d.data();
        html += `<tr><td>${item.uniqueId || d.id.slice(0,6)}</td><td>${item.questionHindi || item.qHindi || '-'}</td><td>${item.questionEnglish || item.qEnglish || '-'}</td><td>${item.questionMarks || item.marks || 1}</td><td><button class="btn-delete" onclick="deleteQuestion('${d.id}')">Delete</button></td></tr>`;
    });
    tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center;">No questions found for ${tid}</td></tr>`;
};

window.saveQuestion = async function() {
    const testId = document.getElementById('qTestId').value.trim();
    if (!testId) { alert("Enter Test ID"); return; }
    const qData = {
        testId,
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
    await addDoc(collection(db, "questions"), qData);
    alert("✅ Question Added!");
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
    const headers = ["testId", "mainCat", "subCat", "examName", "testName", "duration", "marks", "totalQs", "language", "hasNegative", "negativeMark", "isFree", "isLive", "liveReleaseTime"];
    const rows = [
        ["RRB001", "Railway Exams", "RRB Group D", "Full Length Mock", "RRB Group D Mock Test 01", "90", "100", "100", "Both", "Yes", "0.33", "Yes", "No", "12:00 AM"]
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
                liveReleaseTime: (row.liveReleaseTime || "12:00 AM").trim()
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
            const promises = results.data.map(row => {
                // Convert letter A/B/C/D or number 0/1/2/3 cleanly
                let ans = String(row.correctAnswer || "0").trim().toUpperCase();
                const mapAns = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4 };
                const correctIdx = mapAns[ans] !== undefined ? mapAns[ans] : Number(ans || 0);

                return addDoc(collection(db, "questions"), {
                    testId: (row.testId || "").trim(),
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
