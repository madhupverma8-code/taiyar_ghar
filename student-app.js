import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, addDoc, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =========================================================================
// 🔧 CONFIGURATION
// =========================================================================
const RAZORPAY_KEY_ID = "rzp_live_Ttffsg1nwh5gBU";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwR5qMVwV6yM43wl7uLrsCLPNHIWn9FpiSbB3heEh-bCbJ5CRzLxzpj8vvep9NpPTg3/exec";

// Firebase Configuration
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

let currentStudent = { docId: "", name: "", email: "", mobile: "", loginId: "", isPaid: false, expiry: "" };
let isLoggedIn = false;
let isFirstLoginSession = false;
let recommendedTestData = null;
let nav = { mainCat: "", subCat: "", examName: "" };

let selectedPlanMonths = 12;
let subscriptionPlans = {
    3:  { months: 3,  days: 90,  label: "3 Months Pass",  mrp: 149, price: 99 },
    6:  { months: 6,  days: 180, label: "6 Months Pass",  mrp: 249, price: 199 },
    12: { months: 12, days: 365, label: "12 Months Pass", mrp: 399, price: 249 }
};

let regGeneratedOtp = "";
let regOtpExpiry = 0;
let isRegEmailVerified = false;
let verifiedRegEmail = "";

let forgotGeneratedOtp = "";
let forgotOtpExpiry = 0;
let forgotTargetDocId = "";
let forgotTargetEmail = "";

let testQuestions = [], currentQIndex = 0, userAnswers = {}, markedForReview = {}, visitedQuestions = {};
let timerInterval, liveCountdownInterval, timeLeft = 0, totalTime = 0;
let currentTestId = "", currentTestName = "", currentTestMarks = 0, currentTestNegMark = 0, currentTestPosMark = 1, currentTestLanguage = "Both";
let isCurrentTestLive = false, currentLiveEndTime = "";
let tabSwitchWarnings = 0;
let isTestSubmitting = false;

let pendingTestDetails = null;
let currentResultData = null;
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
    "en": { "nav_home": "Home", "nav_exams": "All Exams", "nav_ca": "Current Affairs", "nav_login": "Login", "nav_register": "Register", "nav_dash": "Dashboard", "nav_purchase": "My Purchases", "nav_logout": "Logout", "hero_h1": "Crack Your Dream Govt Job with Confidence.", "hero_p": "All-in-one mock test platform for SSC, Railway, Police & All State Exams. Latest syllabus, real-time rankings, and unlimited tests in one subscription.", "sec_cats": "🎯 Exam Categories", "ca_h2": "📰 Current Affairs Hub", "ca_p": "Stay updated with Daily, Weekly, and Monthly Current Affairs.", "btn_explore": "Explore Now", "login_h2": "Login to Your Account", "login_btn": "Login", "login_new": "New user?", "login_reg": "Register Here", "reg_h2": "Create an Account", "reg_btn": "Complete Registration", "dash_h2": "Crack Your Dream Govt Job with Confidence.", "dash_qv": "📊 Dashboard Quick View", "qv_explore": "Explore Tests", "qv_browse": "Browse all available tests", "qv_view": "View Tests", "qv_rec": "Recommended Next", "qv_loading": "Loading...", "qv_start": "Start Now", "qv_recent": "Recent Performance", "qv_not_att": "Not Attempted Yet", "qv_take": "Take a test to see your score", "btn_back_cat": "← Back to Dashboard", "pay_unlock": "Unlock all premium mock tests & Live All-India Exams for", "pay_close": "Close" },
    "hi": { "nav_home": "होम", "nav_exams": "सभी परीक्षाएं", "nav_ca": "करंट अफेयर्स", "nav_login": "लॉगिन", "nav_register": "रजिस्टर", "nav_dash": "डैशबोर्ड", "nav_purchase": "मेरी खरीदारी", "nav_logout": "लॉगआउट", "hero_h1": "TayariGhar के साथ पाएं अपनी ड्रीम गवर्नमेंट जॉब।", "hero_p": "SSC, रेलवे, पुलिस और सभी राज्य परीक्षाओं के लिए ऑल-इन-वन मॉक टेस्ट प्लेटफॉर्म। नवीनतम सिलेबस, रियल-टाइम रैंकिंग और वन सब्सक्रिप्शन में अनलिमिटेड टेस्ट।", "sec_cats": "🎯 परीक्षा श्रेणियाँ", "ca_h2": "📰 करंट अफेयर्स हब", "ca_p": "दैनिक, साप्ताहिक और मासिक करंट अफेयर्स के साथ अपडेट रहें।", "btn_explore": "अभी देखें", "login_h2": "अपने खाते में लॉगिन करें", "login_btn": "लॉगिन", "login_new": "नए उपयोगकर्ता हैं?", "login_reg": "यहाँ रजिस्टर करें", "reg_h2": "खाता बनाएँ", "reg_btn": "रजिस्ट्रेशन पूरा करें", "dash_h2": "TayariGhar के साथ पाएं अपनी ड्रीम गवर्नमेंट जॉब।", "dash_qv": "📊 डैशबोर्ड त्वरित दृश्य", "qv_explore": "टेस्ट खोजें", "qv_browse": "सभी उपलब्ध टेस्ट ब्राउज़ करें", "qv_view": "टेस्ट देखें", "qv_rec": "अगला सुझाव", "qv_loading": "लोड हो रहा है...", "qv_start": "अभी शुरू करें", "qv_recent": "हालिया प्रदर्शन", "qv_not_att": "अभी तक प्रयास नहीं किया", "qv_take": "अपना स्कोर देखने के लिए टेस्ट दें", "btn_back_cat": "← डैशबोर्ड पर वापस", "pay_unlock": "सभी प्रीमियम मॉक टेस्ट और लाइव ऑल-इंडिया परीक्षाएं अनलॉक करें", "pay_close": "बंद करें" }
};

let currentLang = localStorage.getItem('tg_lang') || 'en';

async function callEmailService(payload) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
        console.warn("Google Apps Script URL not configured yet. Payload:", payload);
        return { status: "not_configured" };
    }
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (err) {
        console.error("Email service error:", err);
        return { status: "error", message: err.message };
    }
}

// =========================================================================
// 🖥️ SCREEN NAVIGATION & DYNAMIC URL ROUTING
// =========================================================================
const ALL_SCREENS = [
    'homeScreen', 'loginScreen', 'registerScreen', 'forgotPasswordScreen',
    'dashboardScreen', 'subCatScreen', 'caScreen', 'instructionsScreen',
    'testScreen', 'liveSubmittedScreen', 'resultScreen', 'solutionsScreen',
    'aboutScreen', 'contactScreen', 'privacyScreen', 'termsScreen', 'refundScreen'
];

function showScreen(screenId, pushHistory = true) {
    ALL_SCREENS.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hide');
    });
    
    if (screenId === 'testScreen') {
        document.getElementById('mainHeader').classList.add('hide');
        document.getElementById('mainFooter').classList.add('hide');
        enableAntiCheating();
    } else {
        document.getElementById('mainHeader').classList.remove('hide');
        document.getElementById('mainFooter').classList.remove('hide');
        disableAntiCheating();
    }
    
    const target = document.getElementById(screenId);
    if(target) target.classList.remove('hide');
    currentScreen = screenId;
    window.scrollTo(0, 0);

    // Dynamic URL Address Bar Update
    if (pushHistory && history.state?.screen !== screenId) {
        const pageMap = {
            'homeScreen': window.location.pathname,
            'aboutScreen': '?page=about',
            'contactScreen': '?page=contact',
            'privacyScreen': '?page=privacy',
            'termsScreen': '?page=terms',
            'refundScreen': '?page=refund',
            'loginScreen': '?page=login',
            'registerScreen': '?page=register',
            'forgotPasswordScreen': '?page=reset-password',
            'dashboardScreen': '?page=dashboard',
            'caScreen': '?page=current-affairs'
        };
        const nextUrl = pageMap[screenId] || window.location.search;
        history.pushState({ screen: screenId }, '', nextUrl);
    }
}

