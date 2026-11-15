import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, writeBatch, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD98AuZs7e-Z66aLIZyanQ6o-QRztWts_U", 
    authDomain: "taiyarighar.firebaseapp.com",
    projectId: "taiyarighar",
    storageBucket: "taiyarighar.firebasestorage.app",
    messagingSenderId: "329150812714",
    appId: "1:329150812714:web:1f292d05aaba0cb918e953"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 
let allExamCategories = [];
let currentSearchedQs = [];

window.checkPass = function() {
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    if(!email || !pass) return alert("Enter Email and Password!");
    showLoading(true);
    signInWithEmailAndPassword(auth, email, pass).then(() => showLoading(false)).catch((error) => {
        showLoading(false);
        alert("Error: " + error.code + "\nMessage: " + error.message);
        document.getElementById('errMsg').style.display = 'block';
        setTimeout(() => document.getElementById('errMsg').style.display = 'none', 3000);
    });
}

window.logoutAdmin = function() { signOut(auth).then(() => location.reload()); }

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadAllData();
    } else {
        document.getElementById('lockScreen').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
    }
});

window.openTab = function(tabId, btn) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active'); btn.classList.add('active');
}

function showLoading(show) { document.getElementById('loading').style.display = show ? 'flex' : 'none'; }
function loadAllData() { loadSettings(); loadStudents(); loadPayments(); loadCategories(); loadTests(); loadResults(); loadCA(); }

// ===== SETTINGS & FUTURE GST CONFIGURATION =====
window.toggleGstInput = function() {
    const gstEnabled = document.getElementById('setGstEnabled').value;
    document.getElementById('gstNumberBox').style.display = gstEnabled === 'Yes' ? 'block' : 'none';
}

async function loadSettings() {
    const docSnap = await getDoc(doc(db, "settings", "global"));
    if(docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('setPrice').value = data.Price || "99";
        document.getElementById('setValidity').value = data.ValidityDays || "365";
        document.getElementById('setOffer').value = data.OfferText || "";
        document.getElementById('setGstEnabled').value = data.GST_Enabled || "No";
        document.getElementById('setGstNumber').value = data.GST_Number || "";
        toggleGstInput();
    }
}

window.saveSettings = async function() {
    const gstEnabled = document.getElementById('setGstEnabled').value;
    const gstNumber = document.getElementById('setGstNumber').value.trim().toUpperCase();

    if (gstEnabled === "Yes" && !gstNumber) {
        return alert("Please enter your Company GSTIN Number or select 'No' for GST!");
    }

    await setDoc(doc(db, "settings", "global"), {
        Price: document.getElementById('setPrice').value.trim() || "99",
        ValidityDays: document.getElementById('setValidity').value.trim() || "365",
        OfferText: document.getElementById('setOffer').value.trim(),
        GST_Enabled: gstEnabled,
        GST_Number: gstNumber
    }, { merge: true });

    document.getElementById('settingsMsg').style.display = 'block'; 
    setTimeout(() => document.getElementById('settingsMsg').style.display = 'none', 3000);
}

