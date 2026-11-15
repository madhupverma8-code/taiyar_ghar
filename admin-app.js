// Copyright (c) 2026 TaiyariGhar. All Rights Reserved.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    projectId: "taiyarighar"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.checkPass = async function() {
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    const errMsg = document.getElementById('errMsg');

    if(email === "madhupverma8@gmail.com" && (pass === "admin123" || pass === "123456" || pass.length >= 4)) {
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadSettings();
        loadStudents();
        loadCategories();
        loadTests();
        loadResults();
        loadCA();
    } else {
        errMsg.style.display = 'block';
    }
};

window.logoutAdmin = function() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('lockScreen').style.display = 'flex';
    document.getElementById('adminPass').value = '';
};

window.openTab = function(tabId, btn) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
};

// Load Settings (3-Tier Pricing)
window.loadSettings = async function() {
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        if(docSnap.exists()) {
            const data = docSnap.data();
            if(document.getElementById('plan3Mrp')) document.getElementById('plan3Mrp').value = data.Plan3_MRP || 149;
            if(document.getElementById('plan3Price')) document.getElementById('plan3Price').value = data.Plan3_Price || 99;
            if(document.getElementById('plan6Mrp')) document.getElementById('plan6Mrp').value = data.Plan6_MRP || 249;
            if(document.getElementById('plan6Price')) document.getElementById('plan6Price').value = data.Plan6_Price || 199;
            if(document.getElementById('plan12Mrp')) document.getElementById('plan12Mrp').value = data.Plan12_MRP || 399;
            if(document.getElementById('plan12Price')) document.getElementById('plan12Price').value = data.Plan12_Price || 249;
            if(document.getElementById('setUpi')) document.getElementById('setUpi').value = data.UPI_ID || "taiyarighar@ptye";
            if(document.getElementById('setMobile')) document.getElementById('setMobile').value = data.Mobile || "9140281870";
        }
    } catch(e) {
        console.error("Error loading settings:", e);
    }
};

// Save Settings (3-Tier Pricing)
window.saveSettings = async function() {
    try {
        const settingsData = {
            Plan3_MRP: Number(document.getElementById('plan3Mrp').value),
            Plan3_Price: Number(document.getElementById('plan3Price').value),
            Plan6_MRP: Number(document.getElementById('plan6Mrp').value),
            Plan6_Price: Number(document.getElementById('plan6Price').value),
            Plan12_MRP: Number(document.getElementById('plan12Mrp').value),
            Plan12_Price: Number(document.getElementById('plan12Price').value),
            UPI_ID: document.getElementById('setUpi').value.trim(),
            Mobile: document.getElementById('setMobile').value.trim()
        };

        await setDoc(doc(db, "settings", "global"), settingsData, { merge: true });
        const msg = document.getElementById('settingsMsg');
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
    } catch(e) {
        console.error("Error saving settings:", e);
        alert("Failed to save settings: " + e.message);
    }
};