window.openInfoSection = function(sectionId) {
    showScreen(sectionId, true);
};

window.onpopstate = function(event) {
    if (currentScreen === 'testScreen') {
        history.pushState({ screen: 'testScreen' }, '', window.location.search);
        if (isCurrentTestLive) {
            handleAntiCheatViolation("Back button navigation is strictly blocked during Live Exam!");
        } else {
            if (confirm("Are you sure you want to submit and exit the test?")) {
                finalSubmitTest();
            }
        }
        return;
    }

    if (event.state && event.state.screen) {
        showScreen(event.state.screen, false);
    } else {
        checkUrlRouting();
    }
};

async function checkUrlRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const catSlug = urlParams.get('category');
    const subCatSlug = urlParams.get('subcat');

    if (pageParam) {
        const routeMap = {
            'about': 'aboutScreen',
            'contact': 'contactScreen',
            'privacy': 'privacyScreen',
            'terms': 'termsScreen',
            'refund': 'refundScreen',
            'login': 'loginScreen',
            'register': 'registerScreen',
            'reset-password': 'forgotPasswordScreen',
            'current-affairs': 'caScreen',
            'dashboard': isLoggedIn ? 'dashboardScreen' : 'loginScreen'
        };
        if (routeMap[pageParam]) {
            if (routeMap[pageParam] === 'dashboardScreen') {
                goDashboard();
            } else if (routeMap[pageParam] === 'caScreen') {
                showCurrentAffairs();
            } else {
                showScreen(routeMap[pageParam], false);
            }
            return;
        }
    }

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
                    if(targetSub) loadTestsForSubCat(targetSub, null, true);
                }
            }
        }
    } else if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
        if (isLoggedIn) goDashboard();
        else goHome();
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
    window.history.pushState({ screen: 'dashboardScreen' }, '', '?page=dashboard');
    showScreen('dashboardScreen', false); 
    updateHeaderUI(); 
    renderCandidateProfilePopover();
    fetchDashboardData(); 
    updateWelcomeMessage(isFirstLoginSession); 
}

window.showLogin = function() { showScreen('loginScreen'); }
window.showRegister = function() { 
    isRegEmailVerified = false;
    verifiedRegEmail = "";
    document.getElementById('regOtpBox').classList.add('hide');
    document.getElementById('regPasswordBox').classList.add('hide');
    document.getElementById('regEmail').disabled = false;
    document.getElementById('btnSendRegOtp').disabled = false;
    document.getElementById('btnSendRegOtp').innerText = "Send OTP";
    showScreen('registerScreen'); 
}
window.showForgotPassword = function() { 
    document.getElementById('forgotOtpStepBox').classList.add('hide');
    document.getElementById('forgotEmail').disabled = false;
    showScreen('forgotPasswordScreen'); 
}
window.logout = function() { 
    isLoggedIn = false; 
    currentStudent = {}; 
    localStorage.removeItem('tg_user'); 
    closeProfilePopover();
    goHome(); 
}

// =========================================================================
// 👤 PRO LMS PROFILE POPOVER & LIVE TESTS HUB CONTROLS
// =========================================================================
window.toggleProfilePopover = function(e) {
    if (e) e.stopPropagation();
    const pop = document.getElementById('profilePopoverCard');
    if (pop) pop.classList.toggle('hide');
};

window.closeProfilePopover = function() {
    const pop = document.getElementById('profilePopoverCard');
    if (pop) pop.classList.add('hide');
};

document.addEventListener('click', function(e) {
    const pop = document.getElementById('profilePopoverCard');
    const trigger = document.querySelector('.lms-avatar-trigger');
    if (pop && !pop.classList.contains('hide') && !pop.contains(e.target) && (!trigger || !trigger.contains(e.target))) {
        pop.classList.add('hide');
    }
});

window.openLiveTestsHub = function() {
    renderLiveTestsShowcase();
    document.getElementById('liveHubModal').classList.remove('hide');
};

window.closeLiveTestsHub = function() {
    document.getElementById('liveHubModal').classList.add('hide');
};

function updateHeaderUI() {
    if(isLoggedIn) {
        document.getElementById('headerAuth').classList.add('hide');
        document.getElementById('headerProfile').classList.remove('hide');
        document.getElementById('navStudentName').innerText = currentStudent.name.split(' ')[0]; 
        document.getElementById('navAvatarCircle').innerText = currentStudent.name.charAt(0).toUpperCase();
        renderCandidateProfilePopover();
    } else {
        document.getElementById('headerAuth').classList.remove('hide');
        document.getElementById('headerProfile').classList.add('hide');
    }
}

function renderCandidateProfilePopover() {
    if (!isLoggedIn) return;
    const initial = currentStudent.name.charAt(0).toUpperCase();
    document.getElementById('popAvatarLg').innerText = initial;
    document.getElementById('popStudentName').innerText = currentStudent.name;
    document.getElementById('popStudentId').innerText = "ID: " + currentStudent.loginId;
    document.getElementById('popStudentEmail').innerText = currentStudent.email || "Not Set";
    document.getElementById('popStudentMobile').innerText = currentStudent.mobile || "Not Set";

    const badge = document.getElementById('popSubBadge');
    const expiryEl = document.getElementById('popSubExpiry');
    const upgBtn = document.getElementById('popUpgradeBtn');

    if (currentStudent.isPaid) {
        badge.className = "sub-badge pro";
        badge.innerText = "⭐ PRO ALL-ACCESS";
        expiryEl.innerText = "Valid till: " + (currentStudent.expiry || "Active");
        upgBtn.classList.add('hide');
    } else {
        badge.className = "sub-badge free";
        badge.innerText = "FREE PLAN";
        expiryEl.innerText = "Upgrade to unlock Live Exams & All Tests";
        upgBtn.classList.remove('hide');
    }
}

function updateWelcomeMessage(isFirst) {
    let firstName = currentStudent.name.split(' ')[0];
    let msgEl = document.getElementById('welcomeMessage');
    if(isFirst) msgEl.innerHTML = currentLang === 'en' ? `🎉 Welcome, ${firstName}! Your Govt Job preparation workspace is ready.` : `🎉 स्वागत है, ${firstName}! आपकी तैयारी का डैशबोर्ड तैयार है।`;
    else msgEl.innerHTML = currentLang === 'en' ? `💪 Welcome back, ${firstName}! Consistency is the key to success.` : `💪 वापसी पर स्वागत है, ${firstName}! सफलता उन्हीं को मिलती है जो रोज़ मेहनत करते हैं।`;
}

window.scrollToCategories = function() { 
    if(!isLoggedIn) { 
        if (currentScreen !== 'homeScreen') goHome();
        setTimeout(() => { document.getElementById('homeCategories').scrollIntoView({behavior: 'smooth'}); }, 100);
    } else if (currentScreen === 'dashboardScreen') {
        document.getElementById('dashCategories').scrollIntoView({behavior: 'smooth'}); 
    } else {
        goDashboard();
        setTimeout(() => { document.getElementById('dashCategories').scrollIntoView({behavior: 'smooth'}); }, 400);
    }
}

window.scrollToLiveTests = function() {
    openLiveTestsHub();
}

window.showPurchases = function() { 
    if(!isLoggedIn) return; 
    let status = currentStudent.isPaid ? "PRO All-Access (Active)" : "Free Plan"; 
    alert(`--- MY SUBSCRIPTION & INVOICES ---\n\nName: ${currentStudent.name}\nLogin ID: ${currentStudent.loginId}\nPlan: ${status}\nValid Till: ${currentStudent.expiry || "N/A"}\n\nNote: Official PDF invoices are automatically emailed to ${currentStudent.email}.`); 
}

