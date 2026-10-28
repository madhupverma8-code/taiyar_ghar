import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, addDoc, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// API Key
const firebaseConfig = {
    apiKey: "AIzaSyA7x6gQziPYLxrXnyVJJ80mvJkh3VCm24", 
    authDomain: "taiyarighar.firebaseapp.com",
    projectId: "taiyarighar",
    storageBucket: "taiyarighar.firebasestorage.app",
    messagingSenderId: "329150812714",
    appId: "1:329150812714:web:1f292d05aaba0cb918e953"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allTests = [], appSettings = {}, allCA = [], allExamCategories = [];
let userPastResults = {}; 

let currentStudent = { name: "", loginId: "", isPaid: false, expiry: "" };
let isLoggedIn = false;
let isFirstLoginSession = false;
let recommendedTestData = null;
let nav = { mainCat: "", subCat: "", examName: "" };

let testQuestions = [], currentQIndex = 0, userAnswers = {}, markedForReview = {}, visitedQuestions = {};
let timerInterval, timeLeft = 0, totalTime = 0;
let currentTestId = "", currentTestName = "", currentTestMarks = 0, currentTestNegMark = 0, currentTestLanguage = "Both";
let pendingTestDetails = null;
let currentResultData = null;
let currentForgotMethod = 'code';
let currentScreen = 'homeScreen'; 

const defaultMainCategories = [
    { name: "SSC Exams", icon: "🏛️", gradient: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)", subText: "CGL, CHSL, MTS, GD, Stenographer" },
    { name: "Railway Exams", icon: "🚂", gradient: "linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)", subText: "NTPC, Group D, ALP, RPF" },
    { name: "UP State Exams", icon: "🏛️", gradient: "linear-gradient(135deg, #F6D365 0%, #FDA085 100%)", subText: "PCS, RO/ARO, VDO, BEO" },
    { name: "Banking Exams", icon: "🏦", gradient: "linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)", subText: "IBPS PO, Clerk, SBI PO, SO" },
    { name: "UP Police", icon: "👮", gradient: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)", subText: "Constable, SI (Daroga), Home Guard" },
    { name: "Other Central Exams", icon: "🌍", gradient: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)", subText: "IBPS RRB, LIC, Army, Navy" },
    { name: "Other State Exams", icon: "🗺️", gradient: "linear-gradient(135deg, #FA709A 0%, #FEE140 100%)", subText: "BPSC, UKPSC, JPSC, JSSC" }
];

const translations = {
    "en": { "nav_home": "Home", "nav_exams": "All Exams", "nav_ca": "Current Affairs", "nav_login": "Login", "nav_register": "Register", "nav_dash": "Dashboard", "nav_purchase": "My Purchases", "nav_logout": "Logout", "hero_h1": "Crack Your Dream Govt Job with Confidence.", "hero_p": "All-in-one mock test platform for SSC, Railway, Police & All State Exams. Latest syllabus, real-time rankings, and unlimited tests in one subscription.", "sec_cats": "🎯 Exam Categories", "ca_h2": "📰 Current Affairs Hub", "ca_p": "Stay updated with Daily, Weekly, and Monthly Current Affairs.", "btn_explore": "Explore Now", "login_h2": "Login to Your Account", "login_btn": "Login", "login_new": "New user?", "login_reg": "Register Here", "reg_h2": "Create an Account", "reg_btn": "Register Now", "dash_h2": "Crack Your Dream Govt Job with Confidence.", "dash_qv": "📊 Dashboard Quick View", "qv_explore": "Explore Tests", "qv_browse": "Browse all available tests", "qv_view": "View Tests", "qv_rec": "Recommended Next", "qv_loading": "Loading...", "qv_start": "Start Now", "qv_recent": "Recent Performance", "qv_not_att": "Not Attempted Yet", "qv_take": "Take a test to see your score", "btn_back_cat": "← Back", "test_clear": "Clear Response", "test_mark": "⭐ Mark", "test_prev": "← Prev", "test_next": "Save & Next →", "test_palette": "Question Palette", "test_submit": "Submit Test", "res_h2": "Test Result", "res_lb": "🏆 Top 5 Leaderboard", "res_back": "Back to Dashboard", "pay_lock": "🔒 Test Locked", "pay_unlock": "Unlock all tests with a one-time payment of", "pay_upi": "UPI ID:", "pay_wa": "📲 Send Screenshot on WhatsApp", "pay_check": "🔄 Check Status", "pay_close": "Close" },
    "hi": { "nav_home": "होम", "nav_exams": "सभी परीक्षाएं", "nav_ca": "करंट अफेयर्स", "nav_login": "लॉगिन", "nav_register": "रजिस्टर", "nav_dash": "डैशबोर्ड", "nav_purchase": "मेरी खरीदारी", "nav_logout": "लॉगआउट", "hero_h1": "TayariGhar के साथ पाएं अपनी ड्रीम गवर्नमेंट जॉब।", "hero_p": "SSC, रेलवे, पुलिस और सभी राज्य परीक्षाओं के लिए ऑल-इन-वन मॉक टेस्ट प्लेटफॉर्म। नवीनतम सिलेबस, रियल-टाइम रैंकिंग और वन सब्सक्रिप्शन में अनलिमिटेड टेस्ट।", "sec_cats": "🎯 परीक्षा श्रेणियाँ", "ca_h2": "📰 करंट अफेयर्स हब", "ca_p": "दैनिक, साप्ताहिक और मासिक करंट अफेयर्स के साथ अपडेट रहें।", "btn_explore": "अभी देखें", "login_h2": "अपने खाते में लॉगिन करें", "login_btn": "लॉगिन", "login_new": "नए उपयोगकर्ता हैं?", "login_reg": "यहाँ रजिस्टर करें", "reg_h2": "खाता बनाएँ", "reg_btn": "अभी रजिस्टर करें", "dash_h2": "TayariGhar के साथ पाएं अपनी ड्रीम गवर्नमेंट जॉब।", "dash_qv": "📊 डैशबोर्ड त्वरित दृश्य", "qv_explore": "टेस्ट खोजें", "qv_browse": "सभी उपलब्ध टेस्ट ब्राउज़ करें", "qv_view": "टेस्ट देखें", "qv_rec": "अगला सुझाव", "qv_loading": "लोड हो रहा है...", "qv_start": "अभी शुरू करें", "qv_recent": "हालिया प्रदर्शन", "qv_not_att": "अभी तक प्रयास नहीं किया", "qv_take": "अपना स्कोर देखने के लिए टेस्ट दें", "btn_back_cat": "← पीछे जाएँ", "test_clear": "उत्तर साफ़ करें", "test_mark": "⭐ मार्क करें", "test_prev": "← पिछला", "test_next": "सेव और अगला →", "test_palette": "प्रश्न पैलेट", "test_submit": "टेस्ट सबमिट करें", "res_h2": "टेस्ट परिणाम", "res_lb": "🏆 टॉप 5 लीडरबोर्ड", "res_back": "डैशबोर्ड पर वापस जाएँ", "pay_lock": "🔒 टेस्ट लॉक है", "pay_unlock": "एकमुश्त भुगतान के साथ सभी टेस्ट अनलॉक करें", "pay_upi": "UPI आईडी:", "pay_wa": "📲 व्हाट्सएप पर स्क्रीनशॉट भेजें", "pay_check": "🔄 स्थिति जांचें", "pay_close": "बंद करें" }
};

let currentLang = localStorage.getItem('tg_lang') || 'en';

function showScreen(screenId, pushHistory = true) {
    ['homeScreen', 'loginScreen', 'registerScreen', 'forgotPasswordScreen', 'dashboardScreen', 'subCatScreen', 'caScreen', 'instructionsScreen', 'testScreen', 'resultScreen', 'solutionsScreen'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hide');
    });
    
    if (screenId === 'testScreen') {
        document.getElementById('mainHeader').classList.add('hide');
        document.getElementById('mainFooter').classList.add('hide');
    } else {
        document.getElementById('mainHeader').classList.remove('hide');
        document.getElementById('mainFooter').classList.remove('hide');
    }
    
    const target = document.getElementById(screenId);
    if(target) target.classList.remove('hide');
    currentScreen = screenId;
    window.scrollTo(0, 0);

    if (pushHistory && history.state?.screen !== screenId) {
        history.pushState({ screen: screenId }, '', window.location.search);
    }
}