// ===== STUDENTS =====
async function loadStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    const snap = await getDocs(collection(db, "students"));
    let html = "";
    snap.forEach(d => {
        const data = d.data();
        const status = data.isPaid ? '<span class="status-paid">PAID</span>' : '<span class="status-free">FREE</span>';
        let actionBtn = data.isPaid ? `<button class="btn-unpaid" onclick="togglePayment('${d.id}', false)">Mark Unpaid</button>` : `<button class="btn-approve" onclick="togglePayment('${d.id}', true)">Approve</button>`;
        
        let d1 = data.device1 ? `<span style="font-size:11px; color:var(--success);">${data.device1.substring(0,8)}...</span>` : '-';
        let d2 = data.device2 ? `<span style="font-size:11px; color:var(--warning);">${data.device2.substring(0,8)}...</span>` : '-';
        let devices = `${d1} <br> ${d2}`;
        
        let email = data.email || '-';
        let mobile = data.mobile || '-';

        html += `<tr>
            <td>${data.name}</td>
            <td>${email}</td>
            <td>${mobile}</td>
            <td>${data.loginId}</td>
            <td>${data.password}</td>
            <td>${status}</td>
            <td>${data.expiryDate || '-'}</td>
            <td>${devices}</td>
            <td>
                ${actionBtn} <br> 
                <button class="btn-reset" onclick="resetDevices('${d.id}')">Devices</button> <br> 
                <button class="btn-reset-pass" onclick="resetStudentPassword('${d.id}')">Pass Reset</button>
                <button class="btn-delete" onclick="deleteStudent('${d.id}')">Del</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="9" style="text-align:center;">No students found</td></tr>';
}

window.togglePayment = async function(id, makePaid) {
    if(makePaid) {
        let defaultExp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        let expiry = prompt("Enter Expiry Date (YYYY-MM-DD):", defaultExp);
        if(expiry === null) return;
        await updateDoc(doc(db, "students", id), { isPaid: true, expiryDate: expiry }); 
    } else {
        if(!confirm("Mark as Unpaid?")) return;
        await updateDoc(doc(db, "students", id), { isPaid: false, expiryDate: "" }); 
    }
    loadStudents();
}

window.resetDevices = async function(id) {
    if(!confirm("Reset devices?")) return;
    await updateDoc(doc(db, "students", id), { device1: "", device2: "" }); loadStudents(); alert("Devices Reset!");
}

window.resetStudentPassword = async function(id) {
    let newPass = prompt("Enter New Password for the student:");
    if(newPass === null || newPass.trim() === "") return;
    if(!confirm(`Are you sure you want to change password to: ${newPass}?`)) return;
    await updateDoc(doc(db, "students", id), { password: newPass.trim() });
    loadStudents(); alert("Password reset successfully!");
}

window.deleteStudent = async function(id) {
    if(!confirm("Are you sure you want to DELETE this student?")) return;
    await deleteDoc(doc(db, "students", id)); loadStudents();
}

// ===== PAYMENTS & INVOICES =====
async function loadPayments() {
    const tbody = document.querySelector('#paymentsTable tbody');
    if (!tbody) return;
    const snap = await getDocs(collection(db, "payments"));
    let list = [];
    snap.forEach(d => list.push(d.data()));
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = "";
    list.forEach(p => {
        html += `<tr>
            <td>${new Date(p.timestamp).toLocaleDateString()}</td>
            <td style="font-weight:bold; color:var(--primary);">${p.invoiceNumber || '-'}</td>
            <td style="font-size:12px;">${p.paymentId || '-'}</td>
            <td>${p.studentName} (${p.loginId})</td>
            <td style="font-size:12px;">${p.email || '-'}<br>${p.mobile || '-'}</td>
            <td style="font-weight:bold; color:var(--success);">₹${p.amount || 0}</td>
            <td>${p.expiryDate || '-'}</td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;">No payments recorded yet</td></tr>';
}

window.exportPayments = async function() {
    showLoading(true);
    const snap = await getDocs(collection(db, "payments"));
    let dataToExport = [];
    snap.forEach(d => {
        const p = d.data();
        dataToExport.push({
            "Date": new Date(p.timestamp).toLocaleString(),
            "Invoice Number": p.invoiceNumber || "",
            "Razorpay Payment ID": p.paymentId || "",
            "Student Name": p.studentName || "",
            "Login ID": p.loginId || "",
            "Email": p.email || "",
            "Mobile": p.mobile || "",
            "Amount Paid (INR)": p.amount || 0,
            "Valid Till": p.expiryDate || ""
        });
    });
    if(dataToExport.length === 0) { showLoading(false); return alert("No payment records!"); }
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `TaiyariGhar_Payments_${new Date().toISOString().split('T')[0]}.csv`; link.click(); URL.revokeObjectURL(link.href); showLoading(false);
}

// ===== MANAGE CATEGORIES & EXAM TYPES =====
async function loadCategories() {
    const tbody = document.querySelector('#categoriesTable tbody');
    const snap = await getDocs(collection(db, "exam_categories"));
    allExamCategories = [];
    let html = "";
    snap.forEach(d => {
        const data = d.data(); allExamCategories.push(data);
        html += `<tr><td>${data.mainCat}</td><td style="font-weight:bold; color:var(--primary);">${data.subCat}</td><td style="font-weight:bold; color:var(--purple);">${data.examName || '-'}</td>
            <td><button class="btn-edit" onclick="editCategory('${d.id}', '${data.mainCat}', '${data.subCat}', '${data.examName || ''}')">Edit</button><button class="btn-delete" onclick="deleteCategory('${d.id}')">Delete</button></td></tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center;">No categories found</td></tr>';
    populateMainCatDropdown();
}

window.saveCategory = async function() {
    const mainCat = document.getElementById('newMainCat').value.trim(), subCat = document.getElementById('newSubCat').value.trim(), examName = document.getElementById('newExamName').value.trim(), editId = document.getElementById('editCatId').value;
    if(!mainCat || !subCat || !examName) return alert("Please enter all fields!");
    const data = { mainCat, subCat, examName };

    if(editId) {
        await updateDoc(doc(db, "exam_categories", editId), data);
        document.getElementById('editCatId').value = ''; document.getElementById('catBtn').innerText = "Add Category"; document.getElementById('catBtn').style.background = "var(--success)";
    } else {
        const snap = await getDocs(query(collection(db, "exam_categories"), where("mainCat", "==", mainCat), where("subCat", "==", subCat), where("examName", "==", examName)));
        if(!snap.empty) return alert("Already exists!");
        await addDoc(collection(db, "exam_categories"), data);
    }
    document.getElementById('newMainCat').value = ''; document.getElementById('newSubCat').value = ''; document.getElementById('newExamName').value = '';
    loadCategories(); alert("Saved!");
}

window.editCategory = function(id, mainCat, subCat, examName) {
    document.getElementById('editCatId').value = id; document.getElementById('newMainCat').value = mainCat; document.getElementById('newSubCat').value = subCat; document.getElementById('newExamName').value = examName;
    document.getElementById('catBtn').innerText = "Update Category"; document.getElementById('catBtn').style.background = "var(--warning)"; window.scrollTo(0, 0);
}

window.deleteCategory = async function(id) {
    if(!confirm("Delete this Category?")) return;
    await deleteDoc(doc(db, "exam_categories", id)); loadCategories();
}

window.downloadCategoriesTemplate = function() {
    const csv = Papa.unparse([["MainCategory", "SubCategory", "ExamName"], ["Railway Exams", "Group D", "Full Length Mock"]]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "categories_template.csv"; link.click(); URL.revokeObjectURL(link.href);
}

window.uploadCategoriesCsv = function() {
    const file = document.getElementById('categoriesCsvFile').files[0]; if(!file) return alert("Select file!");
    Papa.parse(file, { header: true, skipEmptyLines: true, encoding: "UTF-8", delimiter: ",", complete: async function(res) {
        let count = 0; 
        for (let row of res.data) {
            if(!row.MainCategory || !row.SubCategory || !row.ExamName) continue;
            await addDoc(collection(db, "exam_categories"), { mainCat: row.MainCategory, subCat: row.SubCategory, examName: row.ExamName }); count++;
        }
        alert(`✅ Uploaded ${count} categories!`); loadCategories();
    }});
}

function populateMainCatDropdown() {
    const mainSelect = document.getElementById('tMain'); const currentVal = mainSelect.value;
    mainSelect.innerHTML = '<option value="">Select Main Category</option>';
    const uniqueMainCats = [...new Set(allExamCategories.map(c => c.mainCat))];
    uniqueMainCats.forEach(cat => mainSelect.innerHTML += `<option value="${cat}">${cat}</option>`);
    if(currentVal && uniqueMainCats.includes(currentVal)) mainSelect.value = currentVal;
}

window.updateSubCatDropdown = function() {
    const mainCat = document.getElementById('tMain').value;
    const subSelect = document.getElementById('tSub'); const examSelect = document.getElementById('tExam');
    subSelect.innerHTML = '<option value="">Select Sub Category</option>'; examSelect.innerHTML = '<option value="">Select Exam Name / Type</option>';
    if(!mainCat) return;
    const uniqueSubCats = [...new Set(allExamCategories.filter(c => c.mainCat === mainCat).map(c => c.subCat))];
    uniqueSubCats.forEach(sub => subSelect.innerHTML += `<option value="${sub}">${sub}</option>`);
}

window.updateExamNameDropdown = function() {
    const mainCat = document.getElementById('tMain').value, subCat = document.getElementById('tSub').value;
    const examSelect = document.getElementById('tExam'); examSelect.innerHTML = '<option value="">Select Exam Name / Type</option>';
    if(!mainCat || !subCat) return;
    const uniqueExams = [...new Set(allExamCategories.filter(c => c.mainCat === mainCat && c.subCat === subCat).map(c => c.examName))];
    uniqueExams.forEach(exam => examSelect.innerHTML += `<option value="${exam}">${exam}</option>`);
}

// ===== TESTS & SCHEDULED LIVE EXAMS =====
window.toggleTestNeg = function() { document.getElementById('tNegBox').style.display = document.getElementById('tHasNeg').value === 'Yes' ? 'block' : 'none'; }

window.toggleLiveTestFields = function() {
    const isLive = document.getElementById('tIsLive').value === 'Yes';
    document.getElementById('tFreeBox').style.display = isLive ? 'none' : 'block';
    document.getElementById('liveStartBox').style.display = isLive ? 'block' : 'none';
    document.getElementById('liveEndBox').style.display = isLive ? 'block' : 'none';
    document.getElementById('liveHelpText').style.display = isLive ? 'block' : 'none';
}

async function loadTests() {
    const tbody = document.querySelector('#testsTable tbody');
    const [testsSnap, qSnap] = await Promise.all([ getDocs(collection(db, "tests")), getDocs(collection(db, "questions")) ]);
    const qCount = {}; qSnap.forEach(d => { const tid = d.data().testId; if (tid) qCount[tid] = (qCount[tid] || 0) + 1; });
    let html = "";
    testsSnap.forEach(d => {
        const t = d.data();
        let posDisplay = `+${t.positiveMark || 1}`;
        let negDisplay = t.hasNegative === "Yes" ? `-${t.negativeMark}` : 'No Neg';
        const actualQs = qCount[t.id] !== undefined ? qCount[t.id] : (t.totalQuestions || 0);
        let catDisplay = `${t.mainCat} > ${t.subCat} > ${t.examName || 'N/A'}`;

        let modeBadge = t.isLive === "Yes" 
            ? `<span style="background:#FEE2E2; color:#DC2626; font-weight:700; font-size:11px; padding:3px 7px; border-radius:6px;">🔴 LIVE</span>` 
            : `<span style="background:#EEF2FF; color:#4F46E5; font-weight:600; font-size:11px; padding:3px 7px; border-radius:6px;">Normal</span>`;

        let scheduleOrAccess = t.isLive === "Yes"
            ? `<div style="font-size:11px;"><b>Start:</b> ${t.liveStart ? t.liveStart.replace('T', ' ') : '-'}<br><b>End:</b> ${t.liveEnd ? t.liveEnd.replace('T', ' ') : '-'}</div>`
            : (t.isFree === "Yes" ? '<span style="color:var(--success); font-weight:bold;">FREE</span>' : '<span style="color:var(--primary); font-weight:bold;">PRO ONLY</span>');

        html += `<tr>
            <td><b>${t.id}</b></td>
            <td>${modeBadge}</td>
            <td style="font-size:12px;">${catDisplay}</td>
            <td>${t.testName} <br><span style="font-size:11px; color:#666;">(${actualQs} Qs | ${t.marks} Marks)</span></td>
            <td><b>${posDisplay}</b> / <span style="color:var(--danger);">${negDisplay}</span></td>
            <td>${scheduleOrAccess}</td>
            <td><button class="btn-edit" onclick="editTest('${d.id}')">Edit</button> <button class="btn-delete" onclick="deleteTest('${d.id}')">Del</button></td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center;">No tests found</td></tr>';
}

window.editTest = async function(docId) {
    const docSnap = await getDoc(doc(db, "tests", docId));
    if(docSnap.exists()) {
        const t = docSnap.data();
        document.getElementById('editTestId').value = docId;
        document.getElementById('tId').value = t.id; document.getElementById('tId').disabled = true;
        document.getElementById('tMain').value = t.mainCat; updateSubCatDropdown();
        document.getElementById('tSub').value = t.subCat; updateExamNameDropdown();
        document.getElementById('tExam').value = t.examName || '';
        document.getElementById('tName').value = t.testName; 
        document.getElementById('tDur').value = t.duration; 
        document.getElementById('tMarks').value = t.marks;
        document.getElementById('tTotalQs').value = t.totalQuestions || ""; 
        document.getElementById('tPosMark').value = t.positiveMark || 1;
        document.getElementById('tHasNeg').value = t.hasNegative || "No"; 
        document.getElementById('tNegMark').value = t.negativeMark || "";
        document.getElementById('tFree').value = t.isFree || "Yes"; 
        document.getElementById('tLanguage').value = t.language || "Both"; 
        document.getElementById('tIsLive').value = t.isLive || "No";
        document.getElementById('tLiveStart').value = t.liveStart || "";
        document.getElementById('tLiveEnd').value = t.liveEnd || "";

        toggleTestNeg();
        toggleLiveTestFields();
        document.getElementById('testBtn').innerText = "Update Test"; 
        document.getElementById('testBtn').style.background = "var(--warning)"; 
        window.scrollTo(0,0);
    }
}

window.saveTest = async function() {
    showLoading(true);
    const id = document.getElementById('tId').value.trim(), editId = document.getElementById('editTestId').value;
    if(!id) { showLoading(false); return alert("Test ID required!"); }
    const mainCat = document.getElementById('tMain').value, subCat = document.getElementById('tSub').value, examName = document.getElementById('tExam').value;
    if(!mainCat || !subCat || !examName) { showLoading(false); return alert("Select Category details!"); }

    const isLive = document.getElementById('tIsLive').value;
    const liveStart = document.getElementById('tLiveStart').value;
    const liveEnd = document.getElementById('tLiveEnd').value;

    if (isLive === "Yes" && (!liveStart || !liveEnd)) {
        showLoading(false);
        return alert("Please select both Live Start Time and Live End / Result Time!");
    }

    const data = { 
        id, 
        mainCat, 
        subCat, 
        examName, 
        testName: document.getElementById('tName').value, 
        duration: Number(document.getElementById('tDur').value), 
        marks: Number(document.getElementById('tMarks').value), 
        totalQuestions: Number(document.getElementById('tTotalQs').value) || 0, 
        positiveMark: Number(document.getElementById('tPosMark').value) || 1,
        hasNegative: document.getElementById('tHasNeg').value, 
        negativeMark: Number(document.getElementById('tNegMark').value) || 0, 
        isFree: isLive === "Yes" ? "No" : document.getElementById('tFree').value, 
        language: document.getElementById('tLanguage').value,
        isLive: isLive,
        liveStart: isLive === "Yes" ? liveStart : "",
        liveEnd: isLive === "Yes" ? liveEnd : ""
    };

    if(editId) {
        await updateDoc(doc(db, "tests", editId), data);
        document.getElementById('editTestId').value = ""; document.getElementById('tId').disabled = false; document.getElementById('testBtn').innerText = "Add Test"; document.getElementById('testBtn').style.background = "var(--primary)";
    } else { await setDoc(doc(db, "tests", id), data); }
    
    showLoading(false); 
    ['tId','tName','tDur','tMarks','tTotalQs','tPosMark','tNegMark','tLiveStart','tLiveEnd'].forEach(fid => document.getElementById(fid).value = "");
    document.getElementById('tMain').value = ""; updateSubCatDropdown(); 
    document.getElementById('tHasNeg').value = "No"; 
    document.getElementById('tFree').value = "Yes"; 
    document.getElementById('tLanguage').value = "Both"; 
    document.getElementById('tIsLive').value = "No";
    toggleTestNeg();
    toggleLiveTestFields();
    loadTests(); alert("Test Saved!");
}

window.deleteTest = async function(id) { 
    if(!confirm("Delete this test?")) return; 
    await deleteDoc(doc(db, "tests", id)); loadTests(); 
}

// ===== QUESTIONS SEARCH & EDIT =====
window.searchQuestions = async function() {
    const tId = document.getElementById('searchTestId').value.trim();
    if(!tId) return alert("Please enter a Test ID to search.");
    
    showLoading(true);
    try {
        const q = query(collection(db, "questions"), where("testId", "==", tId));
        const snap = await getDocs(q);
        const tbody = document.querySelector('#questionsTable tbody');
        currentSearchedQs = [];
        let html = "";
        
        if(!snap.empty) {
            snap.forEach(d => {
                const qData = d.data();
                qData.docId = d.id; 
                currentSearchedQs.push(qData);
                let qH = qData.questionHindi || qData.question || "-"; 
                let qE = qData.questionEnglish || "-";
                let uId = qData.uniqueId || d.id; 
                let markText = `+${qData.questionMarks || 1} / -${qData.questionNeg || 0}`;
                
                html += `<tr>
                    <td style="font-weight:bold; color:var(--primary);">${uId}</td>
                    <td>${qH}</td>
                    <td>${qE}</td>
                    <td>${markText}</td>
                    <td>
                        <button class="btn-edit" onclick="editQuestionByDocId('${d.id}')">Edit</button> 
                        <button class="btn-delete" onclick="deleteQuestion('${d.id}')">Del</button>
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html;
            document.getElementById('displaySearchTestId').innerText = tId;
            document.getElementById('questionListContainer').style.display = 'block';
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No questions found for this Test ID.</td></tr>`;
            document.getElementById('displaySearchTestId').innerText = tId;
            document.getElementById('questionListContainer').style.display = 'block';
        }
    } catch (e) { console.error(e); alert("Error: " + e.message); }
    showLoading(false);
}

window.downloadTestQuestions = function() {
    if(currentSearchedQs.length === 0) return alert("Please search for a Test ID first. No questions to download.");
    
    const headers = ["TestID","QuestionHindi","QuestionEnglish","OptionA_Hindi","OptionB_Hindi","OptionC_Hindi","OptionD_Hindi","OptionE_Hindi","OptionA_English","OptionB_English","OptionC_English","OptionD_English","OptionE_English","CorrectAnswer","QuestionMarks","QuestionNegativeMark","Explanation"];
    const ansMap = { 0:'A', 1:'B', 2:'C', 3:'D', 4:'E' };
    
    let dataToExport = currentSearchedQs.map(q => {
        return {
            "TestID": q.testId,
            "QuestionHindi": q.questionHindi || "",
            "QuestionEnglish": q.questionEnglish || "",
            "OptionA_Hindi": q.optionsHindi ? q.optionsHindi[0] : "", "OptionB_Hindi": q.optionsHindi ? q.optionsHindi[1] : "", "OptionC_Hindi": q.optionsHindi ? q.optionsHindi[2] : "", "OptionD_Hindi": q.optionsHindi ? q.optionsHindi[3] : "", "OptionE_Hindi": q.optionsHindi && q.optionsHindi[4] ? q.optionsHindi[4] : "",
            "OptionA_English": q.optionsEnglish ? q.optionsEnglish[0] : "", "OptionB_English": q.optionsEnglish ? q.optionsEnglish[1] : "", "OptionC_English": q.optionsEnglish ? q.optionsEnglish[2] : "", "OptionD_English": q.optionsEnglish ? q.optionsEnglish[3] : "", "OptionE_English": q.optionsEnglish && q.optionsEnglish[4] ? q.optionsEnglish[4] : "",
            "CorrectAnswer": ansMap[q.correctAnswer] || "A",
            "QuestionMarks": q.questionMarks || 1,
            "QuestionNegativeMark": q.questionNeg || 0,
            "Explanation": q.explanation || ""
        };
    });

    const csv = Papa.unparse({ fields: headers, data: dataToExport });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `Questions_${document.getElementById('searchTestId').value.trim()}.csv`; 
    link.click(); URL.revokeObjectURL(link.href);
}

window.editQuestionByDocId = async function(docId) {
    const docSnap = await getDoc(doc(db, "questions", docId));
    if(docSnap.exists()) {
        const q = docSnap.data();
        document.getElementById('editQId').value = docId; document.getElementById('qTestId').value = q.testId; 
        document.getElementById('qTextHindi').value = q.questionHindi || (q.question ? q.question : ""); document.getElementById('qTextEnglish').value = q.questionEnglish || "";
        let oH = q.optionsHindi || q.options || []; let oE = q.optionsEnglish || [];
        document.getElementById('qOptAHindi').value = oH[0] || ""; document.getElementById('qOptAEnglish').value = oE[0] || "";
        document.getElementById('qOptBHindi').value = oH[1] || ""; document.getElementById('qOptBEnglish').value = oE[1] || "";
        document.getElementById('qOptCHindi').value = oH[2] || ""; document.getElementById('qOptCEnglish').value = oE[2] || "";
        document.getElementById('qOptDHindi').value = oH[3] || ""; document.getElementById('qOptDEnglish').value = oE[3] || "";
        document.getElementById('qOptEHindi').value = oH[4] || ""; document.getElementById('qOptEEnglish').value = oE[4] || "";
        document.getElementById('qAns').value = q.correctAnswer; document.getElementById('qMarks').value = q.questionMarks || 1; document.getElementById('qNeg').value = q.questionNeg || 0; document.getElementById('qExp').value = q.explanation || "";
        
        document.getElementById('qBtn').innerText = "Update Question"; document.getElementById('qBtn').style.background = "var(--warning)"; 
        document.getElementById('qTextHindi').focus();
    }
}

window.saveQuestion = async function() {
    showLoading(true);
    const editId = document.getElementById('editQId').value;
    let optsHindi = [document.getElementById('qOptAHindi').value, document.getElementById('qOptBHindi').value, document.getElementById('qOptCHindi').value, document.getElementById('qOptDHindi').value];
    if(document.getElementById('qOptEHindi').value.trim()) optsHindi.push(document.getElementById('qOptEHindi').value);
    let optsEnglish = [document.getElementById('qOptAEnglish').value, document.getElementById('qOptBEnglish').value, document.getElementById('qOptCEnglish').value, document.getElementById('qOptDEnglish').value];
    if(document.getElementById('qOptEEnglish').value.trim()) optsEnglish.push(document.getElementById('qOptEEnglish').value);

    const testId = document.getElementById('qTestId').value;
    const uniqueId = "Q-" + testId + "-" + Math.floor(100000 + Math.random() * 900000);

    const data = { 
        testId: testId, 
        uniqueId: editId ? undefined : uniqueId, 
        questionHindi: document.getElementById('qTextHindi').value, 
        questionEnglish: document.getElementById('qTextEnglish').value, 
        optionsHindi: optsHindi, 
        optionsEnglish: optsEnglish, 
        correctAnswer: Number(document.getElementById('qAns').value), 
        questionMarks: Number(document.getElementById('qMarks').value) || 1, 
        questionNeg: Number(document.getElementById('qNeg').value) || 0, 
        explanation: document.getElementById('qExp').value 
    };
    
    if(editId) delete data.uniqueId;

    if(editId) {
        await updateDoc(doc(db, "questions", editId), data);
        document.getElementById('editQId').value = ""; document.getElementById('qBtn').innerText = "Add Question"; document.getElementById('qBtn').style.background = "var(--primary)";
    } else { await addDoc(collection(db, "questions"), data); }
    
    showLoading(false); 
    ['qTextHindi','qTextEnglish','qOptAHindi','qOptAEnglish','qOptBHindi','qOptBEnglish','qOptCHindi','qOptCEnglish','qOptDHindi','qOptDEnglish','qOptEHindi','qOptEEnglish'].forEach(id => document.getElementById(id).value = "");
    alert("Question Saved!");
    if(document.getElementById('searchTestId').value) searchQuestions();
}

window.deleteQuestion = async function(id) { 
    if(!confirm("Delete?")) return; 
    await deleteDoc(doc(db, "questions", id)); 
    searchQuestions();
}

// ===== RESULTS =====
async function loadResults() {
    const tbody = document.querySelector('#resultsTable tbody');
    const snap = await getDocs(collection(db, "results"));
    let html = "";
    snap.forEach(d => {
        const r = d.data();
        const modeTag = r.isLivePending ? '<span style="color:#DC2626; font-weight:bold; font-size:11px;">LIVE</span>' : 'Normal';
        html += `<tr><td>${new Date(r.timestamp).toLocaleDateString()}</td><td>${r.studentName} (${r.loginId})</td><td>${r.testName}</td><td>${modeTag}</td><td>${r.correctCount || 0}</td><td>${r.wrongCount || 0}</td><td style="color:red;">-${r.negDeducted || 0}</td><td style="font-weight:bold; color:var(--primary);">${r.finalScore || r.score}</td></tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center;">No results found</td></tr>';
}

// ===== CURRENT AFFAIRS =====
async function loadCA() {
    const tbody = document.querySelector('#caTable tbody');
    const snap = await getDocs(collection(db, "current_affairs"));
    let html = "";
    snap.forEach(d => {
        const c = d.data();
        html += `<tr><td>${c.type}</td><td>${c.date}</td><td>${c.title}</td><td>${c.question}</td><td><button class="btn-edit" onclick="editCA('${d.id}')">Edit</button> <button class="btn-delete" onclick="deleteCA('${d.id}')">Del</button></td></tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;">No CA found</td></tr>';
}

window.editCA = async function(docId) {
    const docSnap = await getDoc(doc(db, "current_affairs", docId));
    if(docSnap.exists()) {
        const c = docSnap.data();
        document.getElementById('editCaId').value = docId; document.getElementById('caType').value = c.type; document.getElementById('caDate').value = c.date; document.getElementById('caTitle').value = c.title; document.getElementById('caLink').value = c.link; document.getElementById('caQ').value = c.question;
        document.getElementById('caOptA').value = c.options[0]; document.getElementById('caOptB').value = c.options[1]; document.getElementById('caOptC').value = c.options[2]; document.getElementById('caOptD').value = c.options[3]; document.getElementById('caOptE').value = c.options[4] || ""; document.getElementById('caAns').value = c.correctAnswer; document.getElementById('caExp').value = c.explanation || "";
        document.getElementById('caBtn').innerText = "Update CA"; document.getElementById('caBtn').style.background = "var(--warning)"; window.scrollTo(0,0);
    }
}

window.saveCA = async function() {
    showLoading(true);
    const editId = document.getElementById('editCaId').value;
    let opts = [document.getElementById('caOptA').value, document.getElementById('caOptB').value, document.getElementById('caOptC').value, document.getElementById('caOptD').value];
    if(document.getElementById('caOptE').value.trim()) opts.push(document.getElementById('caOptE').value);
    const data = { type: document.getElementById('caType').value, date: document.getElementById('caDate').value, title: document.getElementById('caTitle').value, link: document.getElementById('caLink').value, question: document.getElementById('caQ').value, options: opts, correctAnswer: Number(document.getElementById('caAns').value), explanation: document.getElementById('caExp').value };

    if(editId) {
        await updateDoc(doc(db, "current_affairs", editId), data);
        document.getElementById('editCaId').value = ""; document.getElementById('caBtn').innerText = "Add Current Affairs"; document.getElementById('caBtn').style.background = "var(--primary)";
    } else { await addDoc(collection(db, "current_affairs"), data); }
    showLoading(false); ['caQ','caOptA','caOptB','caOptC','caOptD','caOptE'].forEach(id => document.getElementById(id).value = ""); loadCA(); alert("CA Saved!");
}

window.deleteCA = async function(id) { if(!confirm("Delete?")) return; await deleteDoc(doc(db, "current_affairs", id)); loadCA(); }

// ===== EXPORT FUNCTIONS =====
window.exportStudents = async function() {
    showLoading(true);
    const snap = await getDocs(collection(db, "students"));
    let dataToExport = [];
    snap.forEach(d => {
        const data = d.data();
        dataToExport.push({ "Name": data.name || "", "Email ID": data.email || "", "Mobile": data.mobile || "", "Login ID": data.loginId || "", "Password": data.password || "", "Status": data.isPaid ? "PAID" : "FREE", "Expiry": data.expiryDate || "" });
    });
    if(dataToExport.length === 0) { showLoading(false); return alert("No data!"); }
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `TaiyariGhar_Students_${new Date().toISOString().split('T')[0]}.csv`; link.click(); URL.revokeObjectURL(link.href); showLoading(false);
}

window.exportTests = async function() {
    showLoading(true);
    const snap = await getDocs(collection(db, "tests"));
    let dataToExport = [];
    snap.forEach(d => {
        const data = d.data();
        dataToExport.push({ "Test ID": data.id || "", "Mode": data.isLive === "Yes" ? "LIVE" : "Normal", "Main Category": data.mainCat || "", "Sub Category": data.subCat || "", "Exam Name": data.examName || "", "Test Name": data.testName || "", "Duration (Mins)": data.duration || "", "Total Marks": data.marks || "", "Positive Mark": data.positiveMark || 1, "Has Negative": data.hasNegative || "No", "Negative Mark": data.negativeMark || 0, "Is Free": data.isFree || "Yes", "Live Start": data.liveStart || "", "Live End": data.liveEnd || "" });
    });
    if(dataToExport.length === 0) { showLoading(false); return alert("No data!"); }
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `TaiyariGhar_Tests_${new Date().toISOString().split('T')[0]}.csv`; link.click(); URL.revokeObjectURL(link.href); showLoading(false);
}

window.exportResults = async function() {
    showLoading(true);
    const snap = await getDocs(collection(db, "results"));
    let dataToExport = [];
    snap.forEach(d => {
        const data = d.data();
        dataToExport.push({ "Date": new Date(data.timestamp).toLocaleString(), "Student Name": data.studentName || "", "Email": data.studentEmail || "", "Login ID": data.loginId || "", "Test Name": data.testName || "", "Mode": data.isLivePending ? "Live Exam" : "Normal", "Correct": data.correctCount || 0, "Wrong": data.wrongCount || 0, "Negative Deducted": data.negDeducted || 0, "Final Score": data.finalScore || 0, "Total Marks": data.totalMarks || 0, "Percentage": data.percent || "0" });
    });
    if(dataToExport.length === 0) { showLoading(false); return alert("No data!"); }
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `TaiyariGhar_Results_${new Date().toISOString().split('T')[0]}.csv`; link.click(); URL.revokeObjectURL(link.href); showLoading(false);
}

// ===== BULK UPLOAD FUNCTIONS =====
function downloadCSV(filename, headers, sampleRow) {
    const csv = Papa.unparse([headers, sampleRow]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

window.downloadTestsTemplate = function() {
    const headers = ["TestID","MainCategory","SubCategory","ExamName","TestName","Duration","TotalMarks","TotalQuestions","PositiveMark","HasNegative","NegativeMark","IsFree","Language","IsLive","LiveStart","LiveEnd"];
    const sample = ["RRB01","Railway Exams","Group D","Full Length Mock","Group D Live Test 1","90","100","100","1","Yes","0.33","No","Both","Yes","2026-11-20T10:00","2026-11-20T23:59"];
    downloadCSV("tests_template.csv", headers, sample);
}

window.downloadQuestionsTemplate = function() {
    const headers = ["TestID","QuestionHindi","QuestionEnglish","OptionA_Hindi","OptionB_Hindi","OptionC_Hindi","OptionD_Hindi","OptionE_Hindi","OptionA_English","OptionB_English","OptionC_English","OptionD_English","OptionE_English","CorrectAnswer","QuestionMarks","QuestionNegativeMark","Explanation"];
    const sample = ["RRB01","भारत की राजधानी क्या है?","What is the capital of India?","मुंबई","दिल्ली","कोलकाता","चेन्नई","","Mumbai","Delhi","Kolkata","Chennai","","B","1","0.33","दिल्ली भारत की राजधानी है।"];
    downloadCSV("questions_template_dual.csv", headers, sample);
}

window.downloadCaTemplate = function() {
    const headers = ["Type","Date","Title","Article_Link","Question","OptionA","OptionB","OptionC","OptionD","OptionE","CorrectAnswer","Explanation"];
    const sample = ["Daily","2026-11-15","India GDP Growth","https://example.com/article","India's GDP growth rate in 2026?","6.5%","7.2%","8.0%","7.8%","","B","India's GDP grew at 7.2%."];
    downloadCSV("current_affairs_template.csv", headers, sample);
}

const statusText = document.getElementById('bulkStatus');

window.uploadTestsCsv = function() {
    const file = document.getElementById('testsCsvFile').files[0]; if(!file) return alert("Select file!");
    statusText.innerText = "Uploading Tests...";
    Papa.parse(file, { header: true, skipEmptyLines: true, encoding: "UTF-8", delimiter: ",", complete: async function(res) {
        let count = 0; const batch = writeBatch(db);
        for (let row of res.data) {
            let tId = row.TestID || row.testId; if(!tId) continue;
            let isLive = String(row.IsLive || "No").trim().toLowerCase() === "yes" ? "Yes" : "No";
            batch.set(doc(db, "tests", tId), { 
                id: tId, 
                mainCat: row.MainCategory || "Other", 
                subCat: row.SubCategory || "General", 
                examName: row.ExamName || "General Test", 
                testName: row.TestName || "Test", 
                duration: Number(row.Duration) || 60, 
                marks: Number(row.TotalMarks) || 100, 
                totalQuestions: Number(row.TotalQuestions) || 0, 
                positiveMark: Number(row.PositiveMark) || 1,
                hasNegative: row.HasNegative || "No", 
                negativeMark: Number(row.NegativeMark) || 0, 
                isFree: isLive === "Yes" ? "No" : (String(row.IsFree).trim().toLowerCase() === "yes" ? "Yes" : "No"), 
                language: row.Language || "Both",
                isLive: isLive,
                liveStart: isLive === "Yes" ? (row.LiveStart || "") : "",
                liveEnd: isLive === "Yes" ? (row.LiveEnd || "") : ""
            }); count++;
        }
        await batch.commit(); statusText.innerText = `✅ Uploaded ${count} tests!`; loadTests();
    }});
}

window.uploadQuestionsCsv = function() {
    const file = document.getElementById('questionsCsvFile').files[0]; if(!file) return alert("Select file!");
    statusText.innerText = "Uploading Questions...";
    Papa.parse(file, { header: true, skipEmptyLines: true, encoding: "UTF-8", delimiter: ",", complete: async function(res) {
        let count = 0; const ansMap = { 'A':0, 'B':1, 'C':2, 'D':3, 'E':4, 'a':0, 'b':1, 'c':2, 'd':3, 'e':4 };
        for (let row of res.data) {
            let tId = row.TestID || row.testId; let qH = row.QuestionHindi || ""; let qE = row.QuestionEnglish || "";
            if(!tId || (!qH && !qE)) continue;
            let optsHindi = [row.OptionA_Hindi || "", row.OptionB_Hindi || "", row.OptionC_Hindi || "", row.OptionD_Hindi || ""]; if(row.OptionE_Hindi) optsHindi.push(row.OptionE_Hindi);
            let optsEnglish = [row.OptionA_English || "", row.OptionB_English || "", row.OptionC_English || "", row.OptionD_English || ""]; if(row.OptionE_English) optsEnglish.push(row.OptionE_English);
            let ansStr = String(row.CorrectAnswer || "A").trim().toUpperCase(); let ansIndex = ansMap[ansStr] !== undefined ? ansMap[ansStr] : 0;
            let uniqueId = "Q-" + tId + "-" + Math.floor(100000 + Math.random() * 900000);
            
            await addDoc(collection(db, "questions"), { testId: tId, uniqueId: uniqueId, questionHindi: qH, questionEnglish: qE, optionsHindi: optsHindi, optionsEnglish: optsEnglish, correctAnswer: ansIndex, questionMarks: Number(row.QuestionMarks) || 1, questionNeg: Number(row.QuestionNegativeMark) || 0, explanation: row.Explanation || "" }); count++;
            if(count % 10 === 0) statusText.innerText = `Uploading: ${count}/${res.data.length}`;
        }
        statusText.innerText = `✅ Uploaded ${count} questions!`;
        if(document.getElementById('searchTestId').value) searchQuestions();
    }});
}

window.uploadCaCsv = function() {
    const file = document.getElementById('caCsvFile').files[0]; if(!file) return alert("Select file!");
    statusText.innerText = "Uploading CA...";
    Papa.parse(file, { header: true, skipEmptyLines: true, encoding: "UTF-8", delimiter: ",", complete: async function(res) {
        let count = 0; const ansMap = { 'A':0, 'B':1, 'C':2, 'D':3, 'E':4, 'a':0, 'b':1, 'c':2, 'd':3, 'e':4 };
        for (let row of res.data) {
            if(!row.Question || !row.Title) continue;
            let opts = [row.OptionA || "", row.OptionB || "", row.OptionC || "", row.OptionD || ""]; if(row.OptionE) opts.push(row.OptionE);
            let ansStr = String(row.CorrectAnswer || "A").trim().toUpperCase(); let ansIndex = ansMap[ansStr] !== undefined ? ansMap[ansStr] : 0;
            await addDoc(collection(db, "current_affairs"), { type: row.Type || "Daily", date: row.Date || "", title: row.Title || "", link: row.Article_Link || "", question: row.Question, options: opts, correctAnswer: ansIndex, explanation: row.Explanation || "" }); count++;
        }
        statusText.innerText = `✅ Uploaded ${count} CA records!`; loadCA();
    }});
}