window.doLogin = async function() {
    const inputVal = document.getElementById('loginId').value.trim(); 
    const pass = document.getElementById('loginPass').value.trim();
    if(!inputVal || !pass) return alert("Enter Email ID, Mobile Number, or Login ID and Password!");
    
    try {
        let snapshot = await getDocs(query(collection(db, "students"), where("email", "==", inputVal.toLowerCase()), where("password", "==", pass)));
        if(snapshot.empty) snapshot = await getDocs(query(collection(db, "students"), where("mobile", "==", inputVal), where("password", "==", pass)));
        if(snapshot.empty) snapshot = await getDocs(query(collection(db, "students"), where("loginId", "==", inputVal.toUpperCase()), where("password", "==", pass)));
        
        if(!snapshot.empty) {
            const studentDoc = snapshot.docs[0];
            const studentData = studentDoc.data();
            const docRef = doc(db, "students", studentDoc.id);

            let isPaidActive = studentData.isPaid || false;
            if (isPaidActive && studentData.expiryDate) {
                const expDate = new Date(studentData.expiryDate + "T23:59:59");
                if (new Date() > expDate) {
                    isPaidActive = false;
                    await updateDoc(docRef, { isPaid: false });
                }
            }

            let dev1 = studentData.device1 || "", dev2 = studentData.device2 || "", myDev = getDeviceId();
            if(dev1 && dev2 && dev1 !== myDev && dev2 !== myDev) await updateDoc(docRef, { device1: dev2, device2: myDev }); 
            else if(!dev1) await updateDoc(docRef, { device1: myDev });
            else if(!dev2 && dev1 !== myDev) await updateDoc(docRef, { device2: myDev });

            currentStudent = { 
                docId: studentDoc.id,
                name: studentData.name, 
                email: studentData.email || "",
                mobile: studentData.mobile || "",
                loginId: studentData.loginId, 
                isPaid: isPaidActive, 
                expiry: studentData.expiryDate || "" 
            };
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
        } else { alert("❌ Invalid Credentials! Please check your Email/Mobile and Password."); }
    } catch (e) { console.error(e); alert("Database Error: " + e.message); }
}