window.onpopstate = function(event) {
    if (event.state && event.state.screen) {
        if (currentScreen === 'testScreen' && event.state.screen !== 'testScreen') {
            if (!confirm("Are you sure you want to leave the test? Your progress will be saved automatically.")) {
                history.pushState({ screen: 'testScreen' }, '', window.location.search);
                return;
            }
            saveProgress();
            clearInterval(timerInterval);
        }
        showScreen(event.state.screen, false);
    } else {
        checkUrlRouting();
    }
};

async function checkUrlRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const catSlug = urlParams.get('category');
    const subCatSlug = urlParams.get('subcat');

    if (catSlug) {
        let targetCat = allTests.map(t => t.mainCat).find(c => c.toLowerCase().replace(/\s+/g, '-') === catSlug);
        if (!targetCat) {
            targetCat = defaultMainCategories.map(c => c.name).find(c => c.toLowerCase().replace(/\s+/g, '-') === catSlug);
        }
        
        if (targetCat) {
            if(!isLoggedIn) {
                sessionStorage.setItem('pendingCat', targetCat);
                showLogin();
            } else {
                openCategory(targetCat, true); 
                if (subCatSlug) {
                    let normalizedMain = targetCat.toLowerCase().replace("exams", "").trim();
                    let targetSub = allTests.map(t => t.subCat).find(sc => 
                        allTests.some(t => t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && t.subCat.toLowerCase().replace(/\s+/g, '-') === subCatSlug)
                    );
                    if(targetSub) {
                         loadTestsForSubCat(targetSub, null, true);
                    }
                }
            }
        }
    } else if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
        goHome();
    }
}

window.addEventListener('scroll', () => {
    const header = document.getElementById('mainHeader');
    if (window.scrollY > 50) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
});

window.toggleLanguage = function() {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    localStorage.setItem('tg_lang', currentLang);
    applyLanguage();
    if(isLoggedIn && currentScreen === 'dashboardScreen') { updateWelcomeMessage(isFirstLoginSession); }
}

function applyLanguage() {
    const btnText = currentLang === 'en' ? 'हिंदी' : 'English';
    if(document.getElementById('langBtn')) document.getElementById('langBtn').innerText = btnText;
    if(document.getElementById('langBtnProfile')) document.getElementById('langBtnProfile').innerText = btnText;
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if(translations[currentLang][key]) {
            if(el.tagName === 'INPUT') { el.placeholder = translations[currentLang][key]; } 
            else { el.innerText = translations[currentLang][key]; }
        }
    });
    const placeholders = { 
        "loginId": currentLang === 'en' ? "Login ID or WhatsApp Number" : "लॉगिन आईडी या व्हाट्सएप नंबर", 
        "loginPass": currentLang === 'en' ? "Password" : "पासवर्ड", 
        "regName": currentLang === 'en' ? "Full Name" : "पूरा नाम", 
        "regMobile": currentLang === 'en' ? "WhatsApp Number (e.g., 9876543210)" : "व्हाट्सएप नंबर (जैसे 9876543210)", 
        "regPass": currentLang === 'en' ? "Create Password" : "पासवर्ड बनाएँ", 
        "regPassConfirm": currentLang === 'en' ? "Confirm Password" : "पासवर्ड की पुष्टि करें" 
    };
    for(let id in placeholders) { if(document.getElementById(id)) document.getElementById(id).placeholder = placeholders[id]; }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
window.installPWA = function() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') console.log('User accepted'); deferredPrompt = null; });
    } else { alert(currentLang === 'en' ? "To install, tap browser menu and select 'Add to Home Screen'." : "इंस्टॉल करने के लिए, ब्राउज़र मेनू से 'Add to Home Screen' चुनें।"); }
}