window.loadStudents = async function() {
    try {
        const snap = await getDocs(collection(db, "students"));
        const tbody = document.querySelector("#studentsTable tbody");
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No students found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const s = d.data();
            html += `<tr>
                <td>${s.name || '-'}</td>
                <td>${s.mobile || '-'}</td>
                <td>${s.studentId || '-'}</td>
                <td>${s.email || '-'}</td>
                <td class="${s.isPaid ? 'status-paid' : 'status-free'}">${s.isPaid ? 'PRO' : 'FREE'}</td>
                <td>${s.expiryDate || 'N/A'}</td>
                <td>${s.deviceCount || 1}/2</td>
                <td><button class="btn-approve" onclick="makePro('${d.id}')">Make Pro</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    } catch(e) { console.error("Error loading students:", e); }
};

window.makePro = async function(docId) {
    try {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 365);
        await updateDoc(doc(db, "students", docId), {
            isPaid: true,
            expiryDate: expiry.toISOString().split('T')[0]
        });
        alert("Student upgraded to Pro successfully!");
        loadStudents();
    } catch(e) { alert("Error: " + e.message); }
};

window.loadCategories = async function() {
    try {
        const snap = await getDocs(collection(db, "exam_categories"));
        const tbody = document.querySelector("#categoriesTable tbody");
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No categories found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const c = d.data();
            html += `<tr><td>${c.mainCat}</td><td>${c.subCat}</td><td>${c.examName}</td><td><button class="btn-delete" onclick="deleteCat('${d.id}')">Delete</button></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch(e) { console.error("Error categories:", e); }
};

window.saveCategory = async function() {
    const mainCat = document.getElementById('newMainCat').value.trim();
    const subCat = document.getElementById('newSubCat').value.trim();
    const examName = document.getElementById('newExamName').value.trim();
    if(!mainCat || !subCat || !examName) { alert("Fill all fields"); return; }
    await addDoc(collection(db, "exam_categories"), { mainCat, subCat, examName });
    alert("Category added!");
    loadCategories();
};

window.deleteCat = async function(id) {
    if(confirm("Delete this category?")) {
        await deleteDoc(doc(db, "exam_categories", id));
        loadCategories();
    }
};

window.loadTests = async function() {
    try {
        const snap = await getDocs(collection(db, "tests"));
        const tbody = document.querySelector("#testsTable tbody");
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No tests found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const t = d.data();
            html += `<tr><td>${t.testId}</td><td>${t.mainCat}</td><td>${t.testName}</td><td style="color:${t.isLive==='Yes'?'red':'green'}; font-weight:bold;">${t.isLive || 'No'}</td><td>${t.totalMarks}</td><td>${t.totalQs}</td><td><button class="btn-delete" onclick="deleteTest('${d.id}')">Delete</button></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch(e) { console.error("Error tests:", e); }
};

window.saveTest = async function() {
    const testId = document.getElementById('tId').value.trim();
    const testName = document.getElementById('tName').value.trim();
    if(!testId || !testName) { alert("Fill Test ID and Name"); return; }
    const testData = {
        testId,
        testName,
        mainCat: document.getElementById('tMain').value,
        subCat: document.getElementById('tSub').value,
        examName: document.getElementById('tExam').value,
        duration: Number(document.getElementById('tDur').value),
        totalMarks: Number(document.getElementById('tMarks').value),
        totalQs: Number(document.getElementById('tTotalQs').value),
        language: document.getElementById('tLanguage').value,
        hasNeg: document.getElementById('tHasNeg').value,
        negMark: Number(document.getElementById('tNegMark').value || 0),
        isFree: document.getElementById('tFree').value,
        isLive: document.getElementById('tIsLive').value,
        liveReleaseTime: document.getElementById('tLiveReleaseTime').value.trim()
    };
    await addDoc(collection(db, "tests"), testData);
    alert("Test saved successfully!");
    loadTests();
};

window.deleteTest = async function(id) {
    if(confirm("Delete test?")) {
        await deleteDoc(doc(db, "tests", id));
        loadTests();
    }
};

window.loadResults = async function() {
    try {
        const snap = await getDocs(collection(db, "results"));
        const tbody = document.querySelector("#resultsTable tbody");
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No results found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const r = d.data();
            html += `<tr><td>${r.date || '-'}</td><td>${r.studentName || '-'}</td><td>${r.testName || '-'}</td><td>${r.correct}</td><td>${r.wrong}</td><td><b>${r.score}</b></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch(e) { console.error("Error results:", e); }
};

window.loadCA = async function() {
    try {
        const snap = await getDocs(collection(db, "current_affairs"));
        const tbody = document.querySelector("#caTable tbody");
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No Current Affairs found</td></tr>`;
            return;
        }
        let html = "";
        snap.forEach(d => {
            const c = d.data();
            html += `<tr><td>${c.type}</td><td>${c.date}</td><td>${c.title}</td><td><button class="btn-delete" onclick="deleteCA('${d.id}')">Delete</button></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch(e) { console.error("Error CA:", e); }
};

window.saveCA = async function() {
    const title = document.getElementById('caTitle').value.trim();
    if(!title) { alert("Enter title"); return; }
    await addDoc(collection(db, "current_affairs"), {
        type: document.getElementById('caType').value,
        date: document.getElementById('caDate').value,
        title,
        link: document.getElementById('caLink').value
    });
    alert("Current Affairs added!");
    loadCA();
};

window.deleteCA = async function(id) {
    if(confirm("Delete?")) {
        await deleteDoc(doc(db, "current_affairs", id));
        loadCA();
    }
};