window.sendRegisterOtp = async function() {
    const name = document.getElementById('regName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();

    if (!name) return alert("Please enter your Full Name first!");
    if (!mobile || mobile.length < 10) return alert("Please enter a valid 10-digit Mobile Number!");
    if (!email || !email.includes("@")) return alert("Please enter a valid Email ID!");

    const btn = document.getElementById('btnSendRegOtp');
    btn.disabled = true;
    btn.innerText = "Sending...";

    try {
        const emailCheck = await getDocs(query(collection(db, "students"), where("email", "==", email)));
        if (!emailCheck.empty) {
            btn.disabled = false;
            btn.innerText = "Send OTP";
            return alert("❌ This Email ID is already registered! Please login instead.");
        }

        const mobileCheck = await getDocs(query(collection(db, "students"), where("mobile", "==", mobile)));
        if (!mobileCheck.empty) {
            btn.disabled = false;
            btn.innerText = "Send OTP";
            return alert("❌ This Mobile Number is already registered! Please login instead.");
        }

        regGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        regOtpExpiry = Date.now() + 10 * 60 * 1000;

        const res = await callEmailService({
            action: "send_otp",
            email: email,
            name: name,
            otp: regGeneratedOtp,
            purpose: "Registration Verification"
        });

        if (res.status === "not_configured") {
            alert(`[Setup Mode] Google Apps Script URL not linked yet.\nYour Test OTP is: ${regGeneratedOtp}`);
        } else if (res.status === "success") {
            alert(`✅ A 6-digit OTP has been sent to ${email}. Please check your Inbox or Spam folder.`);
        } else {
            throw new Error(res.message || "Failed to send OTP email");
        }

        document.getElementById('regOtpBox').classList.remove('hide');
        btn.innerText = "Resend OTP";
        btn.disabled = false;
    } catch (e) {
        console.error(e);
        alert("Error sending OTP: " + e.message);
        btn.disabled = false;
        btn.innerText = "Send OTP";
    }
}

window.verifyRegisterOtp = function() {
    const userOtp = document.getElementById('regOtpInput').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();

    if (!userOtp || userOtp.length !== 6) return alert("Please enter the 6-digit OTP!");
    if (Date.now() > regOtpExpiry) return alert("❌ OTP has expired! Please click Resend OTP.");
    if (userOtp !== regGeneratedOtp) return alert("❌ Incorrect OTP! Please check your email and try again.");

    isRegEmailVerified = true;
    verifiedRegEmail = email;

    document.getElementById('regEmail').disabled = true;
    document.getElementById('btnSendRegOtp').disabled = true;
    document.getElementById('regOtpBox').classList.add('hide');
    document.getElementById('regPasswordBox').classList.remove('hide');
}

window.doRegister = async function() {
    const name = document.getElementById('regName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const passConfirm = document.getElementById('regPassConfirm').value.trim();

    if (!isRegEmailVerified || !verifiedRegEmail) return alert("Please verify your Email ID with OTP first!");
    if (!pass || pass.length < 4) return alert("Please create a password (minimum 4 characters)!");
    if (pass !== passConfirm) return alert("Passwords do not match!");

    try {
        const allStudentsSnap = await getDocs(collection(db, "students"));
        let maxNum = 0;
        allStudentsSnap.forEach(d => {
            let lid = d.data().loginId;
            if (lid && lid.startsWith("TG")) {
                let num = parseInt(lid.replace("TG", ""), 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        const newId = "TG" + String(maxNum + 1).padStart(4, '0');

        await addDoc(collection(db, "students"), {
            name: name, 
            email: verifiedRegEmail,
            mobile: mobile, 
            loginId: newId, 
            password: pass, 
            isPaid: false, 
            expiryDate: "", 
            createdAt: new Date().toISOString(),
            device1: getDeviceId(), 
            device2: ""
        });

        callEmailService({
            action: "welcome",
            email: verifiedRegEmail,
            name: name,
            studentId: newId,
            mobile: mobile,
            password: pass
        });

        document.getElementById('newLoginId').innerText = newId;
        document.getElementById('newLoginEmail').innerText = verifiedRegEmail;
        document.getElementById('newLoginPass').innerText = pass;
        
        document.getElementById('registerSuccessModal').classList.remove('hide');
    } catch (e) { console.error(e); alert("Database Error: " + e.message); }
}

window.closeRegModal = function() {
    document.getElementById('registerSuccessModal').classList.add('hide');
    document.getElementById('regName').value = ''; 
    document.getElementById('regMobile').value = ''; 
    document.getElementById('regEmail').value = '';
    document.getElementById('regOtpInput').value = '';
    document.getElementById('regPass').value = ''; 
    document.getElementById('regPassConfirm').value = '';
    showLogin();
}

window.sendForgotOtp = async function() {
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    if (!email || !email.includes("@")) return alert("Please enter your registered Email ID!");

    const btn = document.getElementById('btnSendForgotOtp');
    btn.disabled = true;
    btn.innerText = "Checking...";

    try {
        const snap = await getDocs(query(collection(db, "students"), where("email", "==", email)));
        if (snap.empty) {
            btn.disabled = false;
            btn.innerText = "Send OTP";
            return alert("❌ No account found with this Email ID!");
        }

        const studentDoc = snap.docs[0];
        forgotTargetDocId = studentDoc.id;
        forgotTargetEmail = email;
        forgotGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        forgotOtpExpiry = Date.now() + 10 * 60 * 1000;

        const res = await callEmailService({
            action: "send_otp",
            email: email,
            name: studentDoc.data().name || "Student",
            otp: forgotGeneratedOtp,
            purpose: "Password Reset"
        });

        if (res.status === "not_configured") {
            alert(`[Setup Mode] Your Password Reset OTP is: ${forgotGeneratedOtp}`);
        } else if (res.status === "success") {
            alert(`✅ Password Reset OTP sent to ${email}.`);
        }

        document.getElementById('forgotEmail').disabled = true;
        document.getElementById('forgotOtpStepBox').classList.remove('hide');
        btn.innerText = "Resend OTP";
        btn.disabled = false;
    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Send OTP";
    }
}

window.doResetPassword = async function() {
    const otpInput = document.getElementById('forgotOtpInput').value.trim();
    const newPass = document.getElementById('forgotNewPass').value.trim();

    if (!otpInput || otpInput.length !== 6) return alert("Please enter the 6-digit OTP!");
    if (Date.now() > forgotOtpExpiry) return alert("❌ OTP expired! Please request a new OTP.");
    if (otpInput !== forgotGeneratedOtp) return alert("❌ Invalid OTP!");
    if (!newPass || newPass.length < 4) return alert("Please enter a new password (min 4 characters)!");

    try {
        await updateDoc(doc(db, "students", forgotTargetDocId), { password: newPass });
        alert("✅ Password Reset Successful! You can now login with your new password.");
        document.getElementById('forgotOtpInput').value = '';
        document.getElementById('forgotNewPass').value = '';
        showLogin();
    } catch (e) { console.error(e); alert("Error updating password: " + e.message); }
}

function syncSubscriptionPlansFromSettings() {
    subscriptionPlans[3].mrp    = parseFloat(appSettings.Plan3_MRP    || 149);
    subscriptionPlans[3].price  = parseFloat(appSettings.Plan3_Price  || 99);
    subscriptionPlans[6].mrp    = parseFloat(appSettings.Plan6_MRP    || 249);
    subscriptionPlans[6].price  = parseFloat(appSettings.Plan6_Price  || 199);
    subscriptionPlans[12].mrp   = parseFloat(appSettings.Plan12_MRP   || 399);
    subscriptionPlans[12].price = parseFloat(appSettings.Plan12_Price || 249);

    [3, 6, 12].forEach(m => {
        const p = subscriptionPlans[m];
        const disc = Math.max(0, p.mrp - p.price);
        if (document.getElementById(`planMrp${m}`)) document.getElementById(`planMrp${m}`).innerText = p.mrp;
        if (document.getElementById(`planPrice${m}`)) document.getElementById(`planPrice${m}`).innerText = p.price;
        if (document.getElementById(`planSave${m}`)) document.getElementById(`planSave${m}`).innerText = disc > 0 ? `SAVE ₹${disc}` : "SPECIAL OFFER";
    });
}

window.selectSubscriptionPlan = function(months) {
    selectedPlanMonths = months;
    [3, 6, 12].forEach(m => {
        const card = document.getElementById(`planCard${m}`);
        if (card) {
            if (m === months) card.classList.add('selected');
            else card.classList.remove('selected');
        }
    });

    const plan = subscriptionPlans[months];
    const discount = Math.max(0, plan.mrp - plan.price);

    document.getElementById('selPlanLabel').innerText = plan.label;
    document.getElementById('selPlanMrp').innerText = plan.mrp;
    document.getElementById('selPlanDiscount').innerText = discount;
    document.getElementById('selPlanFinal').innerText = plan.price;
    document.getElementById('payBtnAmount').innerText = plan.price;
}

window.openPaymentModal = function() {
    if (!isLoggedIn) {
        alert("Please login or register first to choose a subscription plan!");
        return showLogin();
    }
    syncSubscriptionPlansFromSettings();
    selectSubscriptionPlan(12);
    document.getElementById('paymentModal').classList.remove('hide');
}

window.closeModal = function() { document.getElementById('paymentModal').classList.add('hide'); }

window.initiateRazorpayPayment = function() {
    if (!isLoggedIn) return showLogin();
    if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === "rzp_test_YOUR_KEY_HERE") {
        return alert("Razorpay Key ID is not configured yet in student-app.js!");
    }

    const plan = subscriptionPlans[selectedPlanMonths];
    const discountAmount = Math.max(0, plan.mrp - plan.price);

    const options = {
        "key": RAZORPAY_KEY_ID,
        "amount": Math.round(plan.price * 100),
        "currency": "INR",
        "name": "TaiyariGhar",
        "description": `${plan.label} (MRP ₹${plan.mrp} - Discount ₹${discountAmount})`,
        "image": "logo.png",
        "handler": async function (response) {
            closeModal();
            await handleSuccessfulRazorpayPayment(response.razorpay_payment_id, plan);
        },
        "prefill": {
            "name": currentStudent.name,
            "email": currentStudent.email,
            "contact": currentStudent.mobile
        },
        "notes": {
            "loginId": currentStudent.loginId,
            "plan": plan.label,
            "mrp": plan.mrp,
            "discount": discountAmount,
            "finalPaid": plan.price
        },
        "theme": {
            "color": "#4F46E5"
        }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
        alert("❌ Payment Failed: " + response.error.description);
    });
    rzp.open();
}

async function handleSuccessfulRazorpayPayment(paymentId, plan) {
    try {
        const today = new Date();
        const expiryDateObj = new Date(today.getTime() + plan.days * 24 * 60 * 60 * 1000);
        const expiryStr = expiryDateObj.toISOString().split('T')[0];
        const invoiceNumber = "INV-" + Date.now().toString().slice(-6);
        const discountAmount = Math.max(0, plan.mrp - plan.price);

        if (currentStudent.docId) {
            await updateDoc(doc(db, "students", currentStudent.docId), {
                isPaid: true,
                expiryDate: expiryStr,
                activePlan: plan.label,
                lastPaymentId: paymentId,
                lastPaymentDate: today.toISOString()
            });
        }

        await addDoc(collection(db, "payments"), {
            invoiceNumber: invoiceNumber,
            paymentId: paymentId,
            loginId: currentStudent.loginId,
            studentName: currentStudent.name,
            email: currentStudent.email,
            mobile: currentStudent.mobile,
            planName: plan.label,
            mrp: plan.mrp,
            discount: discountAmount,
            amount: plan.price,
            validityDays: plan.days,
            expiryDate: expiryStr,
            timestamp: today.toISOString()
        });

        currentStudent.isPaid = true;
        currentStudent.expiry = expiryStr;
        localStorage.setItem('tg_user', JSON.stringify(currentStudent));

        callEmailService({
            action: "send_invoice",
            invoiceNumber: invoiceNumber,
            paymentId: paymentId,
            studentName: currentStudent.name,
            loginId: currentStudent.loginId,
            email: currentStudent.email,
            mobile: currentStudent.mobile,
            planName: plan.label,
            mrp: plan.mrp,
            discount: discountAmount,
            amount: plan.price,
            validityDays: plan.days,
            expiryDate: expiryStr,
            date: today.toLocaleDateString('en-IN'),
            gstEnabled: appSettings.GST_Enabled || "No",
            gstNumber: appSettings.GST_Number || ""
        });

        alert(`🎉 Payment Successful!\n\nYour ${plan.label} is now ACTIVE till ${expiryStr}.\nAn official PDF Invoice (${invoiceNumber}) has been sent to ${currentStudent.email}.`);
        renderCandidateProfilePopover();
        fetchSettingsAndTests();
    } catch (e) {
        console.error("Post-payment error:", e);
        alert("Payment received (ID: " + paymentId + "), but there was a delay updating your profile.");
    }
}

function isLiveTestCurrentlyActive(t) {
    if (String(t.isLive).trim().toLowerCase() !== "yes") return false;
    const now = new Date();
    const start = t.liveStart ? new Date(t.liveStart) : null;
    const end = t.liveEnd ? new Date(t.liveEnd) : null;
    if (!start || !end) return false;
    return now >= start && now <= end;
}

function isLiveTestEnded(t) {
    if (String(t.isLive).trim().toLowerCase() !== "yes") return false;
    const now = new Date();
    const end = t.liveEnd ? new Date(t.liveEnd) : null;
    return end ? now > end : false;
}

function formatDateTimeReadable(isoStr) {
    if (!isoStr) return "12:00 AM";
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function renderLiveTestsShowcase() {
    const activeLiveTests = allTests.filter(t => isLiveTestCurrentlyActive(t));
    const homeContainer = document.getElementById('homeLiveTestsContainer');
    const dashContainer = document.getElementById('dashLiveTestsContainer');
    const modalContainer = document.getElementById('modalLiveTestsContainer');
    const liveBadgeEl = document.getElementById('liveCountBadge');

    if (liveBadgeEl) liveBadgeEl.innerText = activeLiveTests.length;

    if (activeLiveTests.length === 0) {
        if (homeContainer) homeContainer.innerHTML = "";
        if (dashContainer) dashContainer.innerHTML = "";
        if (modalContainer) {
            modalContainer.innerHTML = `<div style="text-align:center; padding:30px; background:#F8FAFC; border-radius:12px;"><p style="color:#6B7280; font-size:15px;">No All-India Live Exams are running at this moment. Check back soon or attempt regular mock tests!</p></div>`;
        }
        return;
    }

    let cardsHtml = `<h2 class="section-title" style="display:flex; align-items:center; gap:8px;"><span class="live-dot-nav"></span> All-India Live Exams (Happening Now)</h2><div class="live-showcase-grid">`;
    let modalGridHtml = `<div class="live-showcase-grid">`;

    activeLiveTests.forEach(t => {
        const alreadyAttempted = userPastResults[t.id] !== undefined;
        let actionBtnHtml = "";

        if (!isLoggedIn) {
            actionBtnHtml = `<button class="btn" style="background:#FDE047; color:#1E1B4B; font-weight:700;" onclick="closeLiveTestsHub(); showLogin()">Login to Attempt Live Exam</button>`;
        } else if (!currentStudent.isPaid) {
            actionBtnHtml = `<button class="btn" style="background:#FDE047; color:#1E1B4B; font-weight:700;" onclick="closeLiveTestsHub(); openPaymentModal()">🔒 Subscribe to Enter Live Exam</button>`;
        } else if (alreadyAttempted) {
            actionBtnHtml = `<button class="btn" style="background:rgba(255,255,255,0.2); color:#FFF; cursor:default;">✅ Submitted (Result at ${formatDateTimeReadable(t.liveEnd)})</button>`;
        } else {
            actionBtnHtml = `<button class="btn btn-accent" style="font-weight:700;" onclick="closeLiveTestsHub(); showInstructions('${t.id}', '${t.testName.replace(/'/g, "\\'")}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', false, true, '${t.liveEnd || ''}', ${t.positiveMark || 1})">🚀 Attempt Live Exam Now</button>`;
        }

        const singleCard = `
            <div class="live-card">
                <div>
                    <div class="live-badge-pill"><span class="live-dot-nav" style="background:white;"></span> ${t.mainCat} • LIVE</div>
                    <h3>${t.testName}</h3>
                    <p>${t.subCat} | ⏱️ ${t.duration} Mins | 🏆 ${t.marks} Marks</p>
                </div>
                <div class="live-timer-strip">
                    <span>⏳ Ends: ${formatDateTimeReadable(t.liveEnd)}</span>
                    <span class="live-countdown-clock" data-endtime="${t.liveEnd}">Active</span>
                </div>
                ${actionBtnHtml}
            </div>
        `;
        cardsHtml += singleCard;
        modalGridHtml += singleCard;
    });

    cardsHtml += `</div>`;
    modalGridHtml += `</div>`;

    if (homeContainer) homeContainer.innerHTML = cardsHtml;
    if (dashContainer) dashContainer.innerHTML = cardsHtml;
    if (modalContainer) modalContainer.innerHTML = modalGridHtml;

    startLiveShowcaseCountdowns();
}

function startLiveShowcaseCountdowns() {
    clearInterval(liveCountdownInterval);
    liveCountdownInterval = setInterval(() => {
        document.querySelectorAll('.live-countdown-clock').forEach(el => {
            const endStr = el.getAttribute('data-endtime');
            if (!endStr) return;
            const diff = new Date(endStr) - new Date();
            if (diff <= 0) {
                el.innerText = "Ended";
            } else {
                const hrs = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                el.innerText = `${hrs}h ${mins}m ${secs}s left`;
            }
        });
    }, 1000);
}

// =========================================================================
// ⚡ CROSS-EXAM QUICK PRACTICE BY TEST TYPE (Previous Year, Full, Mini, Chapter)
// =========================================================================
window.openCrossExamTypeFilter = function(typeKey) {
    if(!isLoggedIn) return showLogin();

    const titleMap = {
        'previous': '📋 All Previous Year Papers (Across All Exams)',
        'full': '✅ All Full-Length Mock Tests (Across All Exams)',
        'mini': '⚡ Mini & Speed Booster Tests (Across All Exams)',
        'chapter': '📚 Chapter & Topic-Wise Tests (Across All Exams)'
    };

    const filteredTests = allTests.filter(t => {
        const eName = (t.examName || "").toLowerCase();
        const tName = (t.testName || "").toLowerCase();
        if (typeKey === 'previous') {
            return eName.includes('previous') || eName.includes('pyp') || eName.includes('memory') || tName.includes('pyp') || tName.includes('previous');
        } else if (typeKey === 'full') {
            return eName.includes('full') || tName.includes('full');
        } else if (typeKey === 'mini') {
            return eName.includes('mini') || eName.includes('speed') || tName.includes('mini') || tName.includes('speed');
        } else if (typeKey === 'chapter') {
            return eName.includes('chapter') || eName.includes('topic') || eName.includes('ncert') || tName.includes('chapter') || tName.includes('topic');
        }
        return false;
    });

    document.getElementById('subCatTitle').innerText = titleMap[typeKey] || "Filtered Mock Tests";
    document.getElementById('subCatPills').innerHTML = `
        <div class="sub-cat-pill ${typeKey === 'previous' ? 'active' : ''}" onclick="openCrossExamTypeFilter('previous')">📋 Previous Year Papers</div>
        <div class="sub-cat-pill ${typeKey === 'full' ? 'active' : ''}" onclick="openCrossExamTypeFilter('full')">✅ Full-Length Mocks</div>
        <div class="sub-cat-pill ${typeKey === 'mini' ? 'active' : ''}" onclick="openCrossExamTypeFilter('mini')">⚡ Mini / Speed Tests</div>
        <div class="sub-cat-pill ${typeKey === 'chapter' ? 'active' : ''}" onclick="openCrossExamTypeFilter('chapter')">📚 Chapter / Topic Tests</div>
    `;
    document.getElementById('examNamePills').innerHTML = "";
    renderTestList(filteredTests, true);
    showScreen('subCatScreen', true);
};

async function fetchSettingsAndTests() {
    try {
        const setSnap = await getDoc(doc(db, "settings", "global"));
        if(setSnap.exists()) appSettings = setSnap.data();
        else appSettings = { Plan3_MRP: "149", Plan3_Price: "99", Plan6_MRP: "249", Plan6_Price: "199", Plan12_MRP: "399", Plan12_Price: "249", GST_Enabled: "No", GST_Number: "" };

        syncSubscriptionPlansFromSettings();

        const testSnap = await getDocs(collection(db, "tests"));
        allTests = testSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const catSnap = await getDocs(collection(db, "exam_categories"));
        allExamCategories = catSnap.docs.map(d => d.data());

        if(isLoggedIn && currentStudent.loginId) {
            const resSnap = await getDocs(query(collection(db, "results"), where("loginId", "==", currentStudent.loginId)));
            userPastResults = {};
            resSnap.forEach(docItem => {
                let data = docItem.data();
                if(data.loginId && data.loginId === currentStudent.loginId) {
                    if(!userPastResults[data.testId] || new Date(data.timestamp) > new Date(userPastResults[data.testId].timestamp)) {
                        userPastResults[data.testId] = data;
                    }
                }
            });
        } else {
            userPastResults = {};
        }

        renderLiveTestsShowcase();
        renderMainCategories();

        const caSnap = await getDocs(collection(db, "current_affairs"));
        allCA = caSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        checkUrlRouting();
    } catch (e) { console.log("Data load error", e); }
}

async function fetchDashboardData() {
    try {
        const qRes = query(collection(db, "results"), where("loginId", "==", currentStudent.loginId));
        const resSnap = await getDocs(qRes);
        let lastTest = null, attemptedTestIds = [];
        let results = [];

        if(!resSnap.empty) {
            results = resSnap.docs.map(d => d.data()).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            attemptedTestIds = results.map(r => r.testId);
            lastTest = results.find(r => !r.isLivePending || (r.liveEndTime && new Date() > new Date(r.liveEndTime)));
        }

        const totalAttEl = document.getElementById('totalAttemptedCount');
        if (totalAttEl) totalAttEl.innerText = `${results.length} Test${results.length === 1 ? '' : 's'}`;

        if(lastTest) {
            document.getElementById('recentTestName').innerText = lastTest.testName;
            document.getElementById('recentTestScore').innerText = `Score: ${lastTest.finalScore}/${lastTest.totalMarks} (${lastTest.percent}%)`;
        } else {
            document.getElementById('recentTestName').innerText = "Not Attempted Yet";
            document.getElementById('recentTestScore').innerText = "Take a test to see your score";
        }

        const historyContainer = document.getElementById('dashHistoryContainer');
        if (results.length === 0) {
            historyContainer.innerHTML = `<div class="history-item"><span style="color:#6B7280; font-size:14px;">You haven't attempted any tests yet. Select an exam category above to start!</span></div>`;
        } else {
            let histHtml = "";
            results.forEach(r => {
                const isStillPending = r.isLivePending && r.liveEndTime && (new Date() <= new Date(r.liveEndTime));
                if (isStillPending) {
                    histHtml += `
                        <div class="history-item" style="border-left: 4px solid #F59E0B;">
                            <div>
                                <span style="background:#FEF3C7; color:#92400E; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">⏳ LIVE RESULT PENDING</span>
                                <h4 style="font-size:15px; color:#1E1B4B; margin-top:4px;">${r.testName}</h4>
                                <p style="font-size:12px; color:#6B7280;">Attempted on ${new Date(r.timestamp).toLocaleDateString()} • Result releases at ${formatDateTimeReadable(r.liveEndTime)}</p>
                            </div>
                            <span style="font-size:13px; font-weight:600; color:#D97706;">Locked till release</span>
                        </div>`;
                } else {
                    histHtml += `
                        <div class="history-item" style="border-left: 4px solid var(--accent);">
                            <div>
                                <h4 style="font-size:15px; color:#1E1B4B;">${r.testName}</h4>
                                <p style="font-size:12px; color:#6B7280;">Date: ${new Date(r.timestamp).toLocaleDateString()} | Score: <b style="color:var(--primary);">${r.finalScore}/${r.totalMarks}</b> (${r.percent}%)</p>
                            </div>
                            <button class="btn btn-outline" style="padding:6px 14px; font-size:12px;" onclick="viewPastAnalysis('${r.testId}')">📊 View Result & Rank</button>
                        </div>`;
                }
            });
            historyContainer.innerHTML = histHtml;
        }

        let recTest = allTests.find(t => !attemptedTestIds.includes(t.id) && !isLiveTestCurrentlyActive(t));
        if(!recTest && allTests.length > 0) recTest = allTests.find(t => !isLiveTestCurrentlyActive(t)) || allTests[0];

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
    if(recommendedTestData) {
        const isLocked = (String(recommendedTestData.isFree).trim().toLowerCase() !== "yes" && !currentStudent.isPaid);
        if (isLocked) return openPaymentModal();
        showInstructions(recommendedTestData.id, recommendedTestData.testName, recommendedTestData.duration, recommendedTestData.marks, recommendedTestData.negativeMark || 0, recommendedTestData.hasNegative, recommendedTestData.language || 'Both', false, false, '', recommendedTestData.positiveMark || 1);
    } else scrollToCategories(); 
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
        renderTestList(filteredTests, false);
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
    renderTestList(filteredTests, false);
}

function renderTestList(filtered, showExamBadge = false) {
    let html = "";
    if(filtered.length === 0) html = `<p style="text-align:center; color:#666; padding:20px;">No tests uploaded in this section yet. Please check back soon!</p>`;
    else {
        filtered.forEach(t => {
            const currentlyLive = isLiveTestCurrentlyActive(t);
            const isLocked = (currentlyLive || String(t.isFree).trim().toLowerCase() !== "yes") && !currentStudent.isPaid;
            const pastRes = userPastResults[t.id];
            const inProgressData = !currentlyLive ? localStorage.getItem('tg_resume_' + t.id) : null;
            
            let btnHtml = "";
            let examCategoryBadge = showExamBadge ? `<span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:700; padding:2px 8px; border-radius:8px; margin-right:6px;">${t.mainCat} • ${t.subCat}</span>` : "";
            let badgeTag = currentlyLive ? `<span style="background:#FEE2E2; color:#DC2626; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; margin-left:6px;">🔴 LIVE NOW</span>` : (isLiveTestEnded(t) ? `<span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; margin-left:6px;">Archived Live Test</span>` : "");

            if(isLocked) {
                btnHtml = `<button class="btn" style="background:#F3F4F6; color:#6B7280; border:1px solid #E5E7EB;" onclick="openPaymentModal()">🔒 Unlock</button>`;
            } else if (currentlyLive && pastRes) {
                btnHtml = `<span style="font-size:12px; font-weight:600; color:#D97706;">⏳ Result releases at ${formatDateTimeReadable(t.liveEnd)}</span>`;
            } else {
                if(inProgressData) {
                    btnHtml = `<div style="display:flex; gap:10px;"><button class="btn btn-primary" onclick="showInstructions('${t.id}', '${t.testName.replace(/'/g, "\\'")}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', true, false, '', ${t.positiveMark || 1})">▶ Resume</button><button class="btn btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="clearResumeData('${t.id}', '${t.examName}')">Clear</button></div>`;
                } else {
                    btnHtml = `<button class="btn btn-accent" onclick="showInstructions('${t.id}', '${t.testName.replace(/'/g, "\\'")}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', false, ${currentlyLive}, '${t.liveEnd || ''}', ${t.positiveMark || 1})">${currentlyLive ? '🚀 Start Live Test' : 'Start Test'}</button>`;
                }
                
                if(pastRes && !(pastRes.isLivePending && pastRes.liveEndTime && new Date() <= new Date(pastRes.liveEndTime))) {
                    btnHtml += `<button class="btn" style="background:#4F46E5; color:white; margin-left:10px;" onclick="viewPastAnalysis('${t.id}')">📊 Analysis</button>`;
                }
            }

            let posMarkText = t.positiveMark || 1;
            let negMarkText = t.hasNegative === "Yes" ? `-${t.negativeMark}` : "No Neg";

            html += `<div class="test-item ${isLocked ? 'locked' : ''}">
                <div>
                    ${examCategoryBadge}
                    <h3 style="color: var(--primary); margin-bottom: 5px; margin-top:4px; font-size:16px;">${t.testName} ${badgeTag}</h3>
                    <p style="font-size: 13px; color: #666;">⏱️ ${t.duration} Mins | ${t.marks} Marks | +${posMarkText} / ${negMarkText} | Lang: ${t.language || 'Both'}</p>
                </div>
                <div style="display:flex; align-items:center;">${btnHtml}</div>
            </div>`;
        });
    }
    document.getElementById('testListContainer').innerHTML = html;
}

window.clearResumeData = function(testId, examName) {
    if(confirm("Are you sure? Your progress will be lost.")) {
        localStorage.removeItem('tg_resume_' + testId);
        const activeCard = document.querySelector('.exam-name-card.active');
        if (activeCard) loadTestsForExamName(nav.examName, activeCard);
        else goDashboard();
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
            q.options.forEach((opt, i) => { if(opt && opt.trim() !== "") qHtml += `<label class="ca-option" onclick="checkCAAnswer('${q.id}', ${i}, ${q.correctAnswer}, '${type}', '${(q.explanation || '').replace(/'/g, "\\'")}')">${String.fromCharCode(65+i)}) ${opt}</label>`; });
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

function handleVisibilityChange() {
    if (document.hidden && currentScreen === 'testScreen' && !isTestSubmitting) {
        handleAntiCheatViolation("Tab switching or minimizing the browser window is strictly prohibited!");
    }
}

function handleWindowBlur() {
    if (currentScreen === 'testScreen' && !isTestSubmitting && isCurrentTestLive) {
        handleAntiCheatViolation("Focus lost! Do not switch apps or open floating windows during Live Exam.");
    }
}

function handleFullScreenChange() {
    if (!document.fullscreenElement && currentScreen === 'testScreen' && !isTestSubmitting && isCurrentTestLive) {
        handleAntiCheatViolation("You exited Full-Screen mode! Live Exam must be taken in Full-Screen.");
    }
}

function handleContextMenu(e) {
    if (currentScreen === 'testScreen') e.preventDefault();
}

function handleKeyDownAntiCheat(e) {
    if (currentScreen !== 'testScreen') return;
    if (e.key === 'PrintScreen' || (e.ctrlKey && ['c','v','u','s','p','a'].includes(e.key.toLowerCase())) || e.key === 'F12') {
        e.preventDefault();
        if (e.key === 'PrintScreen') {
            document.body.style.filter = "blur(15px)";
            setTimeout(() => { document.body.style.filter = "none"; }, 2000);
            alert("⚠️ Screenshot shortcut detected! This attempt is watermarked with your ID.");
        }
    }
}

function handleBeforeUnload(e) {
    if (currentScreen === 'testScreen' && !isTestSubmitting) {
        e.preventDefault();
        e.returnValue = '';
    }
}

function enableAntiCheating() {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDownAntiCheat);
    window.addEventListener("beforeunload", handleBeforeUnload);
}

function disableAntiCheating() {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleWindowBlur);
    document.removeEventListener("fullscreenchange", handleFullScreenChange);
    document.removeEventListener("contextmenu", handleContextMenu);
    document.removeEventListener("keydown", handleKeyDownAntiCheat);
    window.removeEventListener("beforeunload", handleBeforeUnload);
}

function handleAntiCheatViolation(reason) {
    if (isTestSubmitting) return;
    tabSwitchWarnings++;
    const badge = document.getElementById('warningCounterBadge');
    if (badge) {
        badge.classList.remove('hide');
        badge.innerText = `Warnings: ${tabSwitchWarnings}/3`;
    }

    if (tabSwitchWarnings >= 3) {
        alert(`🚨 FINAL WARNING (3/3): ${reason}\n\nYour test is being auto-submitted immediately due to exam rule violations.`);
        finalSubmitTest();
    } else {
        alert(`⚠️ EXAM WARNING (${tabSwitchWarnings}/3): ${reason}\n\nPlease stay on the test screen. On the 3rd warning, your test will be automatically submitted!`);
        try {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        } catch(e) {}
    }
}

window.showInstructions = function(id, name, duration, marks, negMark, hasNeg, lang, isResume = false, isLive = false, liveEnd = "", posMark = 1) {
    pendingTestDetails = { id, name, duration, marks, negMark, hasNeg, lang, isResume, isLive, liveEnd, posMark };
    
    document.getElementById('instTestName').innerText = name;
    document.getElementById('instDuration').innerText = duration;
    document.getElementById('instDuration2').innerText = duration;
    document.getElementById('instMarks').innerText = marks;

    const posEl = document.getElementById('instPosRule');
    if (posEl) posEl.innerText = `You will be awarded +${posMark} mark(s) for each correct answer.`;
    
    if(hasNeg === "Yes") {
        document.getElementById('instNegRule').innerText = `There is negative marking: ${negMark} mark(s) will be deducted for each wrong answer.`;
        document.getElementById('instNegRule').style.color = "var(--danger)";
    } else {
        document.getElementById('instNegRule').innerText = "There is NO negative marking for wrong answers.";
        document.getElementById('instNegRule').style.color = "var(--accent)";
    }

    const liveBadge = document.getElementById('instLiveBadge');
    const acBox = document.getElementById('instAntiCheatBox');
    if (isLive) {
        liveBadge.classList.remove('hide');
        acBox.classList.remove('hide');
        document.getElementById('instLiveEndTime').innerText = formatDateTimeReadable(liveEnd);
    } else {
        liveBadge.classList.add('hide');
        acBox.classList.add('hide');
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
    
    try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    } catch(e) {}

    initTest(
        pendingTestDetails.id, 
        pendingTestDetails.name, 
        pendingTestDetails.duration, 
        pendingTestDetails.marks, 
        pendingTestDetails.negMark, 
        pendingTestDetails.hasNeg, 
        selectedLang, 
        pendingTestDetails.isResume,
        pendingTestDetails.isLive,
        pendingTestDetails.liveEnd,
        pendingTestDetails.posMark
    );
}

async function initTest(testId, testName, duration, marks, negMark, hasNeg, lang, isResume, isLive = false, liveEnd = "", posMark = 1) {
    isTestSubmitting = false;
    tabSwitchWarnings = 0;
    isCurrentTestLive = isLive;
    currentLiveEndTime = liveEnd;

    showScreen('testScreen');
    
    currentTestId = testId; 
    currentTestName = testName; 
    currentTestMarks = marks; 
    currentTestPosMark = Number(posMark) || 1;
    currentTestNegMark = hasNeg === "Yes" ? Number(negMark) : 0;
    currentTestLanguage = lang;

    const wm = document.getElementById('antiCheatWatermark');
    if (wm) wm.innerText = `${currentStudent.name} | ${currentStudent.loginId} | ${currentStudent.email || currentStudent.mobile}`;

    const liveTag = document.getElementById('testLiveTag');
    const warnBadge = document.getElementById('warningCounterBadge');
    if (isLive) {
        liveTag.classList.remove('hide');
        warnBadge.classList.remove('hide');
        warnBadge.innerText = "Warnings: 0/3";
    } else {
        liveTag.classList.add('hide');
        warnBadge.classList.add('hide');
    }

    document.getElementById('examHeaderName').innerText = testName;
    document.getElementById('paletteName').innerText = currentStudent.name;
    document.getElementById('paletteId').innerText = currentStudent.loginId;
    document.getElementById('paletteAvatar').innerText = currentStudent.name.charAt(0).toUpperCase();
    document.getElementById('questionText').innerText = "Loading Questions...";
    
    try {
        const q = query(collection(db, "questions"), where("testId", "==", testId));
        const qSnap = await getDocs(q);
        
        if(!qSnap.empty) {
            let resumeData = !isLive ? localStorage.getItem('tg_resume_' + testId) : null;
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
                    
                    let qPos = (qData.questionMarks !== undefined && Number(qData.questionMarks) > 0) ? Number(qData.questionMarks) : currentTestPosMark;
                    let qNeg = (qData.questionNeg !== undefined && Number(qData.questionNeg) > 0) ? Number(qData.questionNeg) : currentTestNegMark;

                    return { 
                        qH: qData.questionHindi || qData.question, 
                        qE: qData.questionEnglish, 
                        uniqueId: qData.uniqueId || "N/A", 
                        opts: optsArray, 
                        ans: newAnsIndex, 
                        exp: qData.explanation || "No explanation provided.", 
                        marks: qPos, 
                        neg: qNeg 
                    };
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
    if (!isCurrentTestLive) {
        localStorage.setItem('tg_resume_' + currentTestId, JSON.stringify({ testQuestions, userAnswers, markedForReview, visitedQuestions, timeLeft, currentQIndex }));
    }
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
    
    document.getElementById('markPositive').innerText = q.marks || currentTestPosMark;
    if (q.neg > 0) {
        document.getElementById('negBadge').style.display = 'inline-block';
        document.getElementById('markNegative').innerText = q.neg;
    } else {
        document.getElementById('negBadge').style.display = 'none';
    }

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
window.toggleFullScreen = function() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); else if (document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }

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
    isTestSubmitting = true;
    closeSubmitModal(); 
    clearInterval(timerInterval); 
    localStorage.removeItem('tg_resume_' + currentTestId); 

    if (document.fullscreenElement) {
        try { document.exitFullscreen().catch(() => {}); } catch(e) {}
    }
    
    let score = 0, correctCount = 0, wrongCount = 0, skippedCount = 0, negDeducted = 0;
    testQuestions.forEach((q, i) => {
        const qPos = Number(q.marks) || currentTestPosMark;
        const qNeg = Number(q.neg) || 0;
        if(userAnswers[i] === q.ans) { 
            correctCount++; 
            score += qPos; 
        } else if(userAnswers[i] !== undefined) { 
            wrongCount++; 
            negDeducted += qNeg; 
        } else {
            skippedCount++;
        }
    });
    score = score - negDeducted;
    let percent = (score / currentTestMarks) * 100; if(percent < 0) percent = 0;
    const percentStr = percent.toFixed(1);

    try {
        await addDoc(collection(db, "results"), {
            timestamp: new Date().toISOString(), 
            loginId: currentStudent.loginId, 
            studentName: currentStudent.name,
            studentEmail: currentStudent.email || "",
            testId: currentTestId, 
            testName: currentTestName, 
            correctCount, 
            wrongCount, 
            negDeducted: negDeducted.toFixed(2), 
            finalScore: score.toFixed(2), 
            totalMarks: currentTestMarks, 
            percent: percentStr, 
            isLivePending: isCurrentTestLive,
            liveEndTime: currentLiveEndTime || "",
            emailResultSent: false,
            userAnswers, 
            testQuestionsState: testQuestions 
        });

        await fetchSettingsAndTests();

        if (isCurrentTestLive) {
            showScreen('liveSubmittedScreen');
            document.getElementById('liveReleaseTimeDisplay').innerText = formatDateTimeReadable(currentLiveEndTime);
            document.getElementById('liveUserEmailDisplay').innerText = currentStudent.email || "your registered email";
            return;
        }

        showScreen('resultScreen');
        document.getElementById('resTestName').innerText = currentTestName;
        document.getElementById('finalScore').innerText = score.toFixed(2); 
        document.getElementById('totalScore').innerText = currentTestMarks;
        document.getElementById('statCorrect').innerText = correctCount;
        document.getElementById('statWrong').innerText = wrongCount;
        document.getElementById('statSkipped').innerText = skippedCount;
        document.getElementById('statNeg').innerText = negDeducted.toFixed(2);
        document.getElementById('scoreCircle').style.background = `conic-gradient(var(--accent) ${percent}%, #E5E7EB ${percent}%)`;
        document.getElementById('rankText').innerText = "Calculating Rank...";

        const rankSnap = await getDocs(query(collection(db, "results"), where("testId", "==", currentTestId)));
        let allResults = rankSnap.docs.map(d => d.data()).sort((a, b) => parseFloat(b.finalScore) - parseFloat(a.finalScore));
        let userRank = 1;
        allResults.forEach((r, index) => { if(r.loginId === currentStudent.loginId && r.finalScore === score.toFixed(2)) userRank = index + 1; });

        document.getElementById('rankText').innerText = `Your Rank: ${userRank} out of ${allResults.length} students`;
        currentResultData = { score: score.toFixed(2), total: currentTestMarks, rank: userRank, totalStudents: allResults.length, correct: correctCount, wrong: wrongCount, neg: negDeducted.toFixed(2), percent: percentStr };
    } catch(e) { console.error(e); alert("Error saving result: " + e.message); }
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

        html += `<div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 5px solid ${isCorrect ? 'var(--accent)' : (uAns !== undefined ? 'var(--danger)' : 'var(--grey)')};"><div style="font-size: 12px; color: #6B7280; margin-bottom: 5px;">Q-ID: ${q.uniqueId} | Marks: +${q.marks} / -${q.neg}</div><div style="font-weight: 600; font-size: 16px; margin-bottom: 15px;">Q${i+1}. ${qHtml}</div>`;
        
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

window.viewPastAnalysis = async function(testId) {
    let res = userPastResults[testId];
    if(!res) return alert("Result not found!");

    if (res.isLivePending && res.liveEndTime && new Date() <= new Date(res.liveEndTime)) {
        return alert(`⏳ Live Test results are locked until ${formatDateTimeReadable(res.liveEndTime)}.`);
    }
    
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
    document.getElementById('rankText').innerText = "Calculating All-India Rank...";

    try {
        const rankSnap = await getDocs(query(collection(db, "results"), where("testId", "==", testId)));
        let allResults = rankSnap.docs.map(d => d.data()).sort((a, b) => parseFloat(b.finalScore) - parseFloat(a.finalScore));
        let userRank = 1;
        allResults.forEach((r, index) => { if(r.loginId === currentStudent.loginId) userRank = index + 1; });
        document.getElementById('rankText').innerText = `All-India Rank: ${userRank} out of ${allResults.length} students`;
        currentResultData = { score: res.finalScore, total: res.totalMarks, rank: userRank, totalStudents: allResults.length, correct: res.correctCount, wrong: res.wrongCount, neg: res.negDeducted, percent: res.percent };
    } catch(e) {
        document.getElementById('rankText').innerText = "Previous Attempt Analysis";
        currentResultData = { score: res.finalScore, total: res.totalMarks, rank: '-', totalStudents: '-', correct: res.correctCount, wrong: res.wrongCount, neg: res.negDeducted, percent: res.percent };
    }
}

window.downloadScorecard = function() {
    if(!currentResultData) return alert("No result data available!");
    let html = `<html><head><title>Scorecard - TaiyariGhar</title><style>body{font-family:sans-serif; text-align:center; padding:50px;} h1{color:#4F46E5;} table{margin:20px auto; border-collapse:collapse; width:70%;} th,td{border:1px solid #ddd; padding:12px;} .footer{margin-top:30px; font-size:12px; color:#666;}</style></head><body><h1>🏠 TaiyariGhar</h1><h2>Test Scorecard</h2><table><tr><th>Student Name</th><td>${currentStudent.name}</td></tr><tr><th>Login ID</th><td>${currentStudent.loginId}</td></tr><tr><th>Test Name</th><td>${currentTestName}</td></tr><tr><th>Total Questions</th><td>${testQuestions.length}</td></tr><tr><th>Correct Answers</th><td style="color:green; font-weight:bold;">${currentResultData.correct}</td></tr><tr><th>Wrong Answers</th><td style="color:red; font-weight:bold;">${currentResultData.wrong}</td></tr><tr><th>Negative Deducted</th><td style="color:red;">-${currentResultData.neg}</td></tr><tr><th>Final Score</th><td>${currentResultData.score} / ${currentResultData.total}</td></tr><tr><th>Percentage</th><td>${currentResultData.percent}%</td></tr><tr><th>Rank</th><td>${currentResultData.rank} ${currentResultData.totalStudents !== '-' ? '(out of '+currentResultData.totalStudents+')' : ''}</td></tr></table><div class="footer">मेहनत आपकी, साथ हमारा! | Official Support: support@taiyarighar.in</div></body></html>`;
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW err', err)); });
}

history.replaceState({ screen: 'homeScreen' }, '', '');

window.onload = () => {
    applyLanguage(); 
    let savedUser = localStorage.getItem('tg_user');
    if(savedUser) { 
        currentStudent = JSON.parse(savedUser); isLoggedIn = true; isFirstLoginSession = false; updateHeaderUI(); fetchSettingsAndTests(); 
    } else { fetchSettingsAndTests(); }
};
