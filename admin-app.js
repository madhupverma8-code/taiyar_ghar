// Copyright (c) 2026 TaiyariGhar. All Rights Reserved.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    projectId: "taiyarighar"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.verifyAdminLogin = async function() {
    const emailInput = document.getElementById('adminEmailInput');
    const passInput = document.getElementById('adminPassInput');
    
    if (!emailInput || !passInput) return;
    const email = emailInput.value.trim().toLowerCase();
    const pass = passInput.value.trim();

    if(!email || !pass) { 
        alert("Please enter both Admin Email ID and Password"); 
        return; 
    }
    
    if (email === "madhupverma8@gmail.com" && pass.length >= 4) {
        document.getElementById('adminLoginScreen').classList.add('hide');
        document.getElementById('adminDashboard').classList.remove('hide');
        loadSettings();
        loadAdminData();
    } else {
        alert("Incorrect Admin Email ID or Password! (Use madhupverma8@gmail.com)");
    }
};

window.adminLogout = function() {
    document.getElementById('adminDashboard').classList.add('hide');
    document.getElementById('adminLoginScreen').classList.remove('hide');
    document.getElementById('adminPassInput').value = "";
};

window.switchAdminTab = function(tabId, btn) {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hide'));
    document.querySelectorAll('.admin-tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hide');
    if(btn) btn.classList.add('active');
};

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
            if(document.getElementById('supportMobile')) document.getElementById('supportMobile').value = data.Mobile || "9140281870";
            if(document.getElementById('upiId')) document.getElementById('upiId').value = data.UPI_ID || "taiyarighar@ptye";
        }
    } catch(e) {
        console.error("Error loading settings:", e);
    }
};

window.saveSettings = async function() {
    try {
        const settingsData = {
            Plan3_MRP: Number(document.getElementById('plan3Mrp').value),
            Plan3_Price: Number(document.getElementById('plan3Price').value),
            Plan6_MRP: Number(document.getElementById('plan6Mrp').value),
            Plan6_Price: Number(document.getElementById('plan6Price').value),
            Plan12_MRP: Number(document.getElementById('plan12Mrp').value),
            Plan12_Price: Number(document.getElementById('plan12Price').value),
            Mobile: document.getElementById('supportMobile').value.trim(),
            UPI_ID: document.getElementById('upiId').value.trim()
        };

        await setDoc(doc(db, "settings", "global"), settingsData, { merge: true });
        alert("✅ Settings Saved Successfully!");
    } catch(e) {
        console.error("Error saving settings:", e);
        alert("❌ Failed to save settings: " + e.message);
    }
};

window.loadAdminData = async function() {
    try {
        // Load Students
        const studentsSnap = await getDocs(collection(db, "students"));
        const studentsContainer = document.getElementById('adminStudentsListContainer');
        if(studentsContainer) {
            if(studentsSnap.empty) {
                studentsContainer.innerHTML = "<p style='font-size:13px; color:#6B7280;'>No registered students found yet.</p>";
            } else {
                let html = "<ul style='list-style:none; padding:0;'>";
                studentsSnap.forEach(docSnap => {
                    const s = docSnap.data();
                    html += `<li style='background:white; padding:10px; margin-bottom:8px; border-radius:6px; border:1px solid #E5E7EB; font-size:13px;'><b>${s.name || 'User'}</b> (${s.email || s.mobile || 'No contact'}) - Plan: <span style='color:${s.isPaid?'green':'orange'}; font-weight:bold;'>${s.isPaid ? 'PRO' : 'FREE'}</span></li>`;
                });
                html += "</ul>";
                studentsContainer.innerHTML = html;
            }
        }
    } catch(e) {
        console.error("Error loading admin collection data:", e);
    }
};