function getDeviceId() {
    let devId = localStorage.getItem('tg_device_id');
    if(!devId) { devId = 'dev_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('tg_device_id', devId); }
    return devId;
}

window.goHome = function() { 
    window.history.pushState({ screen: 'homeScreen' }, '', window.location.pathname); 
    showScreen('homeScreen', false); 
    updateHeaderUI(); 
}

window.goDashboard = function() { 
    if(!isLoggedIn) return showLogin(); 
    window.history.pushState({ screen: 'dashboardScreen' }, '', window.location.pathname);
    showScreen('dashboardScreen', false); 
    updateHeaderUI(); 
    fetchDashboardData(); 
    updateWelcomeMessage(isFirstLoginSession); 
}

window.showLogin = function() { showScreen('loginScreen'); }
window.showRegister = function() { showScreen('registerScreen'); }
window.showForgotPassword = function() { showScreen('forgotPasswordScreen'); }
window.logout = function() { isLoggedIn = false; currentStudent = {}; localStorage.removeItem('tg_user'); goHome(); }

window.toggleForgotMethod = function(method) {
    currentForgotMethod = method;
    if(method === 'code') {
        document.getElementById('tabCode').classList.add('active');
        document.getElementById('tabSec').classList.remove('active');
        document.getElementById('boxRecoveryCode').classList.remove('hide');
        document.getElementById('boxSecAnswer').classList.add('hide');
    } else {
        document.getElementById('tabCode').classList.remove('active');
        document.getElementById('tabSec').classList.add('active');
        document.getElementById('boxRecoveryCode').classList.add('hide');
        document.getElementById('boxSecAnswer').classList.remove('hide');
    }
}

window.openSupportModal = function() {
    let mobile = (appSettings.Mobile || "9140281870").toString().trim();
    let cleanMobile = mobile.replace(/[^0-9]/g, '');
    if(cleanMobile.length === 10) cleanMobile = "91" + cleanMobile;
    
    let examName = nav.examName ? ` (${nav.mainCat} > ${nav.subCat} > ${nav.examName})` : (nav.mainCat ? ` (${nav.mainCat})` : '');
    
    let qMsg = `Hello Admin, Mujhe ek Question mein problem aa rahi hai.${examName}\nQuestion ID: \n\n⚠️ Maine iska screenshot attach kiya hai, please check karein.`;
    let lMsg = `Hello Admin, Mujhe Login mein problem aa rahi hai. Meri Login ID / Mobile Number hai: \n\n⚠️ Maine iska screenshot attach kiya hai, please check karein.`;
    let pMsg = `Hello Admin, Mera Payment cut ho gaya hai lekin test unlock nahi hua. Meri Login ID hai: \n\n⚠️ Maine iska screenshot attach kiya hai, please check karein.`;

    document.getElementById('waSupportQuestion').href = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(qMsg)}`;
    document.getElementById('waSupportLogin').href = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(lMsg)}`;
    document.getElementById('waSupportPayment').href = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(pMsg)}`;
    
    document.getElementById('supportModal').classList.remove('hide');
}

window.closeSupportModal = function() { document.getElementById('supportModal').classList.add('hide'); }

function updateHeaderUI() {
    if(isLoggedIn) {
        document.getElementById('headerAuth').classList.add('hide');
        document.getElementById('headerProfile').classList.remove('hide');
        document.getElementById('navStudentName').innerText = currentStudent.name.split(' ')[0]; 
    } else {
        document.getElementById('headerAuth').classList.remove('hide');
        document.getElementById('headerProfile').classList.add('hide');
    }
}

function updateWelcomeMessage(isFirst) {
    let firstName = currentStudent.name.split(' ')[0];
    let msgEl = document.getElementById('welcomeMessage');
    if(isFirst) msgEl.innerHTML = currentLang === 'en' ? `🎉 Welcome, ${firstName}! Your journey to a Govt Job starts here.` : `🎉 स्वागत है, ${firstName}! आपकी तैयारी का सफर यहीं से शुरू होता है।`;
    else msgEl.innerHTML = currentLang === 'en' ? `💪 Welcome back, ${firstName}! Consistency is the key to success.` : `💪 वापसी पर स्वागत है, ${firstName}! सफलता उन्हीं को मिलती है जो रोज़ मेहनत करते हैं।`;
}

window.scrollToCategories = function() { 
    if(!isLoggedIn) { alert("Please login first!"); showLogin(); } 
    else if (currentScreen === 'dashboardScreen') {
        document.getElementById('dashCategories').scrollIntoView({behavior: 'smooth'}); 
    } else {
        goDashboard();
        setTimeout(() => {
            document.getElementById('dashCategories').scrollIntoView({behavior: 'smooth'}); 
        }, 500);
    }
}
window.showPurchases = function() { if(!isLoggedIn) return; let status = currentStudent.isPaid ? "Paid (All Access)" : "Free User"; alert(`--- MY PURCHASES ---\n\nPlan: ${status}\nExpiry Date: ${currentStudent.expiry || "N/A"}`); }

window.doLogin = async function() {
    const inputVal = document.getElementById('loginId').value.trim(); 
    const pass = document.getElementById('loginPass').value.trim();
    if(!inputVal || !pass) return alert("Enter Login ID / Mobile and Password!");
    
    try {
        let snapshot = await getDocs(query(collection(db, "students"), where("loginId", "==", inputVal), where("password", "==", pass)));
        if(snapshot.empty) snapshot = await getDocs(query(collection(db, "students"), where("mobile", "==", inputVal), where("password", "==", pass)));
        
        if(!snapshot.empty) {
            const studentDoc = snapshot.docs[0];
            const studentData = studentDoc.data();
            const docRef = doc(db, "students", studentDoc.id);

            let dev1 = studentData.device1 || "", dev2 = studentData.device2 || "", myDev = getDeviceId();
            if(dev1 && dev2 && dev1 !== myDev && dev2 !== myDev) await updateDoc(docRef, { device1: dev2, device2: myDev }); 
            else if(!dev1) await updateDoc(docRef, { device1: myDev });
            else if(!dev2 && dev1 !== myDev) await updateDoc(docRef, { device2: myDev });

            currentStudent = { name: studentData.name, loginId: studentData.loginId, isPaid: studentData.isPaid, expiry: studentData.expiryDate || "" };
            isLoggedIn = true;
            
            let hasLoggedInBefore = localStorage.getItem('tg_has_logged_in');
            if(!hasLoggedInBefore) { isFirstLoginSession = true; localStorage.setItem('tg_has_logged_in', 'true'); } 
            else { isFirstLoginSession = false; }

            localStorage.setItem('tg_user', JSON.stringify(currentStudent));
            await fetchSettingsAndTests();
            
            let pendingCat = sessionStorage.getItem('pendingCat');
            if(pendingCat) {
                sessionStorage.removeItem('pendingCat');
                openCategory(pendingCat);
            } else {
                goDashboard();
            }
        } else { alert("Invalid Login ID / Mobile or Password!"); }
    } catch (e) { console.error(e); alert("Database Error: " + e.message); }
}

window.doRegister = async function() {
    const name = document.getElementById('regName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const passConfirm = document.getElementById('regPassConfirm').value.trim();
    const secQ = document.getElementById('regSecQ').value;
    const secA = document.getElementById('regSecA').value.trim();
    
    if(!name || !mobile || !pass || !passConfirm || !secA) return alert("Fill all fields including Security Answer!");
    if(pass !== passConfirm) return alert("Passwords do not match!");

    try {
        const qCheck = query(collection(db, "students"), where("name", "==", name));
        const qCheck2 = query(collection(db, "students"), where("mobile", "==", mobile));
        const snapCheck = await getDocs(qCheck);
        const snapCheck2 = await getDocs(qCheck2);

        if(!snapCheck.empty || !snapCheck2.empty) return alert("Name or Mobile already registered!");

        const allStudentsSnap = await getDocs(collection(db, "students"));
        const newId = "TG" + String(allStudentsSnap.size + 1).padStart(4, '0');
        const recoveryCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        await addDoc(collection(db, "students"), {
            name: name, mobile: mobile, loginId: newId, password: pass, 
            recoveryCode: recoveryCode, 
            securityQuestion: secQ, securityAnswer: secA.toLowerCase(),
            isPaid: false, expiryDate: "", device1: getDeviceId(), device2: ""
        });

        document.getElementById('newLoginId').innerText = newId;
        document.getElementById('newLoginPass').innerText = pass;
        document.getElementById('newRecoveryCode').innerText = recoveryCode; 
        
        const waMsg = `Hello! I have registered on TaiyariGhar.\n\nName: ${name}\nLogin ID: ${newId}\nPassword: ${pass}\nRecovery Code: ${recoveryCode}\n\nLink: https://taiyarighar.in`;
        document.getElementById('regWhatsappBtn').href = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
        
        document.getElementById('registerSuccessModal').classList.remove('hide');
    } catch (e) { console.error(e); alert("Database Error: " + e.message); }
}

window.closeRegModal = function() {
    document.getElementById('registerSuccessModal').classList.add('hide');
    document.getElementById('regName').value = ''; document.getElementById('regMobile').value = ''; document.getElementById('regPass').value = ''; document.getElementById('regPassConfirm').value = ''; document.getElementById('regSecA').value = '';
    showLogin();
}

window.doResetPassword = async function() {
    const mobile = document.getElementById('forgotMobile').value.trim();
    const newPass = document.getElementById('forgotNewPass').value.trim();
    
    if(!mobile || !newPass) return alert("Please enter Mobile and New Password!");

    try {
        const q = query(collection(db, "students"), where("mobile", "==", mobile));
        const snap = await getDocs(q);

        if(!snap.empty) {
            const studentData = snap.docs[0].data();
            const docRef = doc(db, "students", snap.docs[0].id);
            let isValid = false;

            if (currentForgotMethod === 'code') {
                const code = document.getElementById('forgotCode').value.trim().toUpperCase();
                if(!code) return alert("Enter Recovery Code!");
                if (studentData.recoveryCode === code) isValid = true;
            } else {
                const secAns = document.getElementById('forgotSecAns').value.trim().toLowerCase();
                if(!secAns) return alert("Enter Security Answer!");
                if (studentData.securityAnswer && studentData.securityAnswer.toLowerCase() === secAns) isValid = true;
            }

            if(isValid) {
                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase(); 
                await updateDoc(docRef, { password: newPass, recoveryCode: newCode });
                alert(`✅ Password Reset Successful!\n\nYour NEW Recovery Code is: ${newCode}\nPlease save it safely.`);
                showLogin();
            } else {
                alert("❌ Invalid Recovery Details! Please try again or contact support.");
            }
        } else {
            alert("❌ No account found with this WhatsApp Number!");
        }
    } catch(e) { console.error(e); alert("Error: " + e.message); }
}

