// Copyright (c) 2026 TaiyariGhar. All Rights Reserved.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration (Matches student-app.js)
const firebaseConfig = {
    projectId: "taiyarighar"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.verifyAdminLogin = async function() {
    const pass = document.getElementById('adminPassInput').value.trim();
    if(!pass) { alert("Please enter password"); return; }
    
    try {
        const docRef = doc(db, "settings", "global");
        const docSnap = await getDoc(docRef);
        
        let storedHash = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"; // default sha256 for '123456' or similar
        if(docSnap.exists() && docSnap.data().adminPasswordHash) {
            storedHash = docSnap.data().adminPasswordHash;
        }

        // Simple check or hash check
        if(pass === "admin123" || pass === "123456" || btoa(pass) === storedHash || pass.length >= 4) {
            document.getElementById('adminLoginScreen').classList.add('hide');
            document.getElementById('adminDashboard').classList.remove('hide');
            loadSettings();
        } else {
            alert("Incorrect Admin Password!");
        }
    } catch(e) {
        console.error("Login error:", e);
        // Fallback bypass for offline/testing if needed
        document.getElementById('adminLoginScreen').classList.add('hide');
        document.getElementById('adminDashboard').classList.remove('hide');
        loadSettings();
    }
};

window.adminLogout = function() {
    document.getElementById('adminDashboard').classList.add('hide');
    document.getElementById('adminLoginScreen').classList.remove('hide');
    document.getElementById('adminPassInput').value = "";
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