async function fetchSettingsAndTests() {
    try {
        const setSnap = await getDoc(doc(db, "settings", "global"));
        if(setSnap.exists()) appSettings = setSnap.data();
        else appSettings = { UPI_ID: "taiyarighar@ptyes", Price: "99", Mobile: "9140281870", OfferText: "" };

        const testSnap = await getDocs(collection(db, "tests"));
        allTests = testSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const catSnap = await getDocs(collection(db, "exam_categories"));
        allExamCategories = catSnap.docs.map(d => d.data());

        renderMainCategories();

        const caSnap = await getDocs(collection(db, "current_affairs"));
        allCA = caSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if(isLoggedIn) {
            const resSnap = await getDocs(query(collection(db, "results"), where("loginId", "==", currentStudent.loginId)));
            userPastResults = {};
            resSnap.forEach(doc => {
                let data = doc.data();
                if(!userPastResults[data.testId] || new Date(data.timestamp) > new Date(userPastResults[data.testId].timestamp)) userPastResults[data.testId] = data;
            });
        }
        
        checkUrlRouting();
        
    } catch (e) { console.log("Data load error", e); }
}

async function fetchDashboardData() {
    try {
        const qRes = query(collection(db, "results"), where("loginId", "==", currentStudent.loginId));
        const resSnap = await getDocs(qRes);
        let lastTest = null, attemptedTestIds = [];

        if(!resSnap.empty) {
            let results = resSnap.docs.map(d => d.data()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            lastTest = results[0];
            attemptedTestIds = results.map(r => r.testId);
        }

        if(lastTest) {
            document.getElementById('recentTestName').innerText = lastTest.testName;
            document.getElementById('recentTestScore').innerText = `Score: ${lastTest.finalScore}/${lastTest.totalMarks} (${lastTest.percent}%)`;
        } else {
            document.getElementById('recentTestName').innerText = "Not Attempted Yet";
            document.getElementById('recentTestScore').innerText = "Take a test to see your score";
        }

        let recTest = allTests.find(t => !attemptedTestIds.includes(t.id));
        if(!recTest && allTests.length > 0) recTest = allTests[0];

        if(recTest) {
            recommendedTestData = recTest;
            document.getElementById('recTestName').innerText = recTest.testName;
            document.getElementById('recTestDetails').innerText = `⏱️ ${recTest.duration} Mins | ${recTest.marks} Marks`;
        } else {
            document.getElementById('recTestName').innerText = "No tests available";
        }
    } catch (e) { console.log("Error fetching dashboard data", e); }
}

window.startRecommendedTest = function() { 
    if(recommendedTestData) showInstructions(recommendedTestData.id, recommendedTestData.testName, recommendedTestData.duration, recommendedTestData.marks, recommendedTestData.negativeMark || 0, recommendedTestData.hasNegative, recommendedTestData.language || 'Both', false);
    else scrollToCategories(); 
}

function renderMainCategories() {
    let finalMainCats = [...defaultMainCategories];
    
    const testMainCats = [...new Set(allTests.map(t => t.mainCat))];
    testMainCats.forEach(catName => {
        let isDuplicate = finalMainCats.some(c => {
            let cName = c.name.toLowerCase().replace("exams", "").trim();
            let tName = catName.toLowerCase().replace("exams", "").trim();
            return cName === tName || cName.includes(tName) || tName.includes(cName);
        });
        if(!isDuplicate) finalMainCats.push({ name: catName, icon: "📚", gradient: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)", subText: "Explore Tests" });
    });

    let gridHtml = "";
    finalMainCats.forEach(cat => {
        let slug = cat.name.toLowerCase().replace(/\s+/g, '-');
        
        // 🔥 FIX: color: #ffffff; lagaya gaya hai taaki text black na dikhe
        gridHtml += `<a href="?category=${slug}" class="cat-card" style="background: ${cat.gradient}; text-decoration: none; color: #ffffff; display: block;" 
                        onclick="event.preventDefault(); openCategory('${cat.name}');">
            <div class="cat-icon">${cat.icon}</div>
            <div class="cat-title" style="color: #ffffff;">${cat.name}</div>
            <div class="cat-sub-text" style="color: #ffffff;">${cat.subText || ''}</div>
        </a>`;
    });

    const finalHtml = `<div class="category-grid">${gridHtml}</div>`;
    document.getElementById('homeCatContainer').innerHTML = finalHtml;
    document.getElementById('dashCatContainer').innerHTML = finalHtml;
}

window.openCategory = function(mainCat, fromUrl = false) {
    if(!isLoggedIn) return showLogin();
    nav.mainCat = mainCat;
    
    let normalizedMain = mainCat.toLowerCase().replace("exams", "").trim();
    let subCats = allExamCategories.filter(c => c.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain).map(c => c.subCat);
    
    const testSubCats = allTests.filter(t => t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain).map(t => t.subCat);
    subCats = [...new Set([...subCats, ...testSubCats])];

    let pillsHtml = "";
    if(subCats.length > 0) subCats.forEach(sc => pillsHtml += `<div class="sub-cat-pill" onclick="loadTestsForSubCat('${sc}', this)">${sc}</div>`);
    else pillsHtml = `<p style="color:#666; font-style:italic;">No sub-categories added yet for this exam.</p>`;

    document.getElementById('subCatTitle').innerText = mainCat + " - Select Exam Type"; 
    document.getElementById('subCatPills').innerHTML = pillsHtml;
    document.getElementById('examNamePills').innerHTML = ""; 
    document.getElementById('testListContainer').innerHTML = ""; 
    
    if(!fromUrl) {
        let slug = mainCat.toLowerCase().replace(/\s+/g, '-');
        window.history.pushState({ screen: 'subCatScreen' }, '', `?category=${slug}`);
    }
    
    showScreen('subCatScreen', false);
}

window.loadTestsForSubCat = function(subCat, pillElement, fromUrl = false) {
    document.querySelectorAll('#subCatPills .sub-cat-pill').forEach(p => p.classList.remove('active'));
    if(pillElement) pillElement.classList.add('active');

    nav.subCat = subCat;
    let normalizedMain = nav.mainCat.toLowerCase().replace("exams", "").trim();
    let normalizedSub = subCat.toLowerCase().trim();

    const filteredTests = allTests.filter(t => t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && t.subCat.toLowerCase().trim() === normalizedSub);

    const uniqueExamNames = [...new Set([
        ...allExamCategories.filter(c => c.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && c.subCat.toLowerCase().trim() === normalizedSub).map(c => c.examName),
        ...filteredTests.map(t => t.examName)
    ])].filter(name => name); 

    const examNameContainer = document.getElementById('examNamePills');
    examNameContainer.innerHTML = ""; 

    if(uniqueExamNames.length > 0) {
        uniqueExamNames.forEach(ename => {
            let icon = '📝';
            let lowerName = ename.toLowerCase();
            if(lowerName.includes('ncert')) icon = '⭐';
            else if(lowerName.includes('current') || lowerName.includes('gk')) icon = '🌍';
            else if(lowerName.includes('mini') || lowerName.includes('speed')) icon = '⚡';
            else if(lowerName.includes('memory')) icon = '📄';
            else if(lowerName.includes('previous') || lowerName.includes('pyp')) icon = '📋';
            else if(lowerName.includes('full')) icon = '✅';
            else if(lowerName.includes('chapter') || lowerName.includes('topic')) icon = '📚';

            examNameContainer.innerHTML += `<div class="exam-name-card" onclick="loadTestsForExamName('${ename}', this)"><div class="e-icon">${icon}</div><div class="e-title">${ename}</div></div>`;
        });
        document.getElementById('testListContainer').innerHTML = `<p style="text-align:center; color:#666; padding:20px;">Select a Test Type above to view tests.</p>`;
    } else {
        renderTestList(filteredTests);
    }
    
    if(!fromUrl) {
        let mainSlug = nav.mainCat.toLowerCase().replace(/\s+/g, '-');
        let subSlug = subCat.toLowerCase().replace(/\s+/g, '-');
        window.history.pushState({ screen: 'subCatScreen' }, '', `?category=${mainSlug}&subcat=${subSlug}`);
    }
}

window.loadTestsForExamName = function(examName, cardElement) {
    document.querySelectorAll('#examNamePills .exam-name-card').forEach(p => p.classList.remove('active'));
    if(cardElement) cardElement.classList.add('active');

    nav.examName = examName;
    let normalizedMain = nav.mainCat.toLowerCase().replace("exams", "").trim();
    let normalizedSub = nav.subCat.toLowerCase().trim();

    const filteredTests = allTests.filter(t => t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && t.subCat.toLowerCase().trim() === normalizedSub && t.examName === examName);
    renderTestList(filteredTests);
}

function renderTestList(filtered) {
    let html = "";
    if(filtered.length === 0) html = `<p style="text-align:center; color:#666; padding:20px;">No tests available right now. Please check back later.</p>`;
    else {
        filtered.forEach(t => {
            let isLocked = (String(t.isFree).trim().toLowerCase() !== "yes" && !currentStudent.isPaid);
            let hasPastResult = userPastResults[t.id] !== undefined;
            let inProgressData = localStorage.getItem('tg_resume_' + t.id);
            let btnHtml = "";

            if(isLocked) btnHtml = `<button class="btn" style="background:#F3F4F6; color:#6B7280; border:1px solid #E5E7EB;" onclick="openPaymentModal()">🔒 Unlock</button>`;
            else {
                if(inProgressData) btnHtml = `<div style="display:flex; gap:10px;"><button class="btn btn-primary" onclick="showInstructions('${t.id}', '${t.testName}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', true)">▶ Resume</button><button class="btn btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="clearResumeData('${t.id}', '${t.examName}')">Clear</button></div>`;
                else btnHtml = `<button class="btn btn-accent" onclick="showInstructions('${t.id}', '${t.testName}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', false)">Start Test</button>`;
                
                if(hasPastResult) btnHtml += `<button class="btn" style="background:#4F46E5; color:white; margin-left:10px;" onclick="viewPastAnalysis('${t.id}')">📊 Analysis</button>`;
            }
            html += `<div class="test-item ${isLocked ? 'locked' : ''}"><div><h3 style="color: var(--primary); margin-bottom: 5px; font-size:16px;">${t.testName}</h3><p style="font-size: 13px; color: #666;">⏱️ ${t.duration} Mins | ${t.marks} Marks | Lang: ${t.language || 'Both'}</p></div><div style="display:flex; align-items:center;">${btnHtml}</div></div>`;
        });
    }
    document.getElementById('testListContainer').innerHTML = html;
}

window.clearResumeData = function(testId, examName) {
    if(confirm("Are you sure? Your progress will be lost.")) {
        localStorage.removeItem('tg_resume_' + testId);
        loadTestsForExamName(nav.examName, document.querySelector('.exam-name-card.active')); 
    }
}

window.goBackToSubCat = function() { history.back(); }

let caStreak = 0, caCorrectCount = 0, caWrongCount = 0;

window.showCurrentAffairs = function() {
    document.getElementById('caLiveScoreCorrect').innerText = "0";
    document.getElementById('caLiveScoreWrong').innerText = "0";
    caCorrectCount = 0; caWrongCount = 0; caStreak = 0;
    filterCA('Daily', document.querySelector('.ca-tab'));
    showScreen('caScreen');
}

window.filterCA = function(type, btn) {
    document.querySelectorAll('.ca-tab').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const container = document.getElementById('caContentContainer');
    container.innerHTML = '';
    
    const filtered = allCA.filter(c => c.type.toLowerCase() === type.toLowerCase());
    if(filtered.length === 0) { container.innerHTML = '<p style="text-align:center;">No current affairs available.</p>'; return; }

    const grouped = {};
    filtered.forEach(c => {
        if(!grouped[c.title]) grouped[c.title] = { date: c.date, link: c.link, questions: [] };
        grouped[c.title].questions.push(c);
    });

    for(let title in grouped) {
        const article = grouped[title];
        let articleHtml = `<div class="ca-article"><h3 style="color:var(--primary); margin-bottom:5px;">${title}</h3><p style="font-size:13px; color:#666; margin-bottom:10px;">📅 ${article.date}</p>`;
        if(type === 'Daily' && article.link) articleHtml += `<a href="${article.link}" target="_blank" class="btn btn-outline" style="padding:6px 12px; font-size:12px;">📄 Read Full Article / PDF</a>`;
        articleHtml += `</div>`;

        let qHtml = '';
        article.questions.forEach((q, idx) => {
            qHtml += `<div class="ca-question" id="caQ_${q.id}"><p style="font-weight:600; margin-bottom:15px;">Q${idx+1}. ${q.question}</p><div class="ca-options">`;
            q.options.forEach((opt, i) => { if(opt && opt.trim() !== "") qHtml += `<label class="ca-option" onclick="checkCAAnswer('${q.id}', ${i}, ${q.correctAnswer}, '${type}', '${q.explanation}')">${String.fromCharCode(65+i)}) ${opt}</label>`; });
            qHtml += `</div><div class="ca-explanation" id="caExp_${q.id}"><b>Explanation:</b> ${q.explanation || 'N/A'}</div></div>`;
        });
        container.innerHTML += articleHtml + qHtml;
    }
}

window.checkCAAnswer = function(qId, selectedIndex, correctIndex, type, explanation) {
    const qDiv = document.getElementById(`caQ_${qId}`);
    if(qDiv.getAttribute('data-answered') === 'true') return;
    qDiv.setAttribute('data-answered', 'true');

    qDiv.querySelectorAll('.ca-option').forEach((opt, i) => {
        opt.style.pointerEvents = 'none'; 
        if(i === correctIndex) opt.classList.add('correct'); 
        if(i === selectedIndex && i !== correctIndex) opt.classList.add('wrong'); 
    });

    if(type === 'Monthly' && explanation) document.getElementById(`caExp_${qId}`).style.display = 'block';

    if(selectedIndex === correctIndex) {
        caCorrectCount++; caStreak = caStreak > 0 ? caStreak + 1 : 1; 
        if(caStreak >= 3) { showPopup('popupSuccess'); caStreak = 0; }
    } else {
        caWrongCount++; caStreak = caStreak < 0 ? caStreak - 1 : -1;
        if(caStreak <= -3) { showPopup('popupWarning'); caStreak = 0; }
    }
    document.getElementById('caLiveScoreCorrect').innerText = caCorrectCount;
    document.getElementById('caLiveScoreWrong').innerText = caWrongCount;
}

function showPopup(id) {
    const popup = document.getElementById(id);
    popup.classList.add('show');
    setTimeout(() => { popup.classList.remove('show'); }, 3000);
}

window.openPaymentModal = function() {
    let upi = (appSettings.UPI_ID || "taiyarighar@ptyes").toString().trim();
    let price = (appSettings.Price || "99").toString().trim();
    let mobile = (appSettings.Mobile || "9140281870").toString().trim();
    let offer = (appSettings.OfferText || "").toString().trim();
    if(!upi.includes("@")) upi = "taiyarighar@ptyes";

    document.getElementById('paymentModal').classList.remove('hide');
    document.getElementById('modalPrice').innerText = price;
    document.getElementById('modalOffer').innerText = offer ? `(${offer})` : "";
    document.getElementById('modalUpi').innerText = upi;

    const upiString = `upi://pay?pa=${upi}&pn=${encodeURIComponent("TaiyariGhar")}&am=${parseFloat(price).toFixed(2)}&cu=INR`;
    document.getElementById("qrcode").innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}" alt="Payment QR" style="width: 180px; height: 180px; border-radius: 10px; border: 2px solid #E5E7EB; padding: 5px; background: white;">`;

    const waMsg = `Hello Sir, I am ${currentStudent.name} (ID: ${currentStudent.loginId}). I have paid Rs.${price}. Please unlock my tests.\n\n⚠️ Screenshot attached.`;
    document.getElementById('whatsappBtn').href = `https://wa.me/91${mobile.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(waMsg)}`;
}

window.closeModal = function() { document.getElementById('paymentModal').classList.add('hide'); }

window.checkPaymentStatus = async function() {
    closeModal();
    try {
        const snap = await getDocs(query(collection(db, "students"), where("loginId", "==", currentStudent.loginId)));
        if(!snap.empty) {
            if(snap.docs[0].data().isPaid) {
                currentStudent.isPaid = true;
                localStorage.setItem('tg_user', JSON.stringify(currentStudent));
                alert("✅ Payment Approved! Tests Unlocked.");
                location.reload();
            } else alert("⏳ Payment not approved yet. Please wait 5 mins.");
        }
    } catch(e) { console.error(e); }
}

window.showInstructions = function(id, name, duration, marks, negMark, hasNeg, lang, isResume = false) {
    pendingTestDetails = { id, name, duration, marks, negMark, hasNeg, lang, isResume };
    
    document.getElementById('instTestName').innerText = name;
    document.getElementById('instDuration').innerText = duration;
    document.getElementById('instDuration2').innerText = duration;
    document.getElementById('instMarks').innerText = marks;
    
    if(hasNeg === "Yes") {
        document.getElementById('instNegRule').innerText = `You will be awarded 1 mark for each correct answer and ${negMark} will be deducted for each wrong answer.`;
        document.getElementById('instNegRule').style.color = "var(--danger)";
    } else {
        document.getElementById('instNegRule').innerText = "There is NO negative marking for wrong answers.";
        document.getElementById('instNegRule').style.color = "var(--accent)";
    }

    if(lang === "Both") document.getElementById('langSelectBox').classList.remove('hide');
    else document.getElementById('langSelectBox').classList.add('hide');
    
    document.getElementById('instCheckbox').checked = false;
    document.getElementById('btnStartActualTest').disabled = true;
    document.getElementById('btnStartActualTest').style.opacity = '0.5';
    document.getElementById('btnStartActualTest').style.cursor = 'not-allowed';

    showScreen('instructionsScreen');
}

window.toggleStartButton = function() {
    const isChecked = document.getElementById('instCheckbox').checked;
    const btn = document.getElementById('btnStartActualTest');
    btn.disabled = !isChecked;
    btn.style.opacity = isChecked ? '1' : '0.5';
    btn.style.cursor = isChecked ? 'pointer' : 'not-allowed';
}

window.startActualTest = function() {
    let selectedLang = pendingTestDetails.lang;
    if(selectedLang === "Both") selectedLang = document.getElementById('instLangSelect').value;
    initTest(pendingTestDetails.id, pendingTestDetails.name, pendingTestDetails.duration, pendingTestDetails.marks, pendingTestDetails.negMark, pendingTestDetails.hasNeg, selectedLang, pendingTestDetails.isResume);
}

async function initTest(testId, testName, duration, marks, negMark, hasNeg, lang, isResume) {
    showScreen('testScreen');
    
    currentTestId = testId; currentTestName = testName; currentTestMarks = marks; 
    currentTestNegMark = hasNeg === "Yes" ? negMark : 0;
    currentTestLanguage = lang;

    document.getElementById('examHeaderName').innerText = testName;
    document.getElementById('markPositive').innerText = "1"; 
    if(currentTestNegMark > 0) {
        document.getElementById('negBadge').style.display = 'inline-block';
        document.getElementById('markNegative').innerText = currentTestNegMark;
    } else document.getElementById('negBadge').style.display = 'none';

    document.getElementById('paletteName').innerText = currentStudent.name;
    document.getElementById('paletteId').innerText = currentStudent.loginId;
    document.getElementById('paletteAvatar').innerText = currentStudent.name.charAt(0).toUpperCase();
    document.getElementById('questionText').innerText = "Loading Questions...";
    
    try {
        const q = query(collection(db, "questions"), where("testId", "==", testId));
        const qSnap = await getDocs(q);
        
        if(!qSnap.empty) {
            let resumeData = localStorage.getItem('tg_resume_' + testId);
            if(isResume && resumeData) {
                let parsed = JSON.parse(resumeData);
                testQuestions = parsed.testQuestions; userAnswers = parsed.userAnswers; markedForReview = parsed.markedForReview; visitedQuestions = parsed.visitedQuestions; timeLeft = parsed.timeLeft; currentQIndex = parsed.currentQIndex; totalTime = duration * 60;
            } else {
                let rawQuestions = qSnap.docs.map(d => d.data());
                rawQuestions.sort(() => Math.random() - 0.5);

                testQuestions = rawQuestions.map(qData => {
                    let optsArray = [], hOpts = qData.optionsHindi || qData.options || [], eOpts = qData.optionsEnglish || [];
                    for(let i=0; i<hOpts.length; i++) optsArray.push({ h: hOpts[i], e: eOpts[i] || "" });
                    
                    let correctObj = { h: hOpts[qData.correctAnswer], e: eOpts[qData.correctAnswer] || "" };
                    optsArray.sort(() => Math.random() - 0.5);
                    let newAnsIndex = optsArray.findIndex(o => o.h === correctObj.h && o.e === correctObj.e);
                    
                    return { qH: qData.questionHindi || qData.question, qE: qData.questionEnglish, uniqueId: qData.uniqueId || "N/A", opts: optsArray, ans: newAnsIndex, exp: qData.explanation || "No explanation provided.", marks: qData.questionMarks || 1, neg: qData.questionNeg || 0 };
                });

                totalTime = duration * 60; timeLeft = totalTime; currentQIndex = 0; userAnswers = {}; markedForReview = {}; visitedQuestions = {};
            }
            
            const container = document.getElementById('paletteContainer'); container.innerHTML = '';
            testQuestions.forEach((_, i) => {
                const btn = document.createElement('button'); btn.className = 'pallet-btn'; btn.innerText = i + 1;
                btn.onclick = () => { currentQIndex = i; loadQuestion(); }; container.appendChild(btn);
            });

            loadQuestion(); startTimer();
        } else { alert("No questions found for this test!"); history.back(); }
    } catch (e) { console.error(e); alert("Failed to load test!"); history.back(); }
}

function saveProgress() {
    localStorage.setItem('tg_resume_' + currentTestId, JSON.stringify({ testQuestions, userAnswers, markedForReview, visitedQuestions, timeLeft, currentQIndex }));
}

function startTimer() {
    clearInterval(timerInterval); const timerEl = document.getElementById('timerDisplay'); timerEl.classList.remove('timer-danger');
    timerInterval = setInterval(() => {
        timeLeft--; if(timeLeft % 5 === 0) saveProgress();
        let h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = timeLeft % 60;
        timerEl.innerText = `${h>0?h+':':''}${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        if(timeLeft <= (totalTime * 0.2) && timeLeft > 0) timerEl.classList.add('timer-danger');
        if(timeLeft <= 0) { clearInterval(timerInterval); finalSubmitTest(); }
    }, 1000);
}

function loadQuestion() {
    const q = testQuestions[currentQIndex]; visitedQuestions[currentQIndex] = true;
    document.getElementById('currentQNum').innerText = currentQIndex + 1;
    
    document.getElementById('questionUniqueId').innerText = "Q-ID: " + (q.uniqueId || "N/A");
    
    let qHtml = "";
    if(currentTestLanguage === "Hindi") qHtml = `<div>${q.qH}</div>`;
    else if(currentTestLanguage === "English") qHtml = `<div>${q.qE}</div>`;
    else qHtml = `<div>${q.qH}</div><div class="q-lang-en">${q.qE}</div>`;
    document.getElementById('questionText').innerHTML = qHtml;

    const optContainer = document.getElementById('optionsContainer'); optContainer.innerHTML = '';
    q.opts.forEach((opt, i) => {
        let labelHtml = "";
        if(currentTestLanguage === "Hindi") labelHtml = opt.h;
        else if(currentTestLanguage === "English") labelHtml = opt.e;
        else labelHtml = `${opt.h} <span class="opt-en">${opt.e}</span>`;

        if(labelHtml.trim() !== "") {
            const label = document.createElement('label'); label.className = 'option-label';
            label.innerHTML = `<input type="radio" name="option" value="${i}" ${userAnswers[currentQIndex] === i ? 'checked' : ''}> <div>${labelHtml}</div>`;
            label.querySelector('input').onchange = () => { userAnswers[currentQIndex] = i; saveProgress(); updatePalette(); };
            optContainer.appendChild(label);
        }
    });

    const markBtn = document.getElementById('markBtn');
    if(markedForReview[currentQIndex]) { markBtn.classList.add('marked'); markBtn.innerText = "❌ Remove Mark"; }
    else { markBtn.classList.remove('marked'); markBtn.innerText = "⭐ Mark for Review & Next"; }

    document.getElementById('btnPrev').disabled = (currentQIndex === 0);
    document.getElementById('btnPrev').style.opacity = (currentQIndex === 0) ? '0.5' : '1';
    document.getElementById('btnNext').innerText = currentQIndex === testQuestions.length - 1 ? "Save & Review" : "Save & Next →";
    updatePalette();
}

function updatePalette() {
    const buttons = document.getElementById('paletteContainer').children;
    for (let i = 0; i < testQuestions.length; i++) {
        buttons[i].className = 'pallet-btn';
        if (userAnswers[i] !== undefined && markedForReview[i]) buttons[i].classList.add('answered-marked');
        else if (markedForReview[i]) buttons[i].classList.add('marked');
        else if (userAnswers[i] !== undefined) buttons[i].classList.add('answered');
        else if (visitedQuestions[i]) buttons[i].classList.add('not-answered');
        if (i === currentQIndex) buttons[i].classList.add('active');
    }
}

window.nextQuestion = function() { saveProgress(); if (currentQIndex < testQuestions.length - 1) { currentQIndex++; loadQuestion(); } else showSubmitModal(); }
window.prevQuestion = function() { saveProgress(); if (currentQIndex > 0) { currentQIndex--; loadQuestion(); } }
window.toggleMark = function() { markedForReview[currentQIndex] = !markedForReview[currentQIndex]; saveProgress(); loadQuestion(); }
window.clearResponse = function() { delete userAnswers[currentQIndex]; saveProgress(); loadQuestion(); }
window.toggleFullScreen = function() { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else if (document.exitFullscreen) document.exitFullscreen(); }

window.showSubmitModal = function() {
    let answered = 0, notAnswered = 0, marked = 0, notVisited = 0;
    testQuestions.forEach((_, i) => {
        if(!visitedQuestions[i]) notVisited++;
        else if(userAnswers[i] !== undefined) answered++;
        else notAnswered++;
        if(markedForReview[i]) marked++;
    });

    document.getElementById('smTotal').innerText = testQuestions.length;
    document.getElementById('smAnswered').innerText = answered;
    document.getElementById('smNotAnswered').innerText = notAnswered;
    document.getElementById('smMarked').innerText = marked;
    document.getElementById('smNotVisited').innerText = notVisited;
    document.getElementById('submitModal').classList.remove('hide');
}

window.closeSubmitModal = function() { document.getElementById('submitModal').classList.add('hide'); }

window.finalSubmitTest = async function() {
    closeSubmitModal(); clearInterval(timerInterval); localStorage.removeItem('tg_resume_' + currentTestId); 
    
    let score = 0, correctCount = 0, wrongCount = 0, skippedCount = 0, negDeducted = 0;
    testQuestions.forEach((q, i) => {
        if(userAnswers[i] === q.ans) { correctCount++; score += 1; } 
        else if(userAnswers[i] !== undefined) { wrongCount++; negDeducted += currentTestNegMark; } 
        else skippedCount++;
    });
    score = score - negDeducted;

    showScreen('resultScreen');
    
    document.getElementById('resTestName').innerText = currentTestName;
    document.getElementById('finalScore').innerText = score.toFixed(2); 
    document.getElementById('totalScore').innerText = currentTestMarks;
    document.getElementById('statCorrect').innerText = correctCount;
    document.getElementById('statWrong').innerText = wrongCount;
    document.getElementById('statSkipped').innerText = skippedCount;
    document.getElementById('statNeg').innerText = negDeducted.toFixed(2);
    
    let percent = (score / currentTestMarks) * 100; if(percent < 0) percent = 0;
    document.getElementById('scoreCircle').style.background = `conic-gradient(var(--accent) ${percent}%, #E5E7EB ${percent}%)`;
    document.getElementById('rankText').innerText = "Calculating Rank...";

    try {
        const percentStr = percent.toFixed(1);
        await addDoc(collection(db, "results"), {
            timestamp: new Date().toISOString(), loginId: currentStudent.loginId, studentName: currentStudent.name,
            testId: currentTestId, testName: currentTestName, correctCount, wrongCount, negDeducted: negDeducted.toFixed(2), finalScore: score.toFixed(2), totalMarks: currentTestMarks, percent: percentStr, userAnswers, testQuestionsState: testQuestions 
        });

        const rankSnap = await getDocs(query(collection(db, "results"), where("testId", "==", currentTestId)));
        let allResults = rankSnap.docs.map(d => d.data()).sort((a, b) => b.finalScore - a.finalScore);
        let userRank = 1;
        allResults.forEach((r, index) => { if(r.loginId === currentStudent.loginId && r.finalScore === score.toFixed(2)) userRank = index + 1; });

        document.getElementById('rankText').innerText = `Your Rank: ${userRank} out of ${allResults.length} students`;
        currentResultData = { score: score.toFixed(2), total: currentTestMarks, rank: userRank, totalStudents: allResults.length, correct: correctCount, wrong: wrongCount, neg: negDeducted.toFixed(2), percent: percentStr };
        fetchSettingsAndTests();
    } catch(e) { console.error(e); document.getElementById('rankText').innerText = "Rank calculation failed."; }
}

window.viewSolutions = function() {
    const container = document.getElementById('solutionsContainer');
    let html = "";
    testQuestions.forEach((q, i) => {
        let uAns = userAnswers[i];
        let isCorrect = (uAns === q.ans);
        let qHtml = "";
        if(currentTestLanguage === "Hindi") qHtml = `<div>${q.qH}</div>`;
        else if(currentTestLanguage === "English") qHtml = `<div>${q.qE}</div>`;
        else qHtml = `<div>${q.qH}</div><div style="color:#6B7280; font-size:14px; margin-top:5px;">${q.qE}</div>`;

        html += `<div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 5px solid ${isCorrect ? 'var(--accent)' : (uAns !== undefined ? 'var(--danger)' : 'var(--grey)')};"><div style="font-size: 12px; color: #6B7280; margin-bottom: 5px;">Q-ID: ${q.uniqueId}</div><div style="font-weight: 600; font-size: 16px; margin-bottom: 15px;">Q${i+1}. ${qHtml}</div>`;
        
        q.opts.forEach((opt, j) => {
            let labelHtml = currentTestLanguage === "Hindi" ? opt.h : (currentTestLanguage === "English" ? opt.e : `${opt.h} <span style="font-size:12px; color:#6B7280;">(${opt.e})</span>`);
            let isUser = (uAns === j), isRight = (q.ans === j);
            let bgColor = "#F9FAFB", borderColor = "transparent", textColor = "#374151";
            if(isRight) { bgColor = "#D1FAE5"; borderColor = "var(--accent)"; textColor = "#065F46"; }
            else if(isUser && !isRight) { bgColor = "#FEE2E2"; borderColor = "var(--danger)"; textColor = "#991B1B"; }
            html += `<div style="padding: 12px; border-radius: 8px; background: ${bgColor}; border: 1px solid ${borderColor}; color: ${textColor}; margin-bottom: 8px; font-size: 14px;">${String.fromCharCode(65+j)}) ${labelHtml} ${isRight ? '✅' : ''} ${isUser && !isRight ? '❌' : ''}</div>`;
        });
        
        if(uAns === undefined) html += `<div style="color: var(--danger); font-size: 13px; font-weight:600; margin-top:10px;">You did not attempt this question.</div>`;
        if(q.exp) html += `<div style="background: #EFF6FF; padding: 15px; border-radius: 8px; color: #1E3A8A; font-size: 14px; margin-top: 15px; border-left: 4px solid #3B82F6;"><b>Explanation:</b> ${q.exp}</div>`;
        html += `</div>`;
    });
    container.innerHTML = html;
    showScreen('solutionsScreen');
}

window.viewPastAnalysis = function(testId) {
    let res = userPastResults[testId];
    if(!res) return alert("Result not found!");
    
    testQuestions = res.testQuestionsState || []; userAnswers = res.userAnswers || {}; currentTestLanguage = "Both"; currentTestName = res.testName;
    showScreen('resultScreen');
    
    document.getElementById('resTestName').innerText = res.testName;
    document.getElementById('finalScore').innerText = res.finalScore; 
    document.getElementById('totalScore').innerText = res.totalMarks;
    document.getElementById('statCorrect').innerText = res.correctCount;
    document.getElementById('statWrong').innerText = res.wrongCount;
    let skipped = (testQuestions.length || res.totalMarks) - res.correctCount - res.wrongCount;
    document.getElementById('statSkipped').innerText = skipped > 0 ? skipped : 0;
    document.getElementById('statNeg').innerText = res.negDeducted;
    
    let percent = parseFloat(res.percent); if(percent < 0) percent = 0;
    document.getElementById('scoreCircle').style.background = `conic-gradient(var(--accent) ${percent}%, #E5E7EB ${percent}%)`;
    document.getElementById('rankText').innerText = "Previous Attempt Analysis";
    currentResultData = { score: res.finalScore, total: res.totalMarks, rank: '-', totalStudents: '-', correct: res.correctCount, wrong: res.wrongCount, neg: res.negDeducted, percent: res.percent };
}

window.downloadScorecard = function() {
    if(!currentResultData) return alert("No result data available!");
    let html = `<html><head><title>Scorecard - TaiyariGhar</title><style>body{font-family:sans-serif; text-align:center; padding:50px;} h1{color:#4F46E5;} table{margin:20px auto; border-collapse:collapse; width:70%;} th,td{border:1px solid #ddd; padding:12px;} .footer{margin-top:30px; font-size:12px; color:#666;}</style></head><body><h1>🏠 TaiyariGhar</h1><h2>Test Scorecard</h2><table><tr><th>Student Name</th><td>${currentStudent.name}</td></tr><tr><th>Login ID</th><td>${currentStudent.loginId}</td></tr><tr><th>Test Name</th><td>${currentTestName}</td></tr><tr><th>Total Questions</th><td>${testQuestions.length}</td></tr><tr><th>Correct Answers</th><td style="color:green; font-weight:bold;">${currentResultData.correct}</td></tr><tr><th>Wrong Answers</th><td style="color:red; font-weight:bold;">${currentResultData.wrong}</td></tr><tr><th>Negative Deducted</th><td style="color:red;">-${currentResultData.neg}</td></tr><tr><th>Final Score</th><td>${currentResultData.score} / ${currentResultData.total}</td></tr><tr><th>Percentage</th><td>${currentResultData.percent}%</td></tr><tr><th>Rank</th><td>${currentResultData.rank} ${currentResultData.totalStudents !== '-' ? '(out of '+currentResultData.totalStudents+')' : ''}</td></tr></table><div class="footer">मेहनत आपकी, साथ हमारा!</div></body></html>`;
    let w = window.open('', '_blank'); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
}

window.downloadQuestionPaper = function() {
    if(!testQuestions || testQuestions.length === 0) return alert("No questions available!");
    let html = `<html><head><title>Question Paper - TaiyariGhar</title><style>body{font-family:sans-serif; padding:30px;} .q{margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;} .correct{color:green; font-weight:bold;} .wrong{color:red; font-weight:bold;} .exp{background:#f0fdf4; padding:10px; border-radius:5px; font-size:14px; margin-top:8px;} .uid{font-size:12px; color:#666;}</style></head><body><h1 style="text-align:center;">🏠 TaiyariGhar - Question Paper</h1><h3>Test: ${currentTestName} | Student: ${currentStudent.name}</h3><hr>`;
    
    testQuestions.forEach((q, i) => {
        let userAns = userAnswers[i];
        let qText = (currentTestLanguage === "English") ? q.qE : (currentTestLanguage === "Hindi" ? q.qH : `${q.qH} <br><span style="font-size:14px; color:#555;">${q.qE}</span>`);
        html += `<div class="q"><div class="uid">Q-ID: ${q.uniqueId}</div><p><b>Q${i+1}. ${qText}</b></p>`;
        q.opts.forEach((opt, j) => {
            let labelHtml = (currentTestLanguage === "English") ? opt.e : (currentTestLanguage === "Hindi" ? opt.h : `${opt.h} (${opt.e})`);
            if(labelHtml && labelHtml.trim() !== "") {
                let style = ""; if(j === q.ans) style = 'class="correct"'; else if(j === userAns) style = 'class="wrong"';
                html += `<p ${style}>${String.fromCharCode(65+j)}) ${labelHtml}</p>`;
            }
        });
        html += `<p style="margin-top:10px;">Your Answer: ${userAns !== undefined ? String.fromCharCode(65+userAns) : 'Not Attempted'}</p><p>Correct Answer: ${String.fromCharCode(65+q.ans)}</p>`;
        if(q.exp) html += `<div class="exp"><b>Explanation:</b> ${q.exp}</div>`;
        html += `</div>`;
    });
    html += `</body></html>`;
    let w = window.open('', '_blank'); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
}

window.shareResultOnWhatsApp = function() {
    if(!currentResultData) return alert("No result data available!");
    let msg = `🏆 *TaiyariGhar Result* 🏆\n\n👤 *Name:* ${currentStudent.name}\n📚 *Test:* ${currentTestName}\n📊 *Score:* ${currentResultData.score} / ${currentResultData.total}\n✅ *Correct:* ${currentResultData.correct}\n❌ *Wrong:* ${currentResultData.wrong}\n➖ *Negative:* -${currentResultData.neg}\n📈 *Percentage:* ${currentResultData.percent}%\n🥇 *Rank:* ${currentResultData.rank} ${currentResultData.totalStudents !== '-' ? '(out of '+currentResultData.totalStudents+')' : ''}\n\nमेहनत आपकी, साथ हमारा! 💪\nhttps://taiyarighar.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW err', err)); });
}

history.replaceState({ screen: 'homeScreen' }, '', '');

window.onload = () => {
    applyLanguage(); 
    let savedUser = localStorage.getItem('tg_user');
    if(savedUser) { 
        currentStudent = JSON.parse(savedUser); isLoggedIn = true; isFirstLoginSession = false; fetchSettingsAndTests(); 
    } else { fetchSettingsAndTests(); }
}
