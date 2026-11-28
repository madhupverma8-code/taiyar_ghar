import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, setDoc, addDoc, query, where, doc, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =========================================================================
// CONFIGURATION
// =========================================================================
const RAZORPAY_KEY_ID = "rzp_live_Ttffsg1nwh5gBU";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxvoU_mH8BjfE7QdC_UOQyzDfmJsUoVcIvq9Kp3VtXutzYTFRFY0vXpzw6Uv2XAjnng5Q/exec";

const firebaseConfig = {
    apiKey: "AIzaSyA7x6gQziPYlxrXnyVJJ80mvJkh3VCm24",
    authDomain: "taiyarighar.firebaseapp.com",
    projectId: "taiyarighar",
    storageBucket: "taiyarighar.firebasestorage.app",
    messagingSenderId: "329150812714",
    appId: "1:329150812714:web:1f292d05aaba0cb918e953"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allTests = [], appSettings = {}, allCA = [], allExamCategories = [], allJobUpdates = [];
let userPastResults = {};
let isDataLoaded = false;

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
let regOtpCooldownTimer = null;

let forgotGeneratedOtp = "";
let forgotOtpExpiry = 0;
let forgotTargetDocId = "";
let forgotTargetEmail = "";

let testQuestions = [], currentQIndex = 0, userAnswers = {}, markedForReview = {}, visitedQuestions = {}, questionTimeMap = {};
let cbtQuestionTimerInterval = null, cbtCurrentQSeconds = 0;

function flushCurrentCbtQuestionTime() {
    if (testQuestions && testQuestions.length > 0 && currentQIndex >= 0) {
        questionTimeMap[currentQIndex] = (questionTimeMap[currentQIndex] || 0) + cbtCurrentQSeconds;
    }
    cbtCurrentQSeconds = 0;
}

function startCbtQuestionStopwatch() {
    clearInterval(cbtQuestionTimerInterval);
    cbtCurrentQSeconds = 0;
    const prevSec = questionTimeMap[currentQIndex] || 0;
    const el = document.getElementById('cbtQuestionTimer');
    if (el) {
        const m = String(Math.floor(prevSec / 60)).padStart(2, '0');
        const s = String(prevSec % 60).padStart(2, '0');
        el.innerText = `${m}:${s}`;
    }
    cbtQuestionTimerInterval = setInterval(() => {
        cbtCurrentQSeconds++;
        const totalQSec = (questionTimeMap[currentQIndex] || 0) + cbtCurrentQSeconds;
        const badge = document.getElementById('cbtQuestionTimer');
        if (badge) {
            const m = String(Math.floor(totalQSec / 60)).padStart(2, '0');
            const s = String(totalQSec % 60).padStart(2, '0');
            badge.innerText = `${m}:${s}`;
            badge.style.color = totalQSec > 120 ? '#DC2626' : '#3730A3';
        }
    }, 1000);
}
let timerInterval, liveCountdownInterval, timeLeft = 0, totalTime = 0;
let currentTestId = "", currentTestName = "", currentTestMarks = 0, currentTestNegMark = 0, currentTestPosMark = 1, currentTestLanguage = "Both";
let isCurrentTestLive = false, currentLiveEndTime = "";
let tabSwitchWarnings = 0;
let isTestSubmitting = false;
let testStartTimestamp = 0;
let lastWarningTimestamp = 0;

let pendingTestDetails = null;
let currentResultData = null;
let currentScreen = 'homeScreen';

// Unlimited Smart Practice Bank State
let pbMetaIndex = [];
let pbLoadedBundles = {};
let pbCurrentSubject = "";
let pbCurrentMode = "";
let pbCurrentTopic = "";
let pbPoolMode = "unattempted";
let pbActiveQuestions = [];
let pbCurrentIndex = 0;
let pbUserProgress = {
    attemptedMap: {},
    totalAttempted: 0,
    totalCorrect: 0,
    totalTimeSec: 0
};
let pbStreakCount = 0;
let pbSessionCorrect = 0;
let pbSessionWrong = 0;
let pbTimerInterval = null;
let pbQuestionSeconds = 0;
let pbUnsavedWrites = 0;

const defaultMainCategories = [
    { name: "SSC Exams", icon: "🏛️", gradient: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)", subText: "CGL, CHSL, MTS, GD, Stenographer" },
    { name: "Railway Exams", icon: "🚂", gradient: "linear-gradient(135deg, #065F46 0%, #10B981 100%)", subText: "NTPC, Group D, ALP, RPF" },
    { name: "UP State Exams", icon: "🏛️", gradient: "linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)", subText: "PCS, RO/ARO, VDO, BEO" },
    { name: "Banking Exams", icon: "🏦", gradient: "linear-gradient(135deg, #0F766E 0%, #06B6D4 100%)", subText: "IBPS PO, Clerk, SBI PO, SO" },
    { name: "UP Police", icon: "👮", gradient: "linear-gradient(135deg, #312E81 0%, #6366F1 100%)", subText: "Constable, SI (Daroga), Home Guard" },
    { name: "Other Central Exams", icon: "🌍", gradient: "linear-gradient(135deg, #1E293B 0%, #475569 100%)", subText: "IBPS RRB, LIC, Army, Navy" },
    { name: "Other State Exams", icon: "🗺️", gradient: "linear-gradient(135deg, #831843 0%, #DB2777 100%)", subText: "BPSC, UKPSC, JPSC, JSSC" }
];

const translations = {
    "en": {
        "nav_home": "Home", "nav_exams": "Exam Types", "nav_ca": "📰 Current Affairs",
        "nav_updates": "📢 Jobs & Updates", "nav_notes": "📝 Study Notes", "nav_info": "ℹ️ Info",
        "nav_login": "Login", "nav_register": "Register", "nav_dash": "Dashboard",
        "nav_purchase": "My Purchases", "nav_logout": "Logout",
        "hero_badge": "🎯 India's Trusted Exam Preparation Portal",
        "hero_h1": "Crack Your Dream Govt Job with Confidence.",
        "hero_p": "All-in-one mock test platform for SSC, Railway, Police & All State Exams. Latest syllabus, real-time rankings, and unlimited tests in one subscription.",
        "hero_cta_sub": "🚀 Get All-Access Subscription",
        "hero_cta_free": "🌟 Try Free Mock Tests",
        "home_pb_title": "Unlimited Smart Practice Bank",
        "home_pb_desc": "Subject-wise & Mix Practice with bilingual explanations & timer. First 15 questions per subject free!",
        "home_ncert_title": "📘 NCERT Base Question Bank",
        "home_ncert_desc": "Line-by-line NCERT Science, History, Polity, Geography & Economy MCQs for SSC, Railway & PCS.",
        "home_pyq_title": "📋 Subject-Wise Previous Year Questions",
        "home_pyq_desc": "Green highlighted answers, explanations & exam/year tags across Central & State exams.",
        "sec_cats": "🎯 Exam Categories", "ca_h2": "📰 Current Affairs Hub",
        "ca_sub": "Read Complete Daily News Articles & Attempt Topic-Wise CA Practice MCQs",
        "ca_tab_articles": "📖 Full CA Articles", "ca_tab_daily": "📝 Daily CA Practice", "ca_tab_monthly": "📅 Monthly CA Revision",
        "upd_h2": "📢 Govt Jobs, Admit Cards, Results & Exam Syllabus",
        "sn_h2": "📝 Exam Tips, Strategy & Study Notes",
        "btn_explore": "Explore Now", "login_h2": "Candidate Login", "login_btn": "Login to Dashboard",
        "login_new": "New user?", "login_reg": "Register Here", "reg_h2": "Create Candidate Account",
        "reg_btn": "Complete Registration", "dash_h2": "Crack Your Dream Govt Job with Confidence.",
        "dash_qv": "📊 Dashboard Quick View", "qv_explore": "Explore Tests", "qv_browse": "Browse all available tests",
        "qv_view": "View Tests", "qv_rec": "Recommended Next", "qv_loading": "Loading...",
        "qv_start": "Start Now", "qv_recent": "Recent Performance", "qv_not_att": "Not Attempted Yet",
        "qv_take": "Take a test to see your score", "btn_back_cat": "← Back to Dashboard",
        "pay_unlock": "Unlock all premium mock tests & Live All-India Exams for", "pay_close": "Close"
    },
    "hi": {
        "nav_home": "होम", "nav_exams": "परीक्षा प्रकार", "nav_ca": "📰 करंट अफेयर्स",
        "nav_updates": "📢 जॉब्स व अपडेट्स", "nav_notes": "📝 स्टडी नोट्स", "nav_info": "ℹ️ जानकारी",
        "nav_login": "लॉगिन", "nav_register": "रजिस्टर", "nav_dash": "डैशबोर्ड",
        "nav_purchase": "मेरी खरीदारी", "nav_logout": "लॉगआउट",
        "hero_badge": "🎯 भारत का भरोसेमंद सरकारी परीक्षा तैयारी पोर्टल",
        "hero_h1": "TaiyariGhar के साथ पाएं अपनी ड्रीम गवर्नमेंट जॉब।",
        "hero_p": "SSC, रेलवे, पुलिस और सभी राज्य परीक्षाओं के लिए ऑल-इन-वन मॉक टेस्ट प्लेटफॉर्म। नवीनतम सिलेबस, रियल-टाइम रैंकिंग और वन सब्सक्रिप्शन में अनलिमिटेड टेस्ट।",
        "hero_cta_sub": "🚀 ऑल-एक्सेस सब्सक्रिप्शन लें",
        "hero_cta_free": "🌟 फ्री मॉक टेस्ट दें",
        "home_pb_title": "अनलिमिटेड स्मार्ट प्रैक्टिस बैंक",
        "home_pb_desc": "विषय-वार व मिक्स प्रैक्टिस, हिंदी-अंग्रेजी व्याख्या और टाइमर के साथ। हर विषय के पहले 15 प्रश्न बिल्कुल फ्री!",
        "home_ncert_title": "📘 NCERT आधारित प्रश्न बैंक (कक्षा 6–12)",
        "home_ncert_desc": "SSC, रेलवे व PCS के लिए कक्षा 6 से 12 तक के NCERT विज्ञान, इतिहास, राजव्यवस्था व भूगोल के प्रश्न।",
        "home_pyq_title": "📋 विषय-वार पिछले वर्षों के प्रश्न (PYQs)",
        "home_pyq_desc": "बिना लॉगिन के फ्री पढ़ें — हरे रंग में सही उत्तर, व्याख्या और परीक्षा/वर्ष टैग के साथ।",
        "sec_cats": "🎯 परीक्षा श्रेणियाँ", "ca_h2": "📰 करंट अफेयर्स हब",
        "ca_sub": "दैनिक करंट अफेयर्स लेख पढ़ें और टॉपिक-वार प्रैक्टिस प्रश्न हल करें",
        "ca_tab_articles": "📖 पूरे करंट अफेयर्स लेख", "ca_tab_daily": "📝 डेली CA प्रैक्टिस", "ca_tab_monthly": "📅 मंथली CA रिवीजन",
        "upd_h2": "📢 सरकारी नौकरी, एडमिट कार्ड, रिजल्ट व सिलेबस",
        "sn_h2": "📝 परीक्षा रणनीति व स्टडी नोट्स",
        "btn_explore": "अभी देखें", "login_h2": "अभ्यर्थी लॉगिन", "login_btn": "डैशबोर्ड में लॉगिन करें",
        "login_new": "नए उपयोगकर्ता हैं?", "login_reg": "यहाँ रजिस्टर करें", "reg_h2": "नया खाता बनाएँ",
        "reg_btn": "रजिस्ट्रेशन पूरा करें", "dash_h2": "TaiyariGhar के साथ पाएं अपनी ड्रीम गवर्नमेंट जॉब।",
        "dash_qv": "📊 डैशबोर्ड त्वरित दृश्य", "qv_explore": "टेस्ट खोजें", "qv_browse": "सभी उपलब्ध टेस्ट ब्राउज़ करें",
        "qv_view": "टेस्ट देखें", "qv_rec": "अगला सुझाव", "qv_loading": "लोड हो रहा है...",
        "qv_start": "अभी शुरू करें", "qv_recent": "हालिया प्रदर्शन", "qv_not_att": "अभी तक प्रयास नहीं किया",
        "qv_take": "अपना स्कोर देखने के लिए टेस्ट दें", "btn_back_cat": "← डैशबोर्ड पर वापस",
        "pay_unlock": "सभी प्रीमियम मॉक टेस्ट और लाइव ऑल-इंडिया परीक्षाएं अनलॉक करें", "pay_close": "बंद करें"
    }
};

let currentLang = localStorage.getItem('tg_lang') || 'en';

// Processing Overlay Helpers
function showProcessing(title = "Processing, please wait...", sub = "Please do not refresh or close") {
    const ov = document.getElementById('tgProcessingOverlay');
    if (!ov) return;
    document.getElementById('tgProcTitle').innerText = title;
    document.getElementById('tgProcSub').innerText = sub;
    ov.classList.remove('hide');
}

function hideProcessing() {
    const ov = document.getElementById('tgProcessingOverlay');
    if (ov) ov.classList.add('hide');
}

function startOtpButtonCooldown(btnId, defaultLabel = "Send OTP") {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let sec = 30;
    btn.disabled = true;
    btn.innerText = `Resend (${sec}s)`;
    clearInterval(regOtpCooldownTimer);
    regOtpCooldownTimer = setInterval(() => {
        sec--;
        if (sec <= 0) {
            clearInterval(regOtpCooldownTimer);
            btn.disabled = false;
            btn.innerText = defaultLabel;
        } else {
            btn.innerText = `Resend (${sec}s)`;
        }
    }, 1000);
}

function resetSessionMemory() {
    userPastResults = {};
    recommendedTestData = null;
    isDataLoaded = false;
    nav = { mainCat: "", subCat: "", examName: "" };
    pbUserProgress = { attemptedMap: {}, totalAttempted: 0, totalCorrect: 0, totalTimeSec: 0 };
    if (document.getElementById('dashHistoryContainer')) document.getElementById('dashHistoryContainer').innerHTML = '';
    if (document.getElementById('testListContainer')) document.getElementById('testListContainer').innerHTML = '';
    if (document.getElementById('recentTestName')) document.getElementById('recentTestName').innerText = 'Not Attempted Yet';
    if (document.getElementById('recentTestScore')) document.getElementById('recentTestScore').innerText = 'Take a test to see your score';
    if (document.getElementById('totalAttemptedCount')) document.getElementById('totalAttemptedCount').innerText = '0 Tests';
}

async function callEmailService(payload) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
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
// SCREEN NAVIGATION & DYNAMIC URL ROUTING
// =========================================================================
const ALL_SCREENS = [
    'homeScreen', 'pyqHubScreen', 'loginScreen', 'registerScreen', 'forgotPasswordScreen',
    'dashboardScreen', 'practiceBankScreen', 'subCatScreen', 'caScreen', 'updatesScreen', 'studyNotesScreen', 'referEarnScreen', 'instructionsScreen',
    'testScreen', 'liveSubmittedScreen', 'resultScreen', 'solutionsScreen',
    'contactScreen', 'privacyScreen', 'termsScreen', 'refundScreen'
];

function showScreen(screenId, pushHistory = true) {
    ALL_SCREENS.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hide');
    });

    if (screenId !== 'practiceBankScreen') {
        clearInterval(pbTimerInterval);
    }

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

    if (!window._tgNavStack) window._tgNavStack = [];
    if (!window._tgPoppingStep) {
        const topEntry = window._tgNavStack[window._tgNavStack.length - 1];
        if (!topEntry || topEntry.screen !== screenId || topEntry.subview) {
            window._tgNavStack.push({ screen: screenId, subview: null });
        }
    }

    if (pushHistory) {
        const pageMap = {
            'homeScreen': window.location.pathname,
            'contactScreen': '?page=contact',
            'privacyScreen': '?page=privacy',
            'termsScreen': '?page=terms',
            'refundScreen': '?page=refund',
            'loginScreen': '?page=login',
            'registerScreen': '?page=register',
            'forgotPasswordScreen': '?page=reset-password',
            'dashboardScreen': '?page=dashboard',
            'practiceBankScreen': '?page=practice-bank',
            'pyqHubScreen': '?page=pyq',
            'caScreen': '?page=current-affairs',
            'updatesScreen': '?page=updates',
            'studyNotesScreen': '?page=study-notes',
            'referEarnScreen': '?page=refer-earn'
        };
        const nextUrl = pageMap[screenId] || window.location.search;
        try {
            history.pushState({ screen: screenId, stepIdx: window._tgNavStack.length - 1 }, '', nextUrl);
        } catch (e) {}
    }
}

window.openInfoSection = function(sectionId) {
    showScreen(sectionId, true);
};

window.onpopstate = function(event) {
    if (currentScreen === 'testScreen' && !isTestSubmitting && testQuestions.length > 0) {
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

    // Step-to-step back inside open detail drawers / practice levels
    if (currentScreen === 'updatesScreen') {
        const box = document.getElementById('jobDetailReaderBox');
        if (box && !box.classList.contains('hide')) {
            closeJobDetailReader();
            return;
        }
    }
    if (currentScreen === 'caScreen') {
        const reader = document.getElementById('caArticleReaderBox');
        if (reader && !reader.classList.contains('hide')) {
            closeCaArticleReader();
            return;
        }
    }
    if (currentScreen === 'studyNotesScreen') {
        const snBox = document.getElementById('studyNoteReaderBox');
        if (snBox && !snBox.classList.contains('hide')) {
            closeStudyNoteReader();
            return;
        }
    }
    if (currentScreen === 'practiceBankScreen') {
        const arena = document.getElementById('pbLevelArena');
        const modes = document.getElementById('pbLevelModes');
        if (arena && !arena.classList.contains('hide') && pbCurrentSubject) {
            clearInterval(pbTimerInterval);
            flushPracticeProgressToFirestore();
            renderPbSubjectsFromStep();
            return;
        }
        if (modes && !modes.classList.contains('hide')) {
            renderPbSubjects();
            return;
        }
    }

    window._tgPoppingStep = true;
    try {
        if (window._tgNavStack && window._tgNavStack.length > 1) {
            window._tgNavStack.pop();
            const prevStep = window._tgNavStack[window._tgNavStack.length - 1];
            if (prevStep && prevStep.screen) {
                showScreen(prevStep.screen, false);
                return;
            }
        }
        if (event.state && event.state.screen) {
            showScreen(event.state.screen, false);
        } else if (isLoggedIn && currentScreen !== 'dashboardScreen') {
            goDashboard();
        } else if (currentScreen !== 'homeScreen') {
            goHome();
        }
    } finally {
        window._tgPoppingStep = false;
    }
};

function renderPbSubjectsFromStep() {
    document.getElementById('pbLevelArena').classList.add('hide');
    document.getElementById('pbLevelModes').classList.remove('hide');
    document.getElementById('pbLevelSubjects').classList.add('hide');
}

async function checkUrlRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const catSlug = urlParams.get('category');
    const subCatSlug = urlParams.get('subcat');

    if (pageParam) {
        const routeMap = {
            'contact': 'contactScreen',
            'privacy': 'privacyScreen',
            'terms': 'termsScreen',
            'refund': 'refundScreen',
            'login': 'loginScreen',
            'register': 'registerScreen',
            'reset-password': 'forgotPasswordScreen',
            'current-affairs': 'caScreen',
            'updates': 'updatesScreen',
            'study-notes': 'studyNotesScreen',
            'refer-earn': 'referEarnScreen',
            'practice-bank': 'practiceBankScreen',
            'ncert-bank': 'practiceBankScreen',
            'pyq': 'pyqHubScreen',
            'pyqs': 'pyqHubScreen',
            'dashboard': isLoggedIn ? 'dashboardScreen' : 'loginScreen'
        };
        if (routeMap[pageParam]) {
            if (routeMap[pageParam] === 'dashboardScreen') {
                goDashboard();
            } else if (routeMap[pageParam] === 'practiceBankScreen') {
                openSmartPracticeBank(pageParam === 'ncert-bank' ? 'ncert' : 'practice');
            } else if (routeMap[pageParam] === 'pyqHubScreen') {
                const subParam = urlParams.get('subject') || 'All';
                openSubjectPyqHub(subParam);
            } else if (routeMap[pageParam] === 'caScreen') {
                showCurrentAffairs();
            } else if (routeMap[pageParam] === 'updatesScreen') {
                openUpdatesHub();
            } else if (routeMap[pageParam] === 'studyNotesScreen') {
                openStudyNotesHub();
            } else if (routeMap[pageParam] === 'referEarnScreen') {
                openReferAndEarn();
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
    if (header) {
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }
});

window.toggleLanguage = function() {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    localStorage.setItem('tg_lang', currentLang);
    applyLanguage();
    if(isLoggedIn && currentScreen === 'dashboardScreen') { updateWelcomeMessage(isFirstLoginSession); }
    if(currentScreen === 'updatesScreen') {
        const openJobId = document.getElementById('jobDetailReaderBox')?.getAttribute('data-active-job-id');
        if (openJobId && !document.getElementById('jobDetailReaderBox')?.classList.contains('hide')) {
            openJobDetailReader(openJobId);
        } else {
            filterUpdates('All', document.querySelector('.upd-tab.active') || document.querySelector('.upd-tab'));
        }
    }
    if(currentScreen === 'caScreen') {
        const reader = document.getElementById('caArticleReaderBox');
        const activeCaId = reader?.getAttribute('data-active-ca-id');
        if (reader && !reader.classList.contains('hide') && activeCaId) {
            openCaArticleReader(activeCaId);
        } else {
            const activeTab = document.querySelector('.ca-tab.active');
            const tabType = activeTab && activeTab.innerText.includes('Daily') ? 'Daily'
                : (activeTab && activeTab.innerText.includes('Monthly') ? 'Monthly' : 'Articles');
            filterCA(tabType, activeTab || document.querySelector('.ca-tab'));
        }
    }
    if(currentScreen === 'practiceBankScreen' && !document.getElementById('pbLevelArena')?.classList.contains('hide')) {
        renderCurrentPracticeQuestion();
    }
};

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
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    } else { alert(currentLang === 'en' ? "To install, tap browser menu and select 'Add to Home Screen'." : "इंस्टॉल करने के लिए, ब्राउज़र मेनू से 'Add to Home Screen' चुनें।"); }
};

function getDeviceId() {
    try {
        const rawSig = [
            navigator.platform || '',
            navigator.hardwareConcurrency || '',
            screen.width + 'x' + screen.height,
            screen.colorDepth || '',
            Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        ].join('|');
        let hash = 0;
        for (let i = 0; i < rawSig.length; i++) {
            hash = ((hash << 5) - hash) + rawSig.charCodeAt(i);
            hash |= 0;
        }
        const stableId = 'hw_' + Math.abs(hash).toString(36);
        localStorage.setItem('tg_device_id', stableId);
        return stableId;
    } catch (e) {
        let devId = localStorage.getItem('tg_device_id');
        if(!devId) { devId = 'dev_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('tg_device_id', devId); }
        return devId;
    }
}

window.goHome = function() {
    document.title = "TaiyariGhar | Crack Your Dream Govt Job with Confidence";
    window.history.pushState({ screen: 'homeScreen' }, '', window.location.pathname);
    showScreen('homeScreen', false);
    updateHeaderUI();
};

window.goDashboard = async function() {
    if(!isLoggedIn) return showLogin();
    window.history.pushState({ screen: 'dashboardScreen' }, '', '?page=dashboard');
    showScreen('dashboardScreen', false);
    updateHeaderUI();
    renderCandidateProfilePopover();
    updateWelcomeMessage(isFirstLoginSession);
    if (!isDataLoaded) {
        await fetchSettingsAndTests();
    } else {
        await fetchDashboardData();
    }
};

window.showLogin = function() {
    const err = document.getElementById('loginInlineError');
    if (err) { err.classList.add('hide'); err.innerText = ''; }
    showScreen('loginScreen');
};

window.showRegister = function() {
    isRegEmailVerified = false;
    verifiedRegEmail = "";
    document.getElementById('regStep1Box').classList.remove('hide');
    document.getElementById('regOtpBox').classList.add('hide');
    document.getElementById('regPasswordBox').classList.add('hide');
    document.getElementById('regEmail').disabled = false;
    document.getElementById('regEmail').value = "";
    document.getElementById('regOtpInput').value = "";
    const statusEl = document.getElementById('regOtpStatusMsg');
    if (statusEl) statusEl.classList.add('hide');
    document.getElementById('regStepSub').innerText = "Step 1: Verify your Email ID via 6-digit OTP to unlock the registration form.";
    document.getElementById('btnSendRegOtp').disabled = false;
    document.getElementById('btnSendRegOtp').innerText = "Send OTP";
    showScreen('registerScreen');
};

window.showForgotPassword = function() {
    document.getElementById('forgotOtpStepBox').classList.add('hide');
    document.getElementById('forgotEmail').disabled = false;
    showScreen('forgotPasswordScreen');
};

window.logout = function() {
    isLoggedIn = false;
    currentStudent = { docId: "", name: "", email: "", mobile: "", loginId: "", isPaid: false, expiry: "" };
    resetSessionMemory();
    localStorage.removeItem('tg_user');
    closeProfilePopover();
    goHome();
};

// =========================================================================
// PRO LMS PROFILE POPOVER & LIVE TESTS HUB CONTROLS
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

window.openAttemptedHistoryModal = async function() {
    if (!isLoggedIn) return showLogin();
    const modal = document.getElementById('historyModal');
    if (modal) modal.classList.remove('hide');
    await fetchDashboardData();
};

window.closeAttemptedHistoryModal = function() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.classList.add('hide');
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
        badge.innerText = "PRO ALL-ACCESS";
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

    const subMeta = document.getElementById('dashSubMeta');
    if (subMeta && currentStudent.targetExam) {
        subMeta.innerText = `Student ID: ${currentStudent.loginId} • Target: ${currentStudent.targetExam} ${currentStudent.cityState ? '• ' + currentStudent.cityState : ''}`;
    }
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
};

window.scrollToLiveTests = function() {
    openLiveTestsHub();
};

window.showPurchases = function() {
    if(!isLoggedIn) return;
    let status = currentStudent.isPaid ? "PRO All-Access (Active)" : "Free Plan";
    alert(`--- MY SUBSCRIPTION & INVOICES ---\n\nName: ${currentStudent.name}\nLogin ID: ${currentStudent.loginId}\nPlan: ${status}\nValid Till: ${currentStudent.expiry || "N/A"}\n\nNote: Official payment receipts are automatically emailed to ${currentStudent.email}.`);
};

let sessionMonitorInterval = null;

async function finalizeStudentLoginSession(studentDoc) {
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

    let dev1 = studentData.device1 || "";
    let dev2 = studentData.device2 || "";
    const myDev = getDeviceId();

    if (dev1.startsWith("dev_")) dev1 = "";
    if (dev2.startsWith("dev_")) dev2 = "";
    if (dev1 === dev2) dev2 = "";

    if (dev1 === myDev || dev2 === myDev) {
        // Already registered on this physical device
    } else if (!dev1) {
        dev1 = myDev;
    } else if (!dev2) {
        dev2 = myDev;
    } else {
        dev1 = dev2;
        dev2 = myDev;
    }

    const newSessionToken = "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    localStorage.setItem("tg_session_token", newSessionToken);

    await updateDoc(docRef, {
        device1: dev1,
        device2: dev2,
        activeSessionToken: newSessionToken,
        lastLoginAt: new Date().toISOString()
    });

    currentStudent = {
        docId: studentDoc.id,
        name: studentData.name,
        email: studentData.email || "",
        mobile: studentData.mobile || "",
        loginId: studentData.loginId,
        targetExam: studentData.targetExam || "",
        cityState: studentData.cityState || "",
        isPaid: isPaidActive,
        expiry: studentData.expiryDate || "",
        sessionToken: newSessionToken
    };
    isLoggedIn = true;

    let hasLoggedInBefore = localStorage.getItem('tg_has_logged_in_' + studentData.loginId);
    if (!hasLoggedInBefore) {
        isFirstLoginSession = true;
        localStorage.setItem('tg_has_logged_in_' + studentData.loginId, 'true');
    } else {
        isFirstLoginSession = false;
    }

    localStorage.setItem('tg_user', JSON.stringify(currentStudent));
    startSingleSessionWatcher();

    await loadStudentPracticeProgress();
    await fetchSettingsAndTests();

    let pendingCat = sessionStorage.getItem('pendingCat');
    if (pendingCat) {
        sessionStorage.removeItem('pendingCat');
        openCategory(pendingCat);
    } else {
        goDashboard();
    }
}

function startSingleSessionWatcher() {
    clearInterval(sessionMonitorInterval);
    sessionMonitorInterval = setInterval(async () => {
        if (!isLoggedIn || !currentStudent.docId) return;
        const localToken = localStorage.getItem("tg_session_token");
        if (!localToken) return;
        try {
            const snap = await getDoc(doc(db, "students", currentStudent.docId));
            if (snap.exists()) {
                const remoteToken = snap.data().activeSessionToken;
                if (remoteToken && remoteToken !== localToken) {
                    clearInterval(sessionMonitorInterval);
                    alert("⚠️ Aapki ID kisi doosre device par login ho gayi hai. Ek samay mein sirf 1 device par hi session chal sakta hai.");
                    logout();
                }
            }
        } catch (e) {}
    }, 20000);
}

// =========================================================================
// STRICT CANDIDATE LOGIN (Inline Password Error + Processing Overlay)
// =========================================================================
window.doLogin = async function() {
    const inputVal = document.getElementById('loginId').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginInlineError');
    const btn = document.getElementById('btnDoLogin');

    if (errEl) { errEl.classList.add('hide'); errEl.innerText = ''; }

    if (!inputVal || !pass) {
        if (errEl) {
            errEl.innerText = "Please enter your Email/Mobile/Student ID and Password.";
            errEl.classList.remove('hide');
        }
        return;
    }

    if (btn) { btn.disabled = true; btn.innerText = "Logging in... Processing"; }
    showProcessing("Verifying your account...", "Signing in to your TaiyariGhar dashboard");

    resetSessionMemory();

    try {
        // Lookup user strictly by Email, Mobile, or Login ID first
        let snapshot = await getDocs(query(collection(db, "students"), where("email", "==", inputVal.toLowerCase())));
        if (snapshot.empty) snapshot = await getDocs(query(collection(db, "students"), where("mobile", "==", inputVal)));
        if (snapshot.empty) snapshot = await getDocs(query(collection(db, "students"), where("loginId", "==", inputVal.toUpperCase())));

        if (snapshot.empty) {
            hideProcessing();
            if (btn) { btn.disabled = false; btn.innerText = "Login to Dashboard"; }
            if (errEl) {
                errEl.innerText = "Account not found. Check your Email/Mobile/Student ID or register free.";
                errEl.classList.remove('hide');
            }
            return;
        }

        const matchedDoc = snapshot.docs[0];
        const userData = matchedDoc.data();

        // Exact password comparison (never permits wrong password)
        if (String(userData.password) !== String(pass)) {
            hideProcessing();
            if (btn) { btn.disabled = false; btn.innerText = "Login to Dashboard"; }
            if (errEl) {
                errEl.innerText = "Wrong password. Please enter the correct password.";
                errEl.classList.remove('hide');
            }
            return;
        }

        await finalizeStudentLoginSession(matchedDoc);
        hideProcessing();
        if (btn) { btn.disabled = false; btn.innerText = "Login to Dashboard"; }
    } catch (e) {
        console.error(e);
        hideProcessing();
        if (btn) { btn.disabled = false; btn.innerText = "Login to Dashboard"; }
        if (errEl) {
            errEl.innerText = "Login error: " + e.message;
            errEl.classList.remove('hide');
        }
    }
};

// =========================================================================
// CLEAN 2-STEP CANDIDATE REGISTRATION (Email + OTP -> Candidate Details)
// =========================================================================
window.sendRegisterOtp = async function() {
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const statusEl = document.getElementById('regOtpStatusMsg');
    const btn = document.getElementById('btnSendRegOtp');

    if (statusEl) statusEl.classList.add('hide');

    if (!email || !email.includes("@")) {
        if (statusEl) {
            statusEl.className = "inline-err-msg";
            statusEl.innerText = "Please enter a valid Email ID.";
            statusEl.classList.remove('hide');
        }
        return;
    }

    btn.disabled = true;
    btn.innerText = "Checking...";

    try {
        const emailCheck = await getDocs(query(collection(db, "students"), where("email", "==", email)));
        if (!emailCheck.empty) {
            btn.disabled = false;
            btn.innerText = "Send OTP";
            if (statusEl) {
                statusEl.className = "inline-err-msg";
                statusEl.innerText = "This Email ID is already registered! Please login instead.";
                statusEl.classList.remove('hide');
            }
            return;
        }

        regGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        regOtpExpiry = Date.now() + 10 * 60 * 1000;
        startOtpButtonCooldown('btnSendRegOtp', 'Send OTP');

        const res = await callEmailService({
            action: "send_otp",
            email: email,
            otp: regGeneratedOtp,
            purpose: "Registration Verification"
        });

        document.getElementById('regOtpBox').classList.remove('hide');
        if (statusEl) {
            statusEl.className = "inline-ok-msg";
            statusEl.innerText = res.status === "not_configured"
                ? `[Test Mode] OTP: ${regGeneratedOtp}`
                : `6-digit verification code sent to ${email} (check Inbox).`;
            statusEl.classList.remove('hide');
        }
    } catch (e) {
        console.error(e);
        btn.disabled = false;
        btn.innerText = "Send OTP";
        if (statusEl) {
            statusEl.className = "inline-err-msg";
            statusEl.innerText = "Error sending OTP: " + e.message;
            statusEl.classList.remove('hide');
        }
    }
};

window.verifyRegisterOtp = function() {
    const userOtp = document.getElementById('regOtpInput').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const statusEl = document.getElementById('regOtpStatusMsg');

    if (!userOtp || userOtp.length !== 6) {
        if (statusEl) { statusEl.className = "inline-err-msg"; statusEl.innerText = "Please enter the 6-digit OTP."; statusEl.classList.remove('hide'); }
        return;
    }
    if (Date.now() > regOtpExpiry) {
        if (statusEl) { statusEl.className = "inline-err-msg"; statusEl.innerText = "OTP expired! Please click Resend OTP."; statusEl.classList.remove('hide'); }
        return;
    }
    if (userOtp !== regGeneratedOtp) {
        if (statusEl) { statusEl.className = "inline-err-msg"; statusEl.innerText = "Incorrect OTP. Please check your email and try again."; statusEl.classList.remove('hide'); }
        return;
    }

    isRegEmailVerified = true;
    verifiedRegEmail = email;

    document.getElementById('regVerifiedEmailDisplay').value = email;
    document.getElementById('regStep1Box').classList.add('hide');
    document.getElementById('regPasswordBox').classList.remove('hide');
    document.getElementById('regStepSub').innerText = "Step 2: Complete your profile details to create your account.";
};

window.doRegister = async function() {
    const name = document.getElementById('regName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const targetExam = document.getElementById('regTargetExam') ? document.getElementById('regTargetExam').value : "";
    const cityState = document.getElementById('regCityState') ? document.getElementById('regCityState').value.trim() : "";
    const pass = document.getElementById('regPass').value.trim();
    const passConfirm = document.getElementById('regPassConfirm').value.trim();
    const errEl = document.getElementById('regStep2Error');
    const btn = document.getElementById('btnCompleteReg');

    if (errEl) errEl.classList.add('hide');

    if (!isRegEmailVerified || !verifiedRegEmail) return alert("Please verify your Email ID first!");
    if (!name) {
        if (errEl) { errEl.innerText = "Please enter your Full Name."; errEl.classList.remove('hide'); }
        return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        if (errEl) { errEl.innerText = "Please enter a valid 10-digit Mobile Number."; errEl.classList.remove('hide'); }
        return;
    }
    if (!targetExam) {
        if (errEl) { errEl.innerText = "Please select your Target Exam."; errEl.classList.remove('hide'); }
        return;
    }
    if (!cityState) {
        if (errEl) { errEl.innerText = "Please enter your City & State."; errEl.classList.remove('hide'); }
        return;
    }
    if (!pass || pass.length < 4) {
        if (errEl) { errEl.innerText = "Create a password of at least 4 characters."; errEl.classList.remove('hide'); }
        return;
    }
    if (pass !== passConfirm) {
        if (errEl) { errEl.innerText = "Passwords do not match."; errEl.classList.remove('hide'); }
        return;
    }

    if (btn) { btn.disabled = true; btn.innerText = "Creating Account..."; }
    showProcessing("Creating your TaiyariGhar account...", "Generating your unique Student ID");

    try {
        const mobileCheck = await getDocs(query(collection(db, "students"), where("mobile", "==", mobile)));
        if (!mobileCheck.empty) {
            hideProcessing();
            if (btn) { btn.disabled = false; btn.innerText = "Complete Registration"; }
            if (errEl) { errEl.innerText = "This Mobile Number is already registered with another account."; errEl.classList.remove('hide'); }
            return;
        }

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
            targetExam: targetExam,
            cityState: cityState,
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

        hideProcessing();
        if (btn) { btn.disabled = false; btn.innerText = "Complete Registration"; }

        document.getElementById('newLoginId').innerText = newId;
        document.getElementById('newLoginEmail').innerText = verifiedRegEmail;
        document.getElementById('newLoginPass').innerText = pass;
        document.getElementById('registerSuccessModal').classList.remove('hide');
    } catch (e) {
        console.error(e);
        hideProcessing();
        if (btn) { btn.disabled = false; btn.innerText = "Complete Registration"; }
        if (errEl) { errEl.innerText = "Database Error: " + e.message; errEl.classList.remove('hide'); }
    }
};

window.closeRegModal = function() {
    document.getElementById('registerSuccessModal').classList.add('hide');
    document.getElementById('regName').value = '';
    document.getElementById('regMobile').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regOtpInput').value = '';
    if (document.getElementById('regTargetExam')) document.getElementById('regTargetExam').value = '';
    if (document.getElementById('regCityState')) document.getElementById('regCityState').value = '';
    document.getElementById('regPass').value = '';
    document.getElementById('regPassConfirm').value = '';
    showLogin();
};

function setForgotStatus(msg, isError = false) {
    const box = document.getElementById('forgotStatusMsg');
    if (!box) return;
    box.classList.remove('hide');
    box.style.background = isError ? '#FEF2F2' : '#ECFDF5';
    box.style.color = isError ? '#991B1B' : '#065F46';
    box.style.border = isError ? '1px solid #FECACA' : '1px solid #A7F3D0';
    box.innerHTML = msg;
}

window.sendForgotOtp = async function() {
    const rawEmail = document.getElementById('forgotEmail').value.trim();
    const email = rawEmail.toLowerCase();
    if (!email || !email.includes("@")) return alert("Please enter your registered Email ID!");

    const btn = document.getElementById('btnSendForgotOtp');
    btn.disabled = true;
    btn.innerText = "Sending...";
    setForgotStatus("Checking account & sending 6-digit OTP to your Gmail...", false);

    try {
        let snap = await getDocs(query(collection(db, "students"), where("email", "==", email)));
        let studentDoc = !snap.empty ? snap.docs[0] : null;
        if (!studentDoc) {
            const allSnap = await getDocs(collection(db, "students"));
            studentDoc = allSnap.docs.find(d => (d.data().email || "").trim().toLowerCase() === email) || null;
        }

        if (!studentDoc) {
            btn.disabled = false;
            btn.innerText = "Send OTP";
            setForgotStatus("No account registered with this Email ID.", true);
            return;
        }

        forgotTargetDocId = studentDoc.id;
        forgotTargetEmail = email;
        forgotGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        forgotOtpExpiry = Date.now() + 10 * 60 * 1000;
        startOtpButtonCooldown('btnSendForgotOtp', 'Send OTP');

        const res = await callEmailService({
            action: "send_otp",
            email: email,
            name: studentDoc.data().name || "Student",
            otp: forgotGeneratedOtp,
            purpose: "Password Reset"
        });

        if (res.status === "success" || res.status === "not_configured") {
            setForgotStatus(`6-Digit OTP sent to <b>${email}</b>. Please check your Inbox.`, false);
            document.getElementById('forgotOtpStepBox').classList.remove('hide');
        } else {
            throw new Error(res.message || "Email server did not confirm delivery");
        }
    } catch (e) {
        console.error("Forgot OTP Error:", e);
        setForgotStatus(`Error sending OTP: ${e.message}`, true);
        btn.disabled = false;
        btn.innerText = "Send OTP";
    }
};

window.doResetPassword = async function() {
    const otpInput = document.getElementById('forgotOtpInput').value.trim();
    const newPass = document.getElementById('forgotNewPass').value.trim();

    if (!otpInput || otpInput.length !== 6) return alert("Please enter the 6-digit OTP!");
    if (Date.now() > forgotOtpExpiry) return alert("OTP expired! Please click Resend OTP.");
    if (otpInput !== forgotGeneratedOtp) return alert("Incorrect OTP! Please check your email and try again.");
    if (!newPass || newPass.length < 4) return alert("Please enter a new password (minimum 4 characters)!");

    const btn = document.getElementById('btnDoResetPass');
    if (btn) { btn.disabled = true; btn.innerText = "Updating Password..."; }

    try {
        await updateDoc(doc(db, "students", forgotTargetDocId), { password: newPass });
        alert("Password Reset Successful! You can now log in with your new password.");
        document.getElementById('forgotOtpInput').value = '';
        document.getElementById('forgotNewPass').value = '';
        document.getElementById('forgotStatusMsg').classList.add('hide');
        showLogin();
    } catch (e) {
        console.error(e);
        alert("Error updating password: " + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "Verify OTP & Update Password"; }
    }
};

// =========================================================================
// SUBSCRIPTION PLANS & CHECKOUT
// =========================================================================
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
        if (document.getElementById(`planSave${m}`)) document.getElementById(`planSave${m}`).innerText = disc > 0 ? `SAVE ₹${disc}` : "OFFER";
    });
}

let appliedPartnerCoupon = null;

function getEffectiveCheckoutDetails() {
    const plan = subscriptionPlans[selectedPlanMonths] || subscriptionPlans[12] || { months: 12, days: 365, label: "12 Months Pass", mrp: 399, price: 249 };
    const baseDiscount = Math.max(0, Number(plan.mrp || 0) - Number(plan.price || 0));
    let couponDiscount = 0;
    let extraDays = 0;

    if (appliedPartnerCoupon) {
        couponDiscount = Number(appliedPartnerCoupon.discountAmount || appliedPartnerCoupon.discount || 0);
        extraDays = Number(appliedPartnerCoupon.extraDays || 0);
    }

    const finalPayable = Math.max(1, Number(plan.price || 99) - couponDiscount);
    const totalDays = Number(plan.days || 90) + extraDays;
    return { plan, baseDiscount, couponDiscount, extraDays, finalPayable, totalDays };
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

    const { plan, baseDiscount, couponDiscount, extraDays, finalPayable, totalDays } = getEffectiveCheckoutDetails();

    document.getElementById('selPlanLabel').innerText = plan.label;
    if (document.getElementById('selPlanValidity')) {
        document.getElementById('selPlanValidity').innerText = extraDays > 0
            ? `${plan.days} + ${extraDays} Bonus = ${totalDays} Days`
            : `${plan.days} Days`;
    }
    document.getElementById('selPlanMrp').innerText = plan.mrp;
    document.getElementById('selPlanDiscount').innerText = baseDiscount;

    const cRow = document.getElementById('couponDiscountRow');
    const cBonusText = document.getElementById('selCouponBonusText');
    if (cRow && cBonusText) {
        if (appliedPartnerCoupon) {
            cRow.classList.remove('hide');
            cBonusText.innerText = `- ₹${couponDiscount} + ${extraDays} Extra Days (${appliedPartnerCoupon.couponCode})`;
        } else {
            cRow.classList.add('hide');
        }
    }

    document.getElementById('selPlanFinal').innerText = finalPayable;
    document.getElementById('payBtnAmount').innerText = finalPayable;
};

window.applyStudentReferralCoupon = async function() {
    const inputEl = document.getElementById('studentCouponInput');
    const msgEl = document.getElementById('couponStatusMsg');
    const btnEl = document.getElementById('btnApplyStudentCoupon');
    if (!inputEl || !msgEl) return;

    const code = inputEl.value.trim().toUpperCase();
    if (!code) {
        appliedPartnerCoupon = null;
        selectSubscriptionPlan(selectedPlanMonths);
        msgEl.style.color = "#DC2626";
        msgEl.innerText = "Please enter a coupon or friend's Student ID.";
        return;
    }

    if (isLoggedIn && currentStudent.loginId && code === currentStudent.loginId.toUpperCase()) {
        appliedPartnerCoupon = null;
        selectSubscriptionPlan(selectedPlanMonths);
        msgEl.style.color = "#DC2626";
        msgEl.innerText = "You cannot apply your own Student ID as a referral code.";
        return;
    }

    if (btnEl) { btnEl.disabled = true; btnEl.innerText = "Checking..."; }
    msgEl.style.color = "#4F46E5";
    msgEl.innerText = "Verifying referral code...";

    try {
        // 1. Check Official Partner Coupons first
        const snap = await getDocs(query(collection(db, "partners"), where("couponCode", "==", code)));
        if (!snap.empty) {
            const pDoc = snap.docs[0];
            const pData = pDoc.data();
            if (pData.status !== "approved") {
                appliedPartnerCoupon = null;
                selectSubscriptionPlan(selectedPlanMonths);
                msgEl.style.color = "#DC2626";
                msgEl.innerText = "This partner coupon code is currently inactive.";
                return;
            }
            appliedPartnerCoupon = { type: "partner", docId: pDoc.id, ...pData };
            selectSubscriptionPlan(selectedPlanMonths);
            const disc = Number(pData.discountAmount || pData.discount || 0);
            const ext = Number(pData.extraDays || 0);
            msgEl.style.color = "#059669";
            msgEl.innerText = `Partner Coupon Applied! ₹${disc} instant discount + ${ext} extra validity days.`;
            return;
        }

        // 2. Check Normal Student Referral Code (TGxxxx)
        const stSnap = await getDocs(query(collection(db, "students"), where("loginId", "==", code)));
        if (!stSnap.empty) {
            const refStudentDoc = stSnap.docs[0];
            const refData = refStudentDoc.data();
            appliedPartnerCoupon = {
                type: "student",
                docId: refStudentDoc.id,
                couponCode: code,
                referrerLoginId: code,
                referrerName: refData.name || "Friend",
                referrerIsPaid: Boolean(refData.isPaid),
                referrerExpiry: refData.expiryDate || "",
                discountAmount: 15,
                extraDays: 10
            };
            selectSubscriptionPlan(selectedPlanMonths);
            msgEl.style.color = "#059669";
            msgEl.innerText = `Friend Referral (${code}) Applied! You get ₹15 instant discount + 10 extra validity days.`;
            return;
        }

        appliedPartnerCoupon = null;
        selectSubscriptionPlan(selectedPlanMonths);
        msgEl.style.color = "#DC2626";
        msgEl.innerText = "Invalid coupon or referral code.";
    } catch (e) {
        appliedPartnerCoupon = null;
        selectSubscriptionPlan(selectedPlanMonths);
        msgEl.style.color = "#DC2626";
        msgEl.innerText = "Error checking code. Please try again.";
    } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.innerText = "Apply"; }
    }
};

window.openPaymentModal = function() {
    if (!isLoggedIn) {
        alert("Please login or register first to choose a subscription plan!");
        return showLogin();
    }
    appliedPartnerCoupon = null;
    const savedRef = localStorage.getItem('tg_pending_student_ref') || "";
    const validPreRef = (savedRef && savedRef !== (currentStudent.loginId || "").toUpperCase()) ? savedRef : "";
    if (document.getElementById('studentCouponInput')) document.getElementById('studentCouponInput').value = validPreRef;
    if (document.getElementById('couponStatusMsg')) document.getElementById('couponStatusMsg').innerText = "";
    syncSubscriptionPlansFromSettings();
    selectSubscriptionPlan(12);
    document.getElementById('paymentModal').classList.remove('hide');
    if (validPreRef) applyStudentReferralCoupon();
};

window.closeModal = function() { document.getElementById('paymentModal').classList.add('hide'); };

window.initiateRazorpayPayment = function() {
    if (!isLoggedIn) return showLogin();
    const { plan, baseDiscount, couponDiscount, extraDays, finalPayable, totalDays } = getEffectiveCheckoutDetails();
    const totalDiscount = baseDiscount + couponDiscount;
    const usedCouponSnapshot = appliedPartnerCoupon ? { ...appliedPartnerCoupon } : null;

    const options = {
        "key": RAZORPAY_KEY_ID,
        "amount": Math.round(finalPayable * 100),
        "currency": "INR",
        "name": "TaiyariGhar",
        "description": `${plan.label} (${totalDays} Days)`,
        "image": "logo.png",
        "handler": async function (response) {
            closeModal();
            await handleSuccessfulRazorpayPayment(response.razorpay_payment_id, plan, finalPayable, totalDays, totalDiscount, usedCouponSnapshot);
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
            "discount": totalDiscount,
            "finalPaid": finalPayable,
            "couponCode": usedCouponSnapshot ? usedCouponSnapshot.couponCode : "NONE"
        },
        "theme": { "color": "#4F46E5" }
    };

    if (typeof window.Razorpay !== "function") {
        alert("Payment gateway abhi load nahi ho paya hai. Kripya internet check karein ya page refresh karke dobara try karein.");
        return;
    }
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
        alert("Payment Failed: " + response.error.description);
    });
    rzp.open();
};

async function handleSuccessfulRazorpayPayment(paymentId, plan, finalPayable, totalDays, totalDiscount, usedCoupon) {
    showProcessing("Activating your All-Access Pass...", "Updating validity and sending payment receipt");
    try {
        const today = new Date();
        const baseStart = (currentStudent.isPaid && currentStudent.expiry && new Date(currentStudent.expiry) > today)
            ? new Date(currentStudent.expiry)
            : today;
        const expiryDateObj = new Date(baseStart.getTime() + totalDays * 24 * 60 * 60 * 1000);
        const expiryStr = expiryDateObj.toISOString().split('T')[0];
        const invoiceNumber = "INV-" + Date.now().toString().slice(-6);

        let targetStudentDocId = currentStudent.docId;
        if (!targetStudentDocId && currentStudent.loginId) {
            const stLookup = await getDocs(query(collection(db, "students"), where("loginId", "==", String(currentStudent.loginId).trim().toUpperCase())));
            if (!stLookup.empty) {
                targetStudentDocId = stLookup.docs[0].id;
                currentStudent.docId = targetStudentDocId;
            }
        }
        if (targetStudentDocId) {
            await updateDoc(doc(db, "students", targetStudentDocId), {
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
            discount: totalDiscount,
            amount: finalPayable,
            validityDays: totalDays,
            expiryDate: expiryStr,
            couponCode: usedCoupon ? usedCoupon.couponCode : "",
            partnerId: usedCoupon ? usedCoupon.partnerId : "",
            timestamp: today.toISOString()
        });

        if (usedCoupon && usedCoupon.type === "student" && usedCoupon.docId) {
            const bonusDaysForReferrer = 20;
            const refBaseStart = (usedCoupon.referrerIsPaid && usedCoupon.referrerExpiry && new Date(usedCoupon.referrerExpiry) > today)
                ? new Date(usedCoupon.referrerExpiry)
                : today;
            const newRefExpiry = new Date(refBaseStart.getTime() + bonusDaysForReferrer * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            await updateDoc(doc(db, "students", usedCoupon.docId), {
                isPaid: true,
                expiryDate: newRefExpiry,
                referralCount: increment(1),
                referralBonusDays: increment(bonusDaysForReferrer)
            });
            localStorage.removeItem('tg_pending_student_ref');
        } else if (usedCoupon && usedCoupon.docId) {
            const commPct = Number(usedCoupon.commissionPercent || 10);
            const commissionEarned = Number(((finalPayable * commPct) / 100).toFixed(2));
            const maskedStudent = (currentStudent.name || "Student").slice(0, 3) + "***";
            const todayStr = today.toLocaleDateString('en-IN');

            await updateDoc(doc(db, "partners", usedCoupon.docId), {
                usedCount: increment(1),
                totalSales: increment(Number(finalPayable)),
                totalCommission: increment(commissionEarned),
                conversions: arrayUnion({
                    date: todayStr,
                    studentMasked: maskedStudent,
                    paidAmount: Number(finalPayable),
                    commission: commissionEarned
                })
            });
        }

        appliedPartnerCoupon = null;
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
            discount: totalDiscount,
            amount: finalPayable,
            validityDays: totalDays,
            expiryDate: expiryStr,
            date: today.toLocaleDateString('en-IN')
        });

        hideProcessing();
        alert(`Payment Successful!\n\nYour ${plan.label} (${totalDays} Days) is now ACTIVE till ${expiryStr}.\nAn official receipt (${invoiceNumber}) has been sent to ${currentStudent.email}.`);
        renderCandidateProfilePopover();
        fetchSettingsAndTests();
    } catch (e) {
        hideProcessing();
        console.error("Post-payment error:", e);
        alert("Payment received (ID: " + paymentId + "), but there was a delay updating your profile.");
    }
}

// =========================================================================
// LIVE TESTS SHOWCASE (Simultaneous Dashboard Release - No Email Sent)
// =========================================================================
function isLiveTestCurrentlyActive(t) {
    if (String(t.isLive).trim().toLowerCase() !== "yes") return false;
    const now = new Date();
    const start = t.liveStart ? new Date(t.liveStart) : null;
    const end = t.liveEnd ? new Date(t.liveEnd) : null;
    if (!start && !end) return true;
    if (start && !end) return now >= start;
    if (!start && end) return now <= end;
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
    if (isNaN(d.getTime())) return isoStr;
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
        const lookupId = t.testId || t.id;
        const alreadyAttempted = Boolean(isLoggedIn && userPastResults && (userPastResults[lookupId] || userPastResults[t.id]));
        const endDisplay = t.liveEnd ? formatDateTimeReadable(t.liveEnd) : (t.liveReleaseTime || "12:00 AM");
        let actionBtnHtml = "";

        if (!isLoggedIn) {
            actionBtnHtml = `<button class="btn" style="background:#FDE047; color:#1E1B4B; font-weight:700;" onclick="closeLiveTestsHub(); showLogin()">Login to Attempt Live Exam</button>`;
        } else if (String(t.isFree).trim().toLowerCase() !== "yes" && !currentStudent.isPaid) {
            actionBtnHtml = `<button class="btn" style="background:#FDE047; color:#1E1B4B; font-weight:700;" onclick="closeLiveTestsHub(); openPaymentModal()">🔒 Subscribe to Enter Live Exam</button>`;
        } else if (alreadyAttempted) {
            actionBtnHtml = `<button class="btn" style="background:rgba(255,255,255,0.2); color:#FFF; cursor:default;">✅ Submitted (Result on Dashboard at ${endDisplay})</button>`;
        } else {
            actionBtnHtml = `<button class="btn btn-accent" style="font-weight:700;" onclick="closeLiveTestsHub(); showInstructions('${lookupId}', '${t.testName.replace(/'/g, "\\'")}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', false, true, '${t.liveEnd || t.liveReleaseTime || ''}', ${t.positiveMark || 1})">🚀 Attempt Live Exam Now</button>`;
        }

        const singleCard = `
            <div class="live-card">
                <div>
                    <div class="live-badge-pill"><span class="live-dot-nav" style="background:white;"></span> ${t.mainCat} • LIVE</div>
                    <h3>${t.testName}</h3>
                    <p>${t.subCat} | ⏱️ ${t.duration} Mins | 🏆 ${t.marks} Marks</p>
                </div>
                <div class="live-timer-strip">
                    <span>⏳ Result: ${endDisplay}</span>
                    <span class="live-countdown-clock" data-endtime="${t.liveEnd || ''}">LIVE</span>
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
            if (!endStr) { el.innerText = "LIVE NOW"; return; }
            const diff = new Date(endStr) - new Date();
            if (isNaN(diff)) { el.innerText = "LIVE NOW"; }
            else if (diff <= 0) { el.innerText = "Ended"; }
            else {
                const hrs = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                el.innerText = `${hrs}h ${mins}m ${secs}s left`;
            }
        });
    }, 1000);
}

// =========================================================================
// UNLIMITED SMART PRACTICE BANK (100-Q Bundles, 15 Free Qs/Topic, Mix)
// =========================================================================
async function loadStudentPracticeProgress() {
    if (!isLoggedIn || !currentStudent.loginId) return;
    try {
        const snap = await getDoc(doc(db, "practice_progress", currentStudent.loginId));
        if (snap.exists()) {
            const d = snap.data();
            pbUserProgress.attemptedMap = d.attemptedMap || {};
            pbUserProgress.totalAttempted = d.totalAttempted || 0;
            pbUserProgress.totalCorrect = d.totalCorrect || 0;
            pbUserProgress.totalTimeSec = d.totalTimeSec || 0;
        }
    } catch (e) { console.error("Practice progress load error:", e); }
}

async function flushPracticeProgressToFirestore() {
    if (!isLoggedIn || !currentStudent.loginId || pbUnsavedWrites === 0) return;
    pbUnsavedWrites = 0;
    try {
        await setDoc(doc(db, "practice_progress", currentStudent.loginId), {
            attemptedMap: pbUserProgress.attemptedMap,
            totalAttempted: pbUserProgress.totalAttempted,
            totalCorrect: pbUserProgress.totalCorrect,
            totalTimeSec: pbUserProgress.totalTimeSec,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (e) { console.error("Practice progress save error:", e); }
}

let pbCatalogLoaded = false;
let pbCurrentSection = "practice";

window.switchPbSectionMode = function(sec) {
    pbCurrentSection = sec === "ncert" ? "ncert" : "practice";
    const btnP = document.getElementById('pbModeTabPractice');
    const btnN = document.getElementById('pbModeTabNcert');
    if (btnP) btnP.className = pbCurrentSection === "practice" ? "btn btn-primary" : "btn btn-outline";
    if (btnN) btnN.className = pbCurrentSection === "ncert" ? "btn btn-primary" : "btn btn-outline";
    renderPbSubjects();
};

window.openSmartPracticeBank = async function(sectionMode = "practice") {
    if (!isLoggedIn) {
        showLogin();
        const err = document.getElementById('loginInlineError');
        if (err) {
            err.innerText = "Please log in or register free to access Smart Practice Bank & NCERT Questions.";
            err.classList.remove('hide');
        }
        return;
    }

    pbCurrentSection = sectionMode === "ncert" ? "ncert" : "practice";
    showScreen('practiceBankScreen', true);
    updatePbAnalyticsUI();

    const btnP = document.getElementById('pbModeTabPractice');
    const btnN = document.getElementById('pbModeTabNcert');
    if (btnP) btnP.className = pbCurrentSection === "practice" ? "btn btn-primary" : "btn btn-outline";
    if (btnN) btnN.className = pbCurrentSection === "ncert" ? "btn btn-primary" : "btn btn-outline";

    const grid = document.getElementById('pbLevelSubjects');
    if (pbCatalogLoaded && pbMetaIndex.length > 0) {
        renderPbSubjects();
        return;
    }

    // Render immediately from localStorage cache if available (0ms instant UI, no flicker)
    let hasCachedRender = false;
    try {
        const cachedRaw = localStorage.getItem("tg_pb_sharded_index_v2");
        if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
                pbMetaIndex = parsed.items;
                pbCatalogLoaded = true;
                hasCachedRender = true;
                renderPbSubjects();
                if (Date.now() - parsed.ts < 300000) return;
            }
        }
    } catch (e) {}

    if (grid) grid.innerHTML = `<div style="grid-column:1/-1; padding:18px; color:#4F46E5; font-weight:600;">⚡ Loading subjects &amp; chapters...</div>`;
    renderPbSubjects();

    try {
        // 1. Read lightweight sharded metadata index (supports 10,000+ sets & 10 Lakh+ Qs in <0.5s)
        let combined = [];
        try {
            const metaSnap = await getDoc(doc(db, "settings", "practice_catalog_meta"));
            if (metaSnap.exists() && Number(metaSnap.data().shardCount || 0) > 0) {
                const count = Number(metaSnap.data().shardCount);
                const shardPromises = [];
                for (let i = 0; i < count; i++) {
                    shardPromises.push(getDoc(doc(db, "settings", `practice_catalog_shard_${i}`)));
                }
                const shardSnaps = await Promise.all(shardPromises);
                shardSnaps.forEach(s => {
                    if (s.exists() && Array.isArray(s.data().bundles)) {
                        s.data().bundles.forEach(b => {
                            combined.push({
                                bundleId: b.id,
                                section: b.sec || "practice",
                                subject: (b.s || "General").trim(),
                                topic: (b.t || "Mixed").trim(),
                                packIndex: b.p || 1,
                                count: Number(b.c || 0)
                            });
                        });
                    }
                });
            }
        } catch (metaErr) {
            console.warn("Sharded catalog read skipped:", metaErr);
        }

        if (combined.length > 0) {
            pbMetaIndex = combined;
        } else {
            // Automatic fallback: read directly from `practice_bank_bundles` if fast index not synced yet
            const bSnap = await getDocs(collection(db, "practice_bank_bundles"));
            pbMetaIndex = bSnap.docs.map(d => {
                const data = d.data();
                const qs = Array.isArray(data.questions) ? data.questions : null;
                if (qs) pbLoadedBundles[d.id] = qs;
                return {
                    bundleId: d.id,
                    section: data.section || "practice",
                    subject: (data.subject || "General").trim(),
                    topic: (data.topic || "Mixed").trim(),
                    packIndex: data.packNumber || data.packIndex || 1,
                    count: Number(data.questionCount || (qs ? qs.length : 0))
                };
            });
        }
        if (pbMetaIndex.length > 0) {
            pbCatalogLoaded = true;
            try {
                localStorage.setItem("tg_pb_sharded_index_v2", JSON.stringify({ ts: Date.now(), items: pbMetaIndex }));
            } catch (e) {}
            renderPbSubjects();
        } else if (!hasCachedRender) {
            pbCatalogLoaded = true;
            renderPbSubjects();
        }
    } catch (e) {
        if (grid && pbMetaIndex.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; padding:18px; color:#DC2626;">Could not load Practice Bank: ${e.message}</div>`;
        }
    }
};

window.exitSmartPracticeBank = function() {
    clearInterval(pbTimerInterval);
    flushPracticeProgressToFirestore();
    if (isLoggedIn) goDashboard();
    else goHome();
};

function updatePbAnalyticsUI() {
    const att = pbUserProgress.totalAttempted || 0;
    const cor = pbUserProgress.totalCorrect || 0;
    const sec = pbUserProgress.totalTimeSec || 0;
    const acc = att > 0 ? Math.round((cor / att) * 100) : 0;
    const avg = att > 0 ? Math.round(sec / att) : 0;

    if (document.getElementById('pbStatAttempted')) document.getElementById('pbStatAttempted').innerText = `${att} Qs`;
    if (document.getElementById('pbStatAccuracy')) document.getElementById('pbStatAccuracy').innerText = `${acc}%`;
    if (document.getElementById('pbStatAvgTime')) document.getElementById('pbStatAvgTime').innerText = `${avg}s`;
}

function renderPbSubjects() {
    const isNcert = pbCurrentSection === "ncert";
    document.getElementById('pbHeaderTitle').innerText = isNcert
        ? "📘 NCERT Base Question Bank (Class 6–12)"
        : "Unlimited Smart Practice Bank";
    document.getElementById('pbHeaderSub').innerText = currentStudent.isPaid
        ? "All-Access Pass Active — Unlimited Questions Unlocked"
        : (isNcert
            ? "Free Tier: First 15 NCERT Questions per Subject Free • Upgrade Pass for All Chapters"
            : "Free Tier: First 15 Questions per Subject Free • Upgrade Pass for Full Question Bank");
    document.getElementById('pbBackBtn').classList.add('hide');
    document.getElementById('pbLevelSubjects').classList.remove('hide');
    document.getElementById('pbLevelModes').classList.add('hide');
    document.getElementById('pbLevelArena').classList.add('hide');

    const grid = document.getElementById('pbLevelSubjects');
    if (!pbCatalogLoaded && pbMetaIndex.length === 0) return;

    const sectionBundles = pbMetaIndex.filter(b => (b.section || "practice") === pbCurrentSection);
    const subjectMap = {};
    sectionBundles.forEach(b => {
        const s = b.subject || "General";
        if (!subjectMap[s]) subjectMap[s] = { topics: new Set(), totalQs: 0 };
        subjectMap[s].topics.add(b.topic);
        subjectMap[s].totalQs += Number(b.count || 0);
    });

    const subjects = Object.keys(subjectMap);
    if (subjects.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; padding:18px; color:#64748B;">${isNcert ? "No NCERT Base questions uploaded yet. Check back soon!" : "No practice questions uploaded yet. Check back soon!"}</div>`;
        return;
    }

    grid.innerHTML = subjects.map(sub => `
        <div onclick="selectPbSubject('${sub.replace(/'/g, "\'")}')" style="border:1.5px solid ${isNcert ? '#A7F3D0' : '#CBD5E1'}; border-radius:12px; padding:16px; background:#ffffff; cursor:pointer; transition:0.15s;" onmouseover="this.style.borderColor='#4F46E5'" onmouseout="this.style.borderColor='${isNcert ? '#A7F3D0' : '#CBD5E1'}'">
            <div style="font-size:16px; font-weight:700; color:#1E1B4B; margin-bottom:4px;">${sub}</div>
            <div style="font-size:12px; color:#64748B;">${subjectMap[sub].topics.size} ${isNcert ? 'Chapters' : 'Topics'} &bull; ${subjectMap[sub].totalQs.toLocaleString()} Questions</div>
            <div style="font-size:11px; color:#059669; font-weight:600; margin-top:4px;">${currentStudent.isPaid ? 'All Unlocked' : '15 Free Qs in Subject'}</div>
        </div>
    `).join("");
}

window.selectPbSubject = function(subject) {
    pbCurrentSubject = subject;
    document.getElementById('pbHeaderTitle').innerText = subject + " — Smart Practice";
    document.getElementById('pbHeaderSub').innerText = currentStudent.isPaid
        ? "All-Access Pass Active — Unlimited Questions Unlocked"
        : "Free Tier: First 15 Questions per Subject Free • Upgrade Pass for All Topics & Questions";
    const backBtn = document.getElementById('pbBackBtn');
    backBtn.classList.remove('hide');
    backBtn.onclick = renderPbSubjects;

    document.getElementById('pbLevelSubjects').classList.add('hide');
    document.getElementById('pbLevelModes').classList.remove('hide');
    document.getElementById('pbLevelArena').classList.add('hide');
    try { history.pushState({ screen: 'practiceBankScreen', pbLevel: 'modes', subject }, '', '?page=practice-bank'); } catch (e) {}

    const topicCounts = {};
    pbMetaIndex.filter(b => (b.section || 'practice') === pbCurrentSection && b.subject === subject).forEach(b => {
        topicCounts[b.topic] = (topicCounts[b.topic] || 0) + Number(b.count || 0);
    });

    const list = document.getElementById('pbTopicsList');
    const topicNames = Object.keys(topicCounts);
    list.innerHTML = topicNames.map((topic, idx) => {
        const isLockedTopic = !currentStudent.isPaid && idx > 0;
        return `
        <div onclick="${isLockedTopic ? 'openPaymentModal()' : `startTopicPractice('${topic.replace(/'/g, "\'")}')`}" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border:1px solid #E2E8F0; border-radius:10px; margin-bottom:8px; cursor:pointer; background:${isLockedTopic ? '#F8FAFC' : '#ffffff'};" onmouseover="this.style.borderColor='#4F46E5'" onmouseout="this.style.borderColor='#E2E8F0'">
            <div>
                <strong style="font-size:14px; color:#1E1B4B;">${topic}</strong>
                <div style="font-size:12px; color:#64748B;">${isLockedTopic ? `Pro Pass Required • ${topicCounts[topic]} Questions` : `${currentStudent.isPaid ? 'Full Topic Unlocked' : 'First 15 Subject Free Qs'} &bull; Total ${topicCounts[topic]} Questions`}</div>
            </div>
            <span style="font-size:13px; font-weight:700; color:${isLockedTopic ? '#D97706' : '#4F46E5'};">${isLockedTopic ? '🔒 Unlock' : 'Practice →'}</span>
        </div>`;
    }).join("");
};

async function fetchBundleQuestions(bundleId) {
    if (pbLoadedBundles[bundleId]) return pbLoadedBundles[bundleId];
    let snap = await getDoc(doc(db, "practice_bundle_data", bundleId));
    if (!snap.exists() || !Array.isArray(snap.data().questions)) {
        snap = await getDoc(doc(db, "practice_bank_bundles", bundleId));
    }
    if (!snap.exists() || !Array.isArray(snap.data().questions)) {
        snap = await getDoc(doc(db, "practice_bank", bundleId));
    }
    const qs = snap.exists() ? (snap.data().questions || []) : [];
    pbLoadedBundles[bundleId] = qs;
    return qs;
}

function normalizePracticeQuestion(rawQ, idx, fallbackTopic) {
    const qEn = rawQ.q || rawQ.question || "";
    const qHi = rawQ.qHi || rawQ.questionHi || "";
    const displayQ = (currentLang === 'hi' && qHi) ? qHi : (qEn || qHi);
    const subQ = (currentLang === 'hi' && qEn && qEn !== qHi) ? qEn : (qHi && qHi !== qEn ? qHi : "");

    const optsEn = Array.isArray(rawQ.options) ? rawQ.options : [rawQ.optionA || "", rawQ.optionB || "", rawQ.optionC || "", rawQ.optionD || ""];
    const optsHi = Array.isArray(rawQ.optionsHi) ? rawQ.optionsHi : [rawQ.optionAHi || "", rawQ.optionBHi || "", rawQ.optionCHi || "", rawQ.optionDHi || ""];
    const displayOpts = [0, 1, 2, 3].map(i => {
        const oE = optsEn[i] || "";
        const oH = optsHi[i] || "";
        if (currentLang === 'hi' && oH) return oH;
        if (oE && oH && oE !== oH) return `${oE} (${oH})`;
        return oE || oH || "";
    });

    let rightIdx = 0;
    if (typeof rawQ.ans === "number" && rawQ.ans >= 0 && rawQ.ans <= 3) {
        rightIdx = rawQ.ans;
    } else {
        const ch = String(rawQ.correctOption || rawQ.ans || "A").trim().toUpperCase();
        rightIdx = Math.max(0, ["A", "B", "C", "D"].indexOf(ch));
    }

    const sanitizeExpectedTag = (txt) => {
        if (!txt || pbCurrentSection === "ncert") return txt || "";
        return String(txt)
            .replace(/\[\s*PYQ\b([^\]]*)\]/gi, "[Expected Exam$1]")
            .replace(/\bPYQs?\b/gi, (m) => (m === "PYQs" ? "Expected Exams" : "Expected Exam"));
    };

    const expEn = sanitizeExpectedTag(String(rawQ.exp || rawQ.explanation || "").trim());
    const expHi = sanitizeExpectedTag(String(rawQ.expHi || rawQ.explanationHi || rawQ["Explanation Hi"] || rawQ["Explanation_Hi"] || "").trim());
    let displayExp = "";
    if (expEn && expHi && expEn !== expHi) {
        displayExp = currentLang === 'hi'
            ? `<div>${expHi}</div><div style="margin-top:8px; padding-top:8px; border-top:1px dashed #CBD5E1; color:#334155;">${expEn}</div>`
            : `<div>${expEn}</div><div style="margin-top:8px; padding-top:8px; border-top:1px dashed #CBD5E1; color:#1E293B;">${expHi}</div>`;
    } else {
        displayExp = expHi || expEn;
    }

    return {
        id: rawQ.id || `${pbCurrentSubject}_${rawQ.topic || fallbackTopic}_${idx}`,
        topic: rawQ.topic || fallbackTopic,
        displayQ,
        subQ,
        displayOpts,
        rightIdx,
        displayExp
    };
}

window.startTopicPractice = async function(topic) {
    pbCurrentMode = "topic";
    pbCurrentTopic = topic;

    const matchingBundles = pbMetaIndex
        .filter(b => (b.section || 'practice') === pbCurrentSection && b.subject === pbCurrentSubject && b.topic === topic)
        .sort((a, b) => (a.packIndex || 1) - (b.packIndex || 1));

    const needsFetch = matchingBundles.some(b => !pbLoadedBundles[b.bundleId]);
    if (needsFetch) showProcessing(`Loading ${topic}...`, "Fetching questions");

    try {
        let allTopicQs = [];
        const bundlesToLoad = currentStudent.isPaid ? matchingBundles : matchingBundles.slice(0, 1);
        const fetchedArrays = await Promise.all(bundlesToLoad.map(b => fetchBundleQuestions(b.bundleId)));
        fetchedArrays.forEach(qs => { allTopicQs = allTopicQs.concat(qs); });

        if (!currentStudent.isPaid) {
            allTopicQs = allTopicQs.slice(0, 15);
        }

        hideProcessing();
        launchPracticeArena(allTopicQs, `${pbCurrentSubject} • ${topic}`);
    } catch (e) {
        hideProcessing();
        alert("Error loading topic: " + e.message);
    }
};

window.startSubjectMixPractice = async function() {
    pbCurrentMode = "mix";
    pbCurrentTopic = "All Topics Mix";

    const subjectBundles = pbMetaIndex.filter(b => (b.section || 'practice') === pbCurrentSection && b.subject === pbCurrentSubject);
    if (subjectBundles.length === 0) return;

    // Free users: fetch only first 2 bundles in parallel to get 15 free subject questions instantly (<1s)
    // Paid users: fetch bundles in parallel via Promise.all instead of slow sequential loop
    const targetBundles = currentStudent.isPaid ? subjectBundles : subjectBundles.slice(0, 2);
    const needsFetch = targetBundles.some(b => !pbLoadedBundles[b.bundleId]);
    if (needsFetch) showProcessing(`Preparing ${pbCurrentSubject} Mix Practice...`, "Loading questions");

    try {
        const fetchedArrays = await Promise.all(targetBundles.map(b => fetchBundleQuestions(b.bundleId)));
        let mixedPool = [];
        fetchedArrays.forEach(qs => { mixedPool = mixedPool.concat(qs); });

        for (let i = mixedPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mixedPool[i], mixedPool[j]] = [mixedPool[j], mixedPool[i]];
        }

        if (!currentStudent.isPaid) {
            mixedPool = mixedPool.slice(0, 15);
        }

        hideProcessing();
        launchPracticeArena(mixedPool, `${pbCurrentSubject} • Mix Practice`);
    } catch (e) {
        hideProcessing();
        alert("Error starting Mix Practice: " + e.message);
    }
};

function launchPracticeArena(allQuestions, titleLabel) {
    window._pbFullQuestionPool = allQuestions;
    window._pbSessionAttemptedIds = {};
    pbSessionCorrect = 0;
    pbSessionWrong = 0;
    pbStreakCount = 0;

    document.getElementById('pbHeaderTitle').innerText = titleLabel;
    document.getElementById('pbHeaderSub').innerText = currentStudent.isPaid
        ? "All-Access Pass Active — Unlimited Questions Unlocked"
        : "Free Tier: First 15 questions per subject unlocked. Upgrade Pass for full question bank.";

    const backBtn = document.getElementById('pbBackBtn');
    backBtn.onclick = () => {
        clearInterval(pbTimerInterval);
        flushPracticeProgressToFirestore();
        selectPbSubject(pbCurrentSubject);
    };

    document.getElementById('pbLevelModes').classList.add('hide');
    document.getElementById('pbLevelArena').classList.remove('hide');
    try { history.pushState({ screen: 'practiceBankScreen', pbLevel: 'arena', subject: pbCurrentSubject, topic: pbCurrentTopic }, '', '?page=practice-bank'); } catch (e) {}
    switchPbPool('unattempted');
}

window.switchPbPool = function(poolType) {
    pbPoolMode = poolType;
    const fullPool = (window._pbFullQuestionPool || []).map((q, idx) => {
        if (!q.id) q.id = `${pbCurrentSubject}_${q.topic || pbCurrentTopic}_${idx}`.replace(/[^a-zA-Z0-9_]/g, "_");
        return q;
    });
    const sessionIds = window._pbSessionAttemptedIds || {};
    const unattempted = fullPool.filter(q => !pbUserProgress.attemptedMap[q.id] || !!sessionIds[q.id]);
    const attempted = fullPool.filter(q => !!pbUserProgress.attemptedMap[q.id] && !sessionIds[q.id]);

    document.getElementById('pbUnattemptedCount').innerText = unattempted.length;
    document.getElementById('pbAttemptedCount').innerText = attempted.length;

    document.getElementById('pbFilterUnattempted').className = poolType === 'unattempted' ? 'btn btn-primary' : 'btn btn-outline';
    document.getElementById('pbFilterAttempted').className = poolType === 'attempted' ? 'btn btn-primary' : 'btn btn-outline';

    pbActiveQuestions = poolType === 'unattempted' ? unattempted : attempted;
    pbCurrentIndex = 0;
    renderCurrentPracticeQuestion();
};

function startQuestionStopwatch() {
    clearInterval(pbTimerInterval);
    pbQuestionSeconds = 0;
    document.getElementById('pbLiveTimer').innerText = "00:00";
    pbTimerInterval = setInterval(() => {
        pbQuestionSeconds++;
        const m = String(Math.floor(pbQuestionSeconds / 60)).padStart(2, '0');
        const s = String(pbQuestionSeconds % 60).padStart(2, '0');
        document.getElementById('pbLiveTimer').innerText = `${m}:${s}`;
    }, 1000);
}

function renderCurrentPracticeQuestion() {
    const streakEl = document.getElementById('pbStreakBanner');
    streakEl.classList.add('hide');

    if (!pbActiveQuestions || pbActiveQuestions.length === 0) {
        clearInterval(pbTimerInterval);
        document.getElementById('pbQMeta').innerText = pbCurrentTopic;
        document.getElementById('pbQCounter').innerText = "0 / 0";
        document.getElementById('pbQText').innerHTML = pbPoolMode === 'unattempted'
            ? (currentStudent.isPaid
                ? "You have completed all available questions in this section! Switch to the <strong>Attempted</strong> tab to revise."
                : "You have completed all 15 free questions in this subject! <strong>Upgrade to All-Access Pass</strong> to unlock all topics &amp; hundreds more questions.")
            : "No attempted questions here yet. Switch to <strong>Not Attempted</strong> to start practicing!";
        document.getElementById('pbOptionsWrap').innerHTML = !currentStudent.isPaid && pbPoolMode === 'unattempted'
            ? `<button class="btn btn-primary" onclick="openPaymentModal()">Unlock Full Practice Bank</button>`
            : "";
        document.getElementById('pbExplanationBox').innerText = "Select a question to view its detailed explanation.";
        return;
    }

    const rawQ = pbActiveQuestions[pbCurrentIndex];
    const q = normalizePracticeQuestion(rawQ, pbCurrentIndex, pbCurrentTopic);
    rawQ._norm = q;
    document.getElementById('pbQMeta').innerText = `Topic: ${q.topic || pbCurrentTopic}`;
    document.getElementById('pbQCounter').innerText = `Q ${pbCurrentIndex + 1} of ${pbActiveQuestions.length}`;
    document.getElementById('pbQText').innerHTML = `<div>${q.displayQ}</div>` + (q.subQ ? `<div style="font-size:13.5px; color:#475569; margin-top:6px;">${q.subQ}</div>` : "");

    document.getElementById('pbOptionsWrap').innerHTML = q.displayOpts.map((optText, i) => `
        <button type="button" class="pb-opt-btn" id="pbOptBtn-${i}" onclick="answerPracticeQuestion(${i})">
            <strong>${String.fromCharCode(65 + i)}.</strong> ${optText}
        </button>
    `).join("");

    document.getElementById('pbExplanationBox').innerHTML = `Select an option to check your answer and read the explanation.`;
    startQuestionStopwatch();
}

window.answerPracticeQuestion = function(chosenIdx) {
    clearInterval(pbTimerInterval);
    const rawQ = pbActiveQuestions[pbCurrentIndex];
    if (!rawQ) return;
    const q = rawQ._norm || normalizePracticeQuestion(rawQ, pbCurrentIndex, pbCurrentTopic);

    const rightIdx = q.rightIdx;
    const isCorrect = chosenIdx === rightIdx;

    for (let i = 0; i < 4; i++) {
        const btn = document.getElementById(`pbOptBtn-${i}`);
        if (!btn) continue;
        btn.disabled = true;
        if (i === rightIdx) btn.classList.add('opt-correct');
        else if (i === chosenIdx && !isCorrect) btn.classList.add('opt-wrong');
    }

    const streakEl = document.getElementById('pbStreakBanner');
    if (isCorrect) {
        pbSessionCorrect++;
        pbStreakCount = pbStreakCount > 0 ? pbStreakCount + 1 : 1;
        if (pbStreakCount >= 3 && pbStreakCount % 3 === 0) {
            streakEl.style.background = "#ECFDF5";
            streakEl.style.border = "1px solid #A7F3D0";
            streakEl.style.color = "#065F46";
            streakEl.innerText = `🔥 Hat-trick! ${pbStreakCount} Sahi Lagatar — Zabardast Taiyari!`;
            streakEl.classList.remove('hide');
        } else {
            streakEl.classList.add('hide');
        }
    } else {
        pbSessionWrong++;
        pbStreakCount = pbStreakCount < 0 ? pbStreakCount - 1 : -1;
        if (pbStreakCount <= -3 && Math.abs(pbStreakCount) % 3 === 0) {
            streakEl.style.background = "#FEF2F2";
            streakEl.style.border = "1px solid #FECACA";
            streakEl.style.color = "#991B1B";
            streakEl.innerText = `⚠️ 3 Lagatar Galat Ho Gaye — Koi Baat Nahi, Explanation Dhyan Se Padhein!`;
            streakEl.classList.remove('hide');
        } else {
            streakEl.classList.add('hide');
        }
    }

    document.getElementById('pbSessCorrect').innerText = pbSessionCorrect;
    document.getElementById('pbSessWrong').innerText = pbSessionWrong;

    const statusLine = isCorrect
        ? `<div style="color:#059669; font-weight:700; margin-bottom:6px;">✅ Sahi Jawab! (${pbQuestionSeconds}s)</div>`
        : `<div style="color:#DC2626; font-weight:700; margin-bottom:6px;">❌ Galat Jawab — Sahi Option: ${String.fromCharCode(65 + rightIdx)} (${pbQuestionSeconds}s)</div>`;
    document.getElementById('pbExplanationBox').innerHTML = `
        ${statusLine}
        <div>${q.displayExp || "Correct answer is Option " + String.fromCharCode(65 + rightIdx) + "."}</div>
        <div style="margin-top:12px; padding-top:10px; border-top:1px dashed #CBD5E1; text-align:right;">
            <button type="button" class="btn btn-outline" style="padding:5px 10px; font-size:12px; color:#B45309; border-color:#FDE68A; background:#FFFBEB;" onclick="reportPracticeQuestionError(${chosenIdx})">⚠️ Report Question</button>
        </div>
    `;

    window._pbSessionAttemptedIds = window._pbSessionAttemptedIds || {};
    window._pbSessionAttemptedIds[q.id] = true;
    const wasAlreadyAttempted = !!pbUserProgress.attemptedMap[q.id];
    pbUserProgress.attemptedMap[q.id] = { isCorrect, chosen: chosenIdx, timeSec: pbQuestionSeconds };
    if (!wasAlreadyAttempted) {
        pbUserProgress.totalAttempted = (pbUserProgress.totalAttempted || 0) + 1;
        if (isCorrect) pbUserProgress.totalCorrect = (pbUserProgress.totalCorrect || 0) + 1;
        pbUserProgress.totalTimeSec = (pbUserProgress.totalTimeSec || 0) + pbQuestionSeconds;
    }

    updatePbAnalyticsUI();
    pbUnsavedWrites++;
    if (pbUnsavedWrites >= 10) {
        flushPracticeProgressToFirestore();
    }
};

window.nextPracticeQuestion = function() {
    if (pbCurrentIndex < pbActiveQuestions.length - 1) {
        pbCurrentIndex++;
        renderCurrentPracticeQuestion();
    } else {
        switchPbPool(pbPoolMode);
    }
};

window.prevPracticeQuestion = function() {
    if (pbCurrentIndex > 0) {
        pbCurrentIndex--;
        renderCurrentPracticeQuestion();
    }
};

// =========================================================================
// CROSS-EXAM QUICK PRACTICE BY TEST TYPE
// =========================================================================
window.openCrossExamTypeFilter = async function(typeKey) {
    if(!isLoggedIn) return showLogin();
    if (!isDataLoaded) await fetchSettingsAndTests();

    const titleMap = {
        'previous': '📋 All Previous Year Papers (Across All Exams)',
        'full': '✅ All Full-Length Mock Tests (Across All Exams)',
        'mini': '⚡ Mini & Speed Booster Tests (Across All Exams)',
        'chapter': '📚 Chapter & Topic-Wise Tests (Across All Exams)'
    };

    const filteredTests = allTests.filter(t => {
        const eName = (t.examName || "").toLowerCase();
        const tName = (t.testName || "").toLowerCase();
        if (typeKey === 'previous') return eName.includes('previous') || eName.includes('pyp') || eName.includes('memory') || tName.includes('pyp') || tName.includes('previous');
        if (typeKey === 'full') return eName.includes('full') || tName.includes('full');
        if (typeKey === 'mini') return eName.includes('mini') || eName.includes('speed') || tName.includes('mini') || tName.includes('speed');
        if (typeKey === 'chapter') return eName.includes('chapter') || eName.includes('topic') || eName.includes('ncert') || tName.includes('chapter') || tName.includes('topic');
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

// =========================================================================
// SEQUENTIAL DATA FETCH & ORIGINAL EXAM CATEGORIES RENDERING
// =========================================================================
async function fetchSettingsAndTests() {
    try {
        userPastResults = {};

        const setSnap = await getDoc(doc(db, "settings", "global"));
        if(setSnap.exists()) appSettings = setSnap.data();
        else appSettings = { Plan3_MRP: "149", Plan3_Price: "99", Plan6_MRP: "249", Plan6_Price: "199", Plan12_MRP: "399", Plan12_Price: "249" };

        syncSubscriptionPlansFromSettings();

        const testSnap = await getDocs(collection(db, "tests"));
        allTests = testSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const catSnap = await getDocs(collection(db, "exam_categories"));
        allExamCategories = catSnap.docs.map(d => d.data());

        if(isLoggedIn && currentStudent && currentStudent.loginId) {
            const activeLoginId = String(currentStudent.loginId).trim();
            const resSnap = await getDocs(query(collection(db, "results"), where("loginId", "==", activeLoginId)));
            resSnap.forEach(docItem => {
                let data = docItem.data();
                if(data.loginId && String(data.loginId).trim() === activeLoginId && data.testId) {
                    if(!userPastResults[data.testId] || new Date(data.timestamp) > new Date(userPastResults[data.testId].timestamp)) {
                        userPastResults[data.testId] = data;
                    }
                }
            });
        }

        isDataLoaded = true;

        renderLiveTestsShowcase();
        renderMainCategories();
        if (isLoggedIn) {
            await fetchDashboardData();
        }

        // Lazy-load current_affairs only when user opens Current Affairs Hub for faster initial load

        checkUrlRouting();
    } catch (e) { console.log("Data load error", e); }
}

async function fetchDashboardData() {
    if (!isLoggedIn || !currentStudent || !currentStudent.loginId) return;
    try {
        const activeLoginId = String(currentStudent.loginId).trim();
        const qRes = query(collection(db, "results"), where("loginId", "==", activeLoginId));
        const resSnap = await getDocs(qRes);

        let lastTest = null, attemptedTestIds = [];
        let results = [];
        userPastResults = {};

        if(!resSnap.empty) {
            resSnap.docs.forEach(d => {
                const data = d.data();
                if (data.loginId && String(data.loginId).trim() === activeLoginId) {
                    results.push(data);
                    if (data.testId) {
                        if(!userPastResults[data.testId] || new Date(data.timestamp) > new Date(userPastResults[data.testId].timestamp)) {
                            userPastResults[data.testId] = data;
                        }
                    }
                }
            });
            results.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
            attemptedTestIds = results.map(r => r.testId);
            lastTest = results.find(r => !r.isLivePending || (r.liveEndTime && !isNaN(new Date(r.liveEndTime)) && new Date() > new Date(r.liveEndTime)));
        }

        const uniqueResultsList = [];
        const seenTestKeys = new Set();
        results.forEach(r => {
            const key = r.testId || r.testName;
            if (!seenTestKeys.has(key)) {
                seenTestKeys.add(key);
                uniqueResultsList.push(r);
            }
        });

        const totalAttEl = document.getElementById('totalAttemptedCount');
        if (totalAttEl) totalAttEl.innerText = `${uniqueResultsList.length} Test${uniqueResultsList.length === 1 ? '' : 's'}`;
        const bannerBadgeEl = document.getElementById('bannerAttemptedBadge');
        if (bannerBadgeEl) bannerBadgeEl.innerText = uniqueResultsList.length;

        if(lastTest) {
            document.getElementById('recentTestName').innerText = lastTest.testName;
            document.getElementById('recentTestScore').innerText = `Score: ${lastTest.finalScore}/${lastTest.totalMarks} (${lastTest.percent}%)`;
        } else {
            document.getElementById('recentTestName').innerText = "Not Attempted Yet";
            document.getElementById('recentTestScore').innerText = "Take a test to see your score";
        }

        const historyContainer = document.getElementById('dashHistoryContainer');
        if (historyContainer) {
            if (uniqueResultsList.length === 0) {
                historyContainer.innerHTML = `<div class="history-item"><span style="color:#6B7280; font-size:14px;">You haven't attempted any tests yet. Select an exam category above to start!</span></div>`;
            } else {
                let histHtml = "";
                uniqueResultsList.forEach(r => {
                    const isStillPending = r.isLivePending && (!r.liveEndTime || isNaN(new Date(r.liveEndTime)) || new Date() <= new Date(r.liveEndTime));
                    if (isStillPending) {
                        histHtml += `
                            <div class="history-item" style="border-left: 4px solid #F59E0B;">
                                <div>
                                    <span style="background:#FEF3C7; color:#92400E; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">⏳ LIVE RESULT PENDING</span>
                                    <h4 style="font-size:15px; color:#1E1B4B; margin-top:4px;">${r.testName}</h4>
                                    <p style="font-size:12px; color:#6B7280;">Attempted on ${new Date(r.timestamp).toLocaleDateString()} • Result releases on Dashboard at ${formatDateTimeReadable(r.liveEndTime)}</p>
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
                                <button class="btn btn-outline" style="padding:6px 14px; font-size:12px;" onclick="closeAttemptedHistoryModal(); viewPastAnalysis('${r.testId}')">📊 View Result &amp; Rank</button>
                            </div>`;
                    }
                });
                historyContainer.innerHTML = histHtml;
            }
        }

        let recTest = allTests.find(t => !attemptedTestIds.includes(t.testId || t.id) && !isLiveTestCurrentlyActive(t));
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
        const tid = recommendedTestData.testId || recommendedTestData.id;
        showInstructions(tid, recommendedTestData.testName, recommendedTestData.duration, recommendedTestData.marks, recommendedTestData.negativeMark || 0, recommendedTestData.hasNegative, recommendedTestData.language || 'Both', false, false, '', recommendedTestData.positiveMark || 1);
    } else scrollToCategories();
};

function renderMainCategories() {
    let finalMainCats = [...defaultMainCategories];

    const testMainCats = [...new Set(allTests.map(t => t.mainCat))];
    testMainCats.forEach(catName => {
        if (!catName) return;
        let isDuplicate = finalMainCats.some(c => {
            let cName = c.name.toLowerCase().replace("exams", "").trim();
            let tName = catName.toLowerCase().replace("exams", "").trim();
            return cName === tName || cName.includes(tName) || tName.includes(cName);
        });
        if(!isDuplicate) finalMainCats.push({ name: catName, icon: "📚", gradient: "linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)", subText: "Explore Tests" });
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

window.openCategory = async function(mainCat, fromUrl = false) {
    if(!isLoggedIn) return showLogin();
    if (!isDataLoaded) await fetchSettingsAndTests();
    nav.mainCat = mainCat;

    let normalizedMain = mainCat.toLowerCase().replace("exams", "").trim();
    let subCats = allExamCategories.filter(c => c.mainCat && c.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain).map(c => c.subCat);

    const testSubCats = allTests.filter(t => t.mainCat && t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain).map(t => t.subCat);
    subCats = [...new Set([...subCats, ...testSubCats])].filter(Boolean);

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
};

window.loadTestsForSubCat = function(subCat, pillElement, fromUrl = false) {
    document.querySelectorAll('#subCatPills .sub-cat-pill').forEach(p => p.classList.remove('active'));
    if(pillElement) pillElement.classList.add('active');

    nav.subCat = subCat;
    let normalizedMain = nav.mainCat.toLowerCase().replace("exams", "").trim();
    let normalizedSub = subCat.toLowerCase().trim();

    const filteredTests = allTests.filter(t => t.mainCat && t.subCat && t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && t.subCat.toLowerCase().trim() === normalizedSub);

    const uniqueExamNames = [...new Set([
        ...allExamCategories.filter(c => c.mainCat && c.subCat && c.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && c.subCat.toLowerCase().trim() === normalizedSub).map(c => c.examName),
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
};

window.loadTestsForExamName = function(examName, cardElement) {
    document.querySelectorAll('#examNamePills .exam-name-card').forEach(p => p.classList.remove('active'));
    if(cardElement) cardElement.classList.add('active');

    nav.examName = examName;
    let normalizedMain = nav.mainCat.toLowerCase().replace("exams", "").trim();
    let normalizedSub = nav.subCat.toLowerCase().trim();

    const filteredTests = allTests.filter(t => t.mainCat && t.subCat && t.mainCat.toLowerCase().replace("exams", "").trim() === normalizedMain && t.subCat.toLowerCase().trim() === normalizedSub && t.examName === examName);
    renderTestList(filteredTests, false);
};

function renderTestList(filtered, showExamBadge = false) {
    let html = "";
    if(filtered.length === 0) html = `<p style="text-align:center; color:#666; padding:20px;">No tests uploaded in this section yet. Please check back soon!</p>`;
    else {
        filtered.forEach(t => {
            const lookupId = t.testId || t.id;
            const currentlyLive = isLiveTestCurrentlyActive(t);
            const isLocked = (String(t.isFree).trim().toLowerCase() !== "yes" && !currentStudent.isPaid);

            const rawPastRes = (isLoggedIn && userPastResults) ? (userPastResults[lookupId] || userPastResults[t.id]) : null;
            const pastRes = (rawPastRes && String(rawPastRes.loginId).trim() === String(currentStudent.loginId).trim()) ? rawPastRes : null;

            const resumeKey = 'tg_resume_' + currentStudent.loginId + '_' + lookupId;
            const inProgressData = !currentlyLive ? localStorage.getItem(resumeKey) : null;

            let btnHtml = "";
            let examCategoryBadge = showExamBadge ? `<span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:700; padding:2px 8px; border-radius:8px; margin-right:6px;">${t.mainCat} • ${t.subCat}</span>` : "";
            let badgeTag = currentlyLive ? `<span style="background:#FEE2E2; color:#DC2626; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; margin-left:6px;">🔴 LIVE NOW</span>` : (isLiveTestEnded(t) ? `<span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; margin-left:6px;">Archived Live Test</span>` : "");

            if(isLocked) {
                btnHtml = `<button class="btn" style="background:#F3F4F6; color:#6B7280; border:1px solid #E5E7EB;" onclick="openPaymentModal()">🔒 Unlock</button>`;
            } else if (currentlyLive && pastRes) {
                btnHtml = `<span style="font-size:12px; font-weight:600; color:#D97706;">⏳ Result releases on Dashboard at ${formatDateTimeReadable(t.liveEnd || t.liveReleaseTime)}</span>`;
            } else {
                if(inProgressData) {
                    btnHtml = `<div style="display:flex; gap:10px;"><button class="btn btn-primary" onclick="showInstructions('${lookupId}', '${t.testName.replace(/'/g, "\\'")}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', true, false, '', ${t.positiveMark || 1})">▶ Resume</button><button class="btn btn-outline" style="color:var(--danger); border-color:var(--danger);" onclick="clearResumeData('${lookupId}', '${t.examName}')">Clear</button></div>`;
                } else {
                    btnHtml = `<button class="btn btn-accent" onclick="showInstructions('${lookupId}', '${t.testName.replace(/'/g, "\\'")}', ${t.duration}, ${t.marks}, ${t.negativeMark || 0}, '${t.hasNegative}', '${t.language || 'Both'}', false, ${currentlyLive}, '${t.liveEnd || t.liveReleaseTime || ''}', ${t.positiveMark || 1})">${currentlyLive ? '🚀 Start Live Test' : 'Start Test'}</button>`;
                }

                if(pastRes && !(pastRes.isLivePending && (!pastRes.liveEndTime || isNaN(new Date(pastRes.liveEndTime)) || new Date() <= new Date(pastRes.liveEndTime)))) {
                    btnHtml += `<button class="btn" style="background:#4F46E5; color:white; margin-left:10px;" onclick="viewPastAnalysis('${lookupId}')">📊 Analysis</button>`;
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
        localStorage.removeItem('tg_resume_' + currentStudent.loginId + '_' + testId);
        const activeCard = document.querySelector('.exam-name-card.active');
        if (activeCard) loadTestsForExamName(nav.examName, activeCard);
        else goDashboard();
    }
};

window.goBackToSubCat = function() { history.back(); };

// =========================================================================
// CURRENT AFFAIRS & JOBS HUB
// =========================================================================
let caStreak = 0, caCorrectCount = 0, caWrongCount = 0;
let allCaArticles = [];

window.showCurrentAffairs = async function() {
    document.getElementById('caLiveScoreCorrect').innerText = "0";
    document.getElementById('caLiveScoreWrong').innerText = "0";
    caCorrectCount = 0; caWrongCount = 0; caStreak = 0;
    const reader = document.getElementById('caArticleReaderBox');
    if (reader) reader.classList.add('hide');
    showScreen('caScreen');
    try {
        const [artSnap, caSnap] = await Promise.all([
            getDocs(collection(db, "ca_articles")),
            allCA.length ? Promise.resolve(null) : getDocs(collection(db, "current_affairs"))
        ]);
        allCaArticles = artSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allCaArticles.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
        if (caSnap) allCA = caSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.error("CA Articles load error:", e);
    }
    filterCA('Articles', document.querySelector('.ca-tab'));
};

function escapeHtmlSimple(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatRichContentBlock(rawText) {
    const txt = String(rawText || '').trim();
    if (!txt) return '';
    // If already contains rich HTML tags from editor, sanitize scripts and return
    if (/<(strong|b|span|div|p|h3|ul|li|br)/i.test(txt)) {
        return txt.replace(/<script[\s\S]*?<\/script>/gi, '');
    }
    const lines = txt.split(/\r?\n/);
    const headingPatterns = /^(important dates|application fee|age limit|vacancy|eligibility|selection process|how to apply|महत्वपूर्ण तिथियाँ|आवेदन शुल्क|आयु सीमा|रिक्ति|योग्यता|चयन प्रक्रिया)/i;
    return lines.map(line => {
        const clean = escapeHtmlSimple(line);
        if (!clean.trim()) return '<div style="height:8px;"></div>';
        const trimmed = clean.trim();
        if (headingPatterns.test(trimmed)) {
            return `<div style="font-weight:700; color:#3730A3; background:#EEF2FF; padding:6px 10px; border-left:3px solid #4F46E5; border-radius:5px; margin:10px 0 6px;">${trimmed}</div>`;
        }
        if (trimmed.endsWith(':')) {
            return `<div style="font-weight:700; color:#1E1B4B; margin:8px 0 4px;">${trimmed}</div>`;
        }
        return `<div style="margin-bottom:4px;">${clean}</div>`;
    }).join('');
}

window.openCaArticleReader = function(articleId) {
    const art = allCaArticles.find(a => a.id === articleId);
    if (!art) return;
    const reader = document.getElementById('caArticleReaderBox');
    const content = document.getElementById('caArticleReaderContent');
    if (!reader || !content) return;
    reader.setAttribute('data-active-ca-id', articleId);

    const pickedTitle = (currentLang === 'hi' && art.titleHi) ? art.titleHi : art.title;
    const pickedBody = (currentLang === 'hi' && art.contentHi) ? art.contentHi : (art.content || art.summary || '');
    const formattedBody = formatRichContentBlock(pickedBody);

    let attachedQsHtml = '';
    const qsList = Array.isArray(art.questions) ? art.questions : [];
    if (qsList.length > 0) {
        attachedQsHtml = `<div style="margin-top:22px; padding-top:18px; border-top:2px solid #E2E8F0;">
            <h3 style="color:#1E1B4B; font-size:17px; margin-bottom:12px;">Practice Questions (${qsList.length})</h3>`;
        qsList.forEach((qItem, idx) => {
            const qText = (currentLang === 'hi' && qItem.qHi) ? qItem.qHi : (qItem.q || '');
            const opts = (currentLang === 'hi' && Array.isArray(qItem.optionsHi) && qItem.optionsHi.some(Boolean)) ? qItem.optionsHi : (qItem.options || []);
            const expText = (currentLang === 'hi' && qItem.expHi) ? qItem.expHi : (qItem.exp || '');
            const ansIdx = Number(qItem.ans ?? 0);

            attachedQsHtml += `
                <div class="ca-question" id="caArtQ_${articleId}_${idx}" style="margin-bottom:16px;">
                    <div style="font-weight:600; font-size:15px; margin-bottom:12px;">${formatRichContentBlock('Q' + (idx + 1) + '. ' + qText)}</div>
                    <div class="ca-options">
                        ${opts.map((opt, oIdx) => opt ? `<label class="ca-option" onclick="checkAttachedCaAnswer('${articleId}', ${idx}, ${oIdx}, ${ansIdx})">${String.fromCharCode(65 + oIdx)}) ${formatRichContentBlock(opt)}</label>` : '').join('')}
                    </div>
                    <div class="ca-explanation" id="caArtExp_${articleId}_${idx}"><b>Explanation:</b> ${formatRichContentBlock(expText || 'N/A')}</div>
                </div>
            `;
        });
        attachedQsHtml += `</div>`;
    }

    content.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
            <span style="background:#EEF2FF; color:#4F46E5; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:6px;">${art.category || 'Current Affairs'}</span>
            ${art.date ? `<span style="font-size:12.5px; color:#64748B; font-weight:600;">${art.date}</span>` : ''}
        </div>
        <h2 style="color:#1E1B4B; font-size:21px; margin:0 0 14px; line-height:1.4;">${pickedTitle}</h2>
        <div style="font-size:14.5px; color:#1E293B; line-height:1.8; background:#F8FAFC; padding:18px; border-radius:10px; border:1px solid #E2E8F0;">
            ${formattedBody}
        </div>
        ${art.pdfLink ? `<div style="margin-top:16px;"><a href="${art.pdfLink}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;">Download Complete Notes / PDF →</a></div>` : ''}
        ${attachedQsHtml}
    `;
    reader.classList.remove('hide');
    document.getElementById('caContentContainer').classList.add('hide');
    try { history.pushState({ screen: 'caScreen', subview: 'caArticle', articleId }, '', '?page=current-affairs'); } catch (e) {}
    reader.scrollIntoView({ behavior: 'smooth' });
};

window.checkAttachedCaAnswer = function(articleId, qIdx, selectedIdx, correctIdx) {
    const qDiv = document.getElementById(`caArtQ_${articleId}_${qIdx}`);
    if (!qDiv || qDiv.getAttribute('data-answered') === 'true') return;
    qDiv.setAttribute('data-answered', 'true');
    qDiv.querySelectorAll('.ca-option').forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if (i === correctIdx) opt.classList.add('correct');
        if (i === selectedIdx && i !== correctIdx) opt.classList.add('wrong');
    });
    const expEl = document.getElementById(`caArtExp_${articleId}_${qIdx}`);
    if (expEl) expEl.style.display = 'block';
    if (selectedIdx === correctIdx) { caCorrectCount++; } else { caWrongCount++; }
    if (document.getElementById('caLiveScoreCorrect')) document.getElementById('caLiveScoreCorrect').innerText = caCorrectCount;
    if (document.getElementById('caLiveScoreWrong')) document.getElementById('caLiveScoreWrong').innerText = caWrongCount;
};

window.closeCaArticleReader = function() {
    const reader = document.getElementById('caArticleReaderBox');
    if (reader) reader.classList.add('hide');
    document.getElementById('caContentContainer').classList.remove('hide');
};

window.filterCA = function(type, btn) {
    document.querySelectorAll('.ca-tab').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
    });
    if (btn) {
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-outline');
    }
    closeCaArticleReader();

    const container = document.getElementById('caContentContainer');
    container.innerHTML = '';

    if (type === 'Articles') {
        if (allCaArticles.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:35px; background:#fff; border-radius:12px; border:1px solid #E2E8F0; color:#64748B;">No Current Affairs articles published yet. Check back soon!</div>';
            return;
        }
        let html = `<div style="display:grid; gap:14px;">`;
        allCaArticles.forEach(art => {
            const dispTitle = (currentLang === 'hi' && art.titleHi) ? art.titleHi : art.title;
            const rawBody = (currentLang === 'hi' && art.contentHi) ? art.contentHi : (art.content || art.summary || '');
            const cleanPreview = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 190);
            const qBadge = (Array.isArray(art.questions) && art.questions.length > 0)
                ? `<span style="background:#ECFDF5; color:#059669; font-size:11px; font-weight:700; padding:3px 8px; border-radius:6px;">📝 ${art.questions.length} Qs</span>` : '';
            html += `
                <div style="background:#ffffff; border:1px solid #E2E8F0; border-left:4px solid #4F46E5; border-radius:12px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                    <div style="flex:1; min-width:250px;">
                        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px;">
                            <span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px;">${art.category || 'Daily News'}</span>
                            ${art.date ? `<span style="font-size:12px; color:#64748B;">📅 ${art.date}</span>` : ''}
                            ${qBadge}
                        </div>
                        <h3 style="color:#1E1B4B; font-size:16.5px; margin:0 0 6px;">${dispTitle}</h3>
                        <p style="font-size:13px; color:#475569; margin:0; line-height:1.55;">${cleanPreview}${cleanPreview.length >= 190 ? '...' : ''}</p>
                    </div>
                    <button class="btn btn-primary" onclick="openCaArticleReader('${art.id}')">${currentLang === 'hi' ? 'पूरा लेख व प्रश्न पढ़ें →' : 'Read Full Article →'}</button>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
        return;
    }

    // Helper: parse item date and check if its month has completed (auto-shift to Monthly CA Revision)
    const parseCaItemDate = (item) => {
        const raw = item.date || item.createdAt || '';
        if (!raw) return new Date();
        const d = new Date(raw);
        return isNaN(d.getTime()) ? new Date() : d;
    };
    const isPastMonthItem = (item) => {
        const d = parseCaItemDate(item);
        const now = new Date();
        return (d.getFullYear() < now.getFullYear()) ||
               (d.getFullYear() === now.getFullYear() && d.getMonth() < now.getMonth());
    };
    const getMonthYearLabel = (item) => {
        const d = parseCaItemDate(item);
        return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    };

    // Unified bilingual pool from BOTH attached article questions AND standalone direct CA questions
    const unifiedCaPool = [];
    allCaArticles.forEach(art => {
        if (!Array.isArray(art.questions) || art.questions.length === 0) return;
        const dispTitle = (currentLang === 'hi' && art.titleHi) ? art.titleHi : art.title;
        const explicitMonthly = String(art.category || '').toLowerCase().includes('month');
        const autoMonthly = explicitMonthly || isPastMonthItem(art);
        art.questions.forEach((qItem, idx) => {
            const qText = (currentLang === 'hi' && qItem.qHi) ? qItem.qHi : (qItem.q || qItem.qHi || '');
            const opts = (currentLang === 'hi' && Array.isArray(qItem.optionsHi) && qItem.optionsHi.some(Boolean))
                ? qItem.optionsHi
                : (qItem.options || qItem.optionsHi || []);
            const expText = (currentLang === 'hi' && qItem.expHi) ? qItem.expHi : (qItem.exp || qItem.expHi || '');
            unifiedCaPool.push({
                id: `${art.id}_q_${idx}`,
                title: dispTitle,
                date: art.date || '',
                monthLabel: getMonthYearLabel(art),
                isMonthly: autoMonthly,
                link: art.pdfLink || '',
                question: qText,
                options: opts,
                correctAnswer: Number(qItem.ans ?? 0),
                explanation: expText
            });
        });
    });

    allCA.forEach((c, idx) => {
        const dispTitle = (currentLang === 'hi' && c.titleHi) ? c.titleHi : (c.title || 'Current Affairs');
        const qText = (currentLang === 'hi' && c.questionHi) ? c.questionHi : (c.question || c.questionHi || '');
        const opts = (currentLang === 'hi' && Array.isArray(c.optionsHi) && c.optionsHi.some(Boolean))
            ? c.optionsHi
            : (c.options || c.optionsHi || []);
        const expText = (currentLang === 'hi' && c.explanationHi) ? c.explanationHi : (c.explanation || c.explanationHi || '');
        const explicitMonthly = String(c.type || '').toLowerCase().includes('month');
        const autoMonthly = explicitMonthly || isPastMonthItem(c);
        unifiedCaPool.push({
            id: c.id || `direct_ca_${idx}`,
            title: dispTitle,
            date: c.date || '',
            monthLabel: getMonthYearLabel(c),
            isMonthly: autoMonthly,
            link: c.link || '',
            question: qText,
            options: opts,
            correctAnswer: Number(c.correctAnswer ?? 0),
            explanation: expText
        });
    });

    let filtered = unifiedCaPool.filter(item => type === 'Monthly' ? item.isMonthly : !item.isMonthly);
    // If Daily tab has 0 current-month questions yet, show latest questions so student never sees blank screen
    if (type === 'Daily' && filtered.length === 0 && unifiedCaPool.length > 0) {
        filtered = unifiedCaPool.slice(0, 30);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:35px; background:#fff; border-radius:12px; border:1px solid #E2E8F0; color:#64748B;">
            ${currentLang === 'hi' ? 'इस सेक्शन में अभी कोई अभ्यास प्रश्न उपलब्ध नहीं है।' : 'No practice questions available in this tab yet.'}
        </div>`;
        return;
    }

    // Month-wise filter bar inside Monthly CA Revision
    if (type === 'Monthly') {
        const months = Array.from(new Set(filtered.map(x => x.monthLabel).filter(Boolean)));
        window._caSelectedMonthFilter = window._caSelectedMonthFilter && months.includes(window._caSelectedMonthFilter)
            ? window._caSelectedMonthFilter
            : 'ALL';
        if (months.length > 0) {
            const pillsHtml = ['ALL', ...months].map(m => {
                const active = window._caSelectedMonthFilter === m;
                const lbl = m === 'ALL' ? (currentLang === 'hi' ? 'सभी महीने' : 'All Months') : m;
                return `<button type="button" class="btn ${active ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px; font-size:12px;" onclick="window._caSelectedMonthFilter='${m}'; filterCA('Monthly', document.querySelectorAll('.ca-tab')[2]);">${lbl}</button>`;
            }).join('');
            container.innerHTML += `<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">${pillsHtml}</div>`;
        }
        if (window._caSelectedMonthFilter !== 'ALL') {
            filtered = filtered.filter(x => x.monthLabel === window._caSelectedMonthFilter);
        }
    }

    const grouped = {};
    filtered.forEach(c => {
        if(!grouped[c.title]) grouped[c.title] = { date: c.date, link: c.link, questions: [] };
        grouped[c.title].questions.push(c);
    });

    for(let title in grouped) {
        const article = grouped[title];
        let articleHtml = `<div class="ca-article"><h3 style="color:var(--primary); margin-bottom:5px;">${title}</h3><p style="font-size:13px; color:#666; margin-bottom:10px;">📅 ${article.date}</p>`;
        if(article.link) articleHtml += `<a href="${article.link}" target="_blank" class="btn btn-outline" style="padding:6px 12px; font-size:12px;">📄 ${currentLang === 'hi' ? 'पूरा लेख / PDF पढ़ें' : 'Read Full Article / PDF'}</a>`;
        articleHtml += `</div>`;

        let qHtml = '';
        article.questions.forEach((q, idx) => {
            const safeExp = (q.explanation || '').replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\r?\n/g, ' ');
            qHtml += `<div class="ca-question" id="caQ_${q.id}"><p style="font-weight:600; margin-bottom:15px;">Q${idx+1}. ${q.question}</p><div class="ca-options">`;
            q.options.forEach((opt, i) => { if(opt && opt.trim() !== "") qHtml += `<label class="ca-option" onclick="checkCAAnswer('${q.id}', ${i}, ${q.correctAnswer}, '${type}', '${safeExp}')">${String.fromCharCode(65+i)}) ${opt}</label>`; });
            qHtml += `</div><div class="ca-explanation" id="caExp_${q.id}"><b>${currentLang === 'hi' ? 'व्याख्या:' : 'Explanation:'}</b> ${q.explanation || 'N/A'}</div></div>`;
        });
        container.innerHTML += articleHtml + qHtml;
    }
};

window.checkCAAnswer = function(qId, selectedIndex, correctIndex, type, explanation) {
    const qDiv = document.getElementById(`caQ_${qId}`);
    if(qDiv.getAttribute('data-answered') === 'true') return;
    qDiv.setAttribute('data-answered', 'true');

    qDiv.querySelectorAll('.ca-option').forEach((opt, i) => {
        opt.style.pointerEvents = 'none';
        if(i === correctIndex) opt.classList.add('correct');
        if(i === selectedIndex && i !== correctIndex) opt.classList.add('wrong');
    });

    if(explanation) document.getElementById(`caExp_${qId}`).style.display = 'block';

    if(selectedIndex === correctIndex) {
        caCorrectCount++; caStreak = caStreak > 0 ? caStreak + 1 : 1;
        if(caStreak >= 3) { showPopup('popupSuccess'); caStreak = 0; }
    } else {
        caWrongCount++; caStreak = caStreak < 0 ? caStreak - 1 : -1;
        if(caStreak <= -3) { showPopup('popupWarning'); caStreak = 0; }
    }
    document.getElementById('caLiveScoreCorrect').innerText = caCorrectCount;
    document.getElementById('caLiveScoreWrong').innerText = caWrongCount;
};

function showPopup(id) {
    const popup = document.getElementById(id);
    if (!popup) return;
    popup.classList.add('show');
    setTimeout(() => { popup.classList.remove('show'); }, 3000);
}

// =========================================================================
// CBT TEST ENGINE & ANTI-CHEATING (With Processing Overlay on Load)
// =========================================================================
function handleVisibilityChange() {
    if (document.hidden && currentScreen === 'testScreen' && !isTestSubmitting && isCurrentTestLive) {
        handleAntiCheatViolation("Tab switching or minimizing the browser window is strictly prohibited!");
    }
}

function handleWindowBlur() {}

function updateFullScreenButtonLabel() {
    const lbl = document.getElementById('fsBtnText');
    if (lbl) lbl.innerText = document.fullscreenElement ? "Exit Full Screen" : "Full Screen";
}

function handleFullScreenChange() {
    updateFullScreenButtonLabel();
    if (!document.fullscreenElement && currentScreen === 'testScreen' && !isTestSubmitting && isCurrentTestLive) {
        if (Date.now() - testStartTimestamp > 5000) {
            handleAntiCheatViolation("You exited Full-Screen mode! Live Exam must be taken in Full-Screen.");
        }
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
    const now = Date.now();
    if (now - testStartTimestamp < 4000) return;
    if (now - lastWarningTimestamp < 3000) return;
    lastWarningTimestamp = now;
    tabSwitchWarnings++;
    const badge = document.getElementById('warningCounterBadge');
    if (badge) {
        badge.classList.remove('hide');
        badge.innerText = `Warnings: ${tabSwitchWarnings}/3`;
    }

    if (tabSwitchWarnings >= 3) {
        alert(`FINAL WARNING (3/3): ${reason}\n\nYour test is being auto-submitted immediately due to exam rule violations.`);
        finalSubmitTest();
    } else {
        alert(`EXAM WARNING (${tabSwitchWarnings}/3): ${reason}\n\nPlease stay on the test screen. On the 3rd warning, your test will be automatically submitted!`);
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
};

window.toggleStartButton = function() {
    const isChecked = document.getElementById('instCheckbox').checked;
    const btn = document.getElementById('btnStartActualTest');
    btn.disabled = !isChecked;
    btn.style.opacity = isChecked ? '1' : '0.5';
    btn.style.cursor = isChecked ? 'pointer' : 'not-allowed';
};

window.startActualTest = function() {
    let selectedLang = pendingTestDetails.lang;
    if(selectedLang === "Both") selectedLang = document.getElementById('instLangSelect').value;

    try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(updateFullScreenButtonLabel).catch(() => {});
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
};

async function initTest(testId, testName, duration, marks, negMark, hasNeg, lang, isResume, isLive = false, liveEnd = "", posMark = 1) {
    isTestSubmitting = false;
    tabSwitchWarnings = 0;
    testStartTimestamp = Date.now();
    lastWarningTimestamp = 0;
    isCurrentTestLive = isLive;
    currentLiveEndTime = liveEnd;

    showProcessing("Downloading Test & Questions...", "Preparing your bilingual CBT exam interface");

    currentTestId = testId;
    currentTestName = testName;
    currentTestMarks = marks;
    currentTestPosMark = Number(posMark) || 1;
    currentTestNegMark = hasNeg === "Yes" ? Number(negMark) : 0;
    currentTestLanguage = lang || "Both";
    const switcher = document.getElementById('liveTestLangSwitcher');
    if (switcher) switcher.value = currentTestLanguage;

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

    try {
        const q = query(collection(db, "questions"), where("testId", "==", testId));
        const qSnap = await getDocs(q);

        if(!qSnap.empty) {
            const resumeKey = 'tg_resume_' + currentStudent.loginId + '_' + testId;
            let resumeData = !isLive ? localStorage.getItem(resumeKey) : null;
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

                    const autoUid = qData.uniqueId || `${testId}-Q${String(Math.floor(100 + Math.random()*900))}`;
                    return {
                        qH: qData.questionHindi || qData.question || "",
                        qE: qData.questionEnglish || "",
                        uniqueId: autoUid,
                        opts: optsArray,
                        ans: newAnsIndex,
                        exp: qData.explanation || "No explanation provided.",
                        section: qData.section || qData.subject || "",
                        subject: qData.subject || qData.section || "",
                        marks: qPos,
                        neg: qNeg
                    };
                });

                totalTime = duration * 60; timeLeft = totalTime; currentQIndex = 0; userAnswers = {}; markedForReview = {}; visitedQuestions = {}; questionTimeMap = {};
            }

            const container = document.getElementById('paletteContainer'); container.innerHTML = '';
            testQuestions.forEach((_, i) => {
                const btn = document.createElement('button'); btn.className = 'pallet-btn'; btn.innerText = i + 1;
                btn.onclick = () => { currentQIndex = i; loadQuestion(); }; container.appendChild(btn);
            });

            hideProcessing();
            showScreen('testScreen');
            initCbtSectionalTimer(testQuestions, totalTime);
            loadQuestion();
            startTimer();
        } else {
            hideProcessing();
            isTestSubmitting = true;
            disableAntiCheating();
            if (document.fullscreenElement) { try { document.exitFullscreen().catch(() => {}); } catch(e) {} }
            alert("No questions found for Test ID: " + testId + ". Please check Test ID in Admin Panel.");
            goDashboard();
            return;
        }
    } catch (e) {
        console.error(e);
        hideProcessing();
        isTestSubmitting = true;
        disableAntiCheating();
        if (document.fullscreenElement) { try { document.exitFullscreen().catch(() => {}); } catch(e) {} }
        alert("Failed to load test: " + e.message);
        goDashboard();
    }
}

let saveProgressTimer = null;
function saveProgress() {
    if (!isCurrentTestLive && isLoggedIn && currentStudent.loginId) {
        clearTimeout(saveProgressTimer);
        saveProgressTimer = setTimeout(() => {
            const resumeKey = 'tg_resume_' + currentStudent.loginId + '_' + currentTestId;
            try {
                localStorage.setItem(resumeKey, JSON.stringify({ testQuestions, userAnswers, markedForReview, visitedQuestions, timeLeft, currentQIndex }));
            } catch (e) {}
        }, 400);
    }
}

function startTimer() {
    clearInterval(timerInterval); const timerEl = document.getElementById('timerDisplay'); timerEl.classList.remove('timer-danger');
    timerInterval = setInterval(() => {
        timeLeft--; if(timeLeft % 5 === 0) saveProgress();
        tickSectionalTimerOneSec();
        let h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = timeLeft % 60;
        timerEl.innerText = `${h>0?h+':':''}${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        if(timeLeft <= (totalTime * 0.2) && timeLeft > 0) timerEl.classList.add('timer-danger');
        if(timeLeft <= 0) { clearInterval(timerInterval); finalSubmitTest(); }
    }, 1000);
}

function loadQuestion() {
    const q = testQuestions[currentQIndex]; visitedQuestions[currentQIndex] = true;
    const scrollBox = document.getElementById('cbtQuestionScrollBox');
    if (scrollBox) scrollBox.scrollTop = 0;
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
    if(currentTestLanguage === "Hindi") qHtml = `<div>${q.qH || q.qE}</div>`;
    else if(currentTestLanguage === "English") qHtml = `<div>${q.qE || q.qH}</div>`;
    else {
        qHtml = `<div>${q.qH || ''}</div>` + (q.qE && q.qE !== q.qH ? `<div class="q-lang-en" style="margin-top:8px; color:#334155; font-size:15px;">${q.qE}</div>` : '');
    }
    document.getElementById('questionText').innerHTML = qHtml;

    const optContainer = document.getElementById('optionsContainer'); optContainer.innerHTML = '';
    q.opts.forEach((opt, i) => {
        let labelHtml = "";
        if(currentTestLanguage === "Hindi") labelHtml = opt.h || opt.e;
        else if(currentTestLanguage === "English") labelHtml = opt.e || opt.h;
        else {
            labelHtml = (opt.h && opt.e && opt.h !== opt.e) ? `${opt.h} <span class="opt-en" style="color:#475569; font-size:13.5px;">(${opt.e})</span>` : (opt.h || opt.e);
        }

        if(labelHtml && labelHtml.trim() !== "") {
            const isSel = userAnswers[currentQIndex] === i;
            const label = document.createElement('label');
            label.className = 'cbt-option-card' + (isSel ? ' selected-opt' : '');
            label.innerHTML = `<input type="radio" name="option" value="${i}" ${isSel ? 'checked' : ''}> <div style="flex:1; font-size:15px;">${labelHtml}</div>`;
            label.querySelector('input').onchange = () => {
                userAnswers[currentQIndex] = i;
                optContainer.querySelectorAll('.cbt-option-card').forEach(c => c.classList.remove('selected-opt'));
                label.classList.add('selected-opt');
                saveProgress();
                updatePalette();
            };
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
    startCbtQuestionStopwatch();
}

function updatePalette() {
    const buttons = document.getElementById('paletteContainer').children;
    let cAns = 0, cNotAns = 0, cNotVis = 0, cMarked = 0;
    for (let i = 0; i < testQuestions.length; i++) {
        buttons[i].className = 'pallet-btn';
        if (userAnswers[i] !== undefined && markedForReview[i]) { buttons[i].classList.add('answered-marked'); cMarked++; cAns++; }
        else if (markedForReview[i]) { buttons[i].classList.add('marked'); cMarked++; }
        else if (userAnswers[i] !== undefined) { buttons[i].classList.add('answered'); cAns++; }
        else if (visitedQuestions[i]) { buttons[i].classList.add('not-answered'); cNotAns++; }
        else { cNotVis++; }
        if (i === currentQIndex) buttons[i].classList.add('active');
    }
    if (document.getElementById('legAnswered')) document.getElementById('legAnswered').innerText = cAns;
    if (document.getElementById('legNotAnswered')) document.getElementById('legNotAnswered').innerText = cNotAns;
    if (document.getElementById('legNotVisited')) document.getElementById('legNotVisited').innerText = cNotVis;
    if (document.getElementById('legMarked')) document.getElementById('legMarked').innerText = cMarked;
}

window.toggleCbtSidebar = function() {
    const sb = document.getElementById('cbtRightSidebar');
    const arrow = document.getElementById('cbtSidebarArrow');
    const btnText = document.getElementById('paletteBtnText');
    const topBtn = document.getElementById('btnTogglePaletteTop');
    if (!sb) return;
    if (window.innerWidth <= 820) {
        sb.classList.toggle('mobile-drawer-open');
        const isOpen = sb.classList.contains('mobile-drawer-open');
        if (btnText) btnText.innerText = isOpen ? 'Hide Palette' : 'Show Palette';
    } else {
        sb.classList.toggle('hidden-sidebar');
        const isHidden = sb.classList.contains('hidden-sidebar');
        if (arrow) arrow.textContent = isHidden ? '‹' : '›';
        if (btnText) btnText.innerText = isHidden ? 'Show Palette' : 'Hide Palette';
        if (topBtn) topBtn.classList.toggle('active-pill', !isHidden);
    }
};

window.switchTestLanguageLive = function(newLang) {
    currentTestLanguage = newLang;
    loadQuestion();
};

let repScreenshotBase64 = "";

window.reportCurrentQuestion = function() {
    const q = testQuestions[currentQIndex];
    if (!q) return;
    repScreenshotBase64 = "";
    if (document.getElementById('repModalQId')) document.getElementById('repModalQId').innerText = `${q.uniqueId} (Test: ${currentTestId})`;
    if (document.getElementById('repWrongDesc')) document.getElementById('repWrongDesc').value = "";
    if (document.getElementById('repCorrectSuggestion')) document.getElementById('repCorrectSuggestion').value = "";
    if (document.getElementById('repScreenshotFile')) document.getElementById('repScreenshotFile').value = "";
    if (document.getElementById('repScreenshotUrl')) document.getElementById('repScreenshotUrl').value = "";
    if (document.getElementById('repScreenshotPreviewBox')) document.getElementById('repScreenshotPreviewBox').classList.add('hide');
    const modal = document.getElementById('reportQuestionModal');
    if (modal) modal.classList.remove('hide');
};

window.closeReportQuestionModal = function() {
    const modal = document.getElementById('reportQuestionModal');
    if (modal) modal.classList.add('hide');
};

window.handleReportScreenshotSelect = function(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxW = 720;
            const scale = img.width > maxW ? (maxW / img.width) : 1;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            repScreenshotBase64 = canvas.toDataURL('image/jpeg', 0.65);
            const prevImg = document.getElementById('repScreenshotPreviewImg');
            const prevBox = document.getElementById('repScreenshotPreviewBox');
            if (prevImg) prevImg.src = repScreenshotBase64;
            if (prevBox) prevBox.classList.remove('hide');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.submitStructuredQuestionReport = async function() {
    const q = testQuestions[currentQIndex];
    if (!q) return;
    const issueType = document.getElementById('repIssueType').value;
    const wrongDesc = document.getElementById('repWrongDesc').value.trim();
    const correctSugg = document.getElementById('repCorrectSuggestion').value.trim();
    const imgUrl = document.getElementById('repScreenshotUrl').value.trim();

    if (!wrongDesc && !correctSugg) {
        alert("Kripya batayein ki kya galti hai ya sahi jawab kya hoga!");
        return;
    }

    const btn = document.getElementById('btnSubmitReportQ');
    if (btn) { btn.disabled = true; btn.innerText = "Sending Report..."; }

    const reportPayload = {
        testId: currentTestId,
        testName: currentTestName,
        uniqueId: q.uniqueId,
        questionHindi: q.qH || "",
        questionEnglish: q.qE || "",
        issueType: issueType,
        issue: wrongDesc,
        suggestedCorrection: correctSugg,
        screenshotData: repScreenshotBase64 || imgUrl || "",
        status: "Pending",
        reportedBy: `${currentStudent.name || 'Student'} (${currentStudent.loginId || 'N/A'})`,
        reporterEmail: currentStudent.email || "",
        timestamp: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "reported_questions"), reportPayload);

        callEmailService({
            action: "report_question",
            uniqueId: q.uniqueId,
            testId: currentTestId,
            testName: currentTestName,
            questionHindi: q.qH || "",
            questionEnglish: q.qE || "",
            issueType: issueType,
            issue: wrongDesc,
            suggestedCorrection: correctSugg,
            screenshotUrl: imgUrl || (repScreenshotBase64 ? "[Screenshot Attached in Admin Panel]" : "No Screenshot"),
            reportedBy: reportPayload.reportedBy,
            reporterEmail: reportPayload.reporterEmail
        });

        closeReportQuestionModal();
        alert(`Report Sent! Question ID (${q.uniqueId}) ki jankari Admin ko bhej di gayi hai.`);
    } catch (e) {
        alert("Error submitting report: " + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "🚀 Send Report to Admin"; }
    }
};

window.nextQuestion = function() { flushCurrentCbtQuestionTime(); saveProgress(); if (currentQIndex < testQuestions.length - 1) { currentQIndex++; loadQuestion(); } else showSubmitModal(); };
window.prevQuestion = function() { flushCurrentCbtQuestionTime(); saveProgress(); if (currentQIndex > 0) { currentQIndex--; loadQuestion(); } };
window.toggleMark = function() { markedForReview[currentQIndex] = !markedForReview[currentQIndex]; saveProgress(); loadQuestion(); };
window.clearResponse = function() { delete userAnswers[currentQIndex]; saveProgress(); loadQuestion(); };
window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(updateFullScreenButtonLabel).catch(() => {});
    } else if (document.exitFullscreen) {
        document.exitFullscreen().then(updateFullScreenButtonLabel).catch(() => {});
    }
};

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
};

window.closeSubmitModal = function() { document.getElementById('submitModal').classList.add('hide'); };

window.finalSubmitTest = async function() {
    if (isTestSubmitting && currentScreen !== 'testScreen') return;
    flushCurrentCbtQuestionTime();
    clearInterval(cbtQuestionTimerInterval);
    isTestSubmitting = true;
    closeSubmitModal();
    clearInterval(timerInterval);
    if (isLoggedIn && currentStudent.loginId) {
        localStorage.removeItem('tg_resume_' + currentStudent.loginId + '_' + currentTestId);
    }

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

    const nowIso = new Date().toISOString();
    const cleanQuestionsState = testQuestions.map(q => ({
        qH: q.qH || "",
        qE: q.qE || "",
        uniqueId: q.uniqueId || "",
        opts: (q.opts || []).map(o => ({ h: o.h || "", e: o.e || "" })),
        ans: Number(q.ans ?? 0),
        exp: q.exp || "",
        marks: Number(q.marks || 1),
        neg: Number(q.neg || 0)
    }));

    const resultPayload = {
        timestamp: nowIso,
        loginId: String(currentStudent.loginId || "").trim(),
        studentName: currentStudent.name || "Student",
        studentEmail: currentStudent.email || "",
        testId: currentTestId,
        testName: currentTestName,
        correctCount,
        wrongCount,
        negDeducted: negDeducted.toFixed(2),
        finalScore: score.toFixed(2),
        totalMarks: currentTestMarks,
        percent: percentStr,
        isLivePending: Boolean(isCurrentTestLive),
        liveEndTime: currentLiveEndTime || "",
        userAnswers: { ...userAnswers },
        questionTimeMap: { ...questionTimeMap },
        testQuestionsState: cleanQuestionsState
    };

    userPastResults[currentTestId] = resultPayload;

    // Live test result is released simultaneously on Dashboard after liveEndTime (NO email sent)
    if (isCurrentTestLive) {
        showScreen('liveSubmittedScreen');
        document.getElementById('liveReleaseTimeDisplay').innerText = formatDateTimeReadable(currentLiveEndTime);
    } else {
        showScreen('resultScreen');
        renderCbtTimeHeatmap(testQuestions, userAnswers, questionTimeMap);
        saveMistakesToNotebook(currentTestName, testQuestions, userAnswers, questionTimeMap);
        document.getElementById('resTestName').innerText = currentTestName;
        document.getElementById('finalScore').innerText = score.toFixed(2);
        document.getElementById('totalScore').innerText = currentTestMarks;
        document.getElementById('statCorrect').innerText = correctCount;
        document.getElementById('statWrong').innerText = wrongCount;
        document.getElementById('statSkipped').innerText = skippedCount;
        document.getElementById('statNeg').innerText = negDeducted.toFixed(2);
        document.getElementById('scoreCircle').style.background = `conic-gradient(var(--accent) ${percent}%, #E5E7EB ${percent}%)`;
        document.getElementById('rankText').innerText = "Saving & Calculating Rank...";
        currentResultData = { score: score.toFixed(2), total: currentTestMarks, rank: 1, totalStudents: 1, correct: correctCount, wrong: wrongCount, neg: negDeducted.toFixed(2), percent: percentStr };
    }

    try {
        await addDoc(collection(db, "results"), resultPayload);
        if (!isCurrentTestLive) {
            const rankSnap = await getDocs(query(collection(db, "results"), where("testId", "==", currentTestId)));
            let allResults = rankSnap.docs.map(d => d.data()).sort((a, b) => parseFloat(b.finalScore) - parseFloat(a.finalScore));
            let userRank = 1;
            allResults.forEach((r, index) => { if(r.loginId === currentStudent.loginId && r.finalScore === score.toFixed(2)) userRank = index + 1; });
            const rankEl = document.getElementById('rankText');
            if (rankEl) rankEl.innerText = `Your Rank: ${userRank} out of ${allResults.length} students`;
            currentResultData = { score: score.toFixed(2), total: currentTestMarks, rank: userRank, totalStudents: allResults.length, correct: correctCount, wrong: wrongCount, neg: negDeducted.toFixed(2), percent: percentStr };
        }
    } catch(e) {
        console.error("Background result save error:", e);
    }
};

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
};

window.viewPastAnalysis = async function(testId) {
    let res = userPastResults[testId];
    if(!res) return alert("Result not found!");

    if (res.isLivePending && (!res.liveEndTime || isNaN(new Date(res.liveEndTime)) || new Date() <= new Date(res.liveEndTime))) {
        return alert(`⏳ Live Test results are locked until ${formatDateTimeReadable(res.liveEndTime)}.`);
    }

    testQuestions = res.testQuestionsState || []; userAnswers = res.userAnswers || {}; questionTimeMap = res.questionTimeMap || {}; currentTestLanguage = "Both"; currentTestName = res.testName;
    showScreen('resultScreen');
    renderCbtTimeHeatmap(testQuestions, userAnswers, questionTimeMap);

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
};

window.downloadScorecard = function() {
    if(!currentResultData) return alert("No result data available!");
    let html = `<html><head><title>Scorecard - TaiyariGhar</title><style>body{font-family:sans-serif; text-align:center; padding:50px;} h1{color:#4F46E5;} table{margin:20px auto; border-collapse:collapse; width:70%;} th,td{border:1px solid #ddd; padding:12px;} .footer{margin-top:30px; font-size:12px; color:#666;}</style></head><body><h1>🏠 TaiyariGhar</h1><h2>Test Scorecard</h2><table><tr><th>Student Name</th><td>${currentStudent.name}</td></tr><tr><th>Login ID</th><td>${currentStudent.loginId}</td></tr><tr><th>Test Name</th><td>${currentTestName}</td></tr><tr><th>Total Questions</th><td>${testQuestions.length}</td></tr><tr><th>Correct Answers</th><td style="color:green; font-weight:bold;">${currentResultData.correct}</td></tr><tr><th>Wrong Answers</th><td style="color:red; font-weight:bold;">${currentResultData.wrong}</td></tr><tr><th>Negative Deducted</th><td style="color:red;">-${currentResultData.neg}</td></tr><tr><th>Final Score</th><td>${currentResultData.score} / ${currentResultData.total}</td></tr><tr><th>Percentage</th><td>${currentResultData.percent}%</td></tr><tr><th>Rank</th><td>${currentResultData.rank} ${currentResultData.totalStudents !== '-' ? '(out of '+currentResultData.totalStudents+')' : ''}</td></tr></table><div class="footer">मेहनत आपकी, साथ हमारा! | Official Support: support@taiyarighar.in</div></body></html>`;
    let w = window.open('', '_blank'); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
};

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
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW err', err)); });
}


// Capture Student Referral Code (?ref=TGxxxx) if present in URL
(function captureUrlReferral() {
    try {
        const p = new URLSearchParams(window.location.search);
        const ref = (p.get('ref') || '').trim().toUpperCase();
        if (ref && ref.startsWith('TG')) {
            localStorage.setItem('tg_pending_student_ref', ref);
        }
    } catch (e) {}
})();

history.replaceState({ screen: 'homeScreen' }, '', '');

window.onload = async () => {
    applyLanguage();
    resetSessionMemory();
    let savedUser = localStorage.getItem('tg_user');
    if(savedUser) {
        try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && parsedUser.loginId) {
                currentStudent = parsedUser;
                isLoggedIn = true;
                isFirstLoginSession = false;
                updateHeaderUI();
                startSingleSessionWatcher();
                await loadStudentPracticeProgress();
                await fetchSettingsAndTests();
                return;
            }
        } catch(e) {
            localStorage.removeItem('tg_user');
        }
    }
    await fetchSettingsAndTests();
};

// =========================================================================
// JOBS, EXAM SYLLABUS & LATEST UPDATES HUB
// =========================================================================
function parseDateSafeMs(val) {
    if (!val) return 0;
    if (typeof val === 'object' && typeof val.seconds === 'number') return val.seconds * 1000;
    const ms = new Date(val).getTime();
    return Number.isNaN(ms) ? 0 : ms;
}

window.openUpdatesHub = async function() {
    showScreen('updatesScreen');
    closeJobDetailReader(false);
    const container = document.getElementById('updatesContentContainer');
    if ((!allJobUpdates || allJobUpdates.length === 0)) {
        try {
            const cached = localStorage.getItem('tg_cached_job_updates_v1');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) allJobUpdates = parsed;
            }
        } catch (e) {}
    }
    if (container && (!allJobUpdates || allJobUpdates.length === 0)) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#6B7280;">Loading Jobs, Admit Cards, Results &amp; Syllabus...</div>`;
    }
    const defaultTab = document.querySelector('.upd-tab');
    if (allJobUpdates && allJobUpdates.length > 0) {
        filterUpdates('All', defaultTab);
    }
    try {
        const snap = await getDocs(collection(db, "job_updates"));
        const freshList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        freshList.sort((a, b) => parseDateSafeMs(b.createdAt || b.updatedAt || b.date) - parseDateSafeMs(a.createdAt || a.updatedAt || a.date));
        allJobUpdates = freshList;
        try { localStorage.setItem('tg_cached_job_updates_v1', JSON.stringify(freshList.slice(0, 80))); } catch (e) {}
    } catch (e) {
        console.error("Error loading job updates:", e);
    }
    filterUpdates('All', defaultTab);
};

window.openJobDetailReader = function(jobId) {
    const item = allJobUpdates.find(u => u.id === jobId);
    if (!item) return;
    const box = document.getElementById('jobDetailReaderBox');
    const content = document.getElementById('jobDetailReaderContent');
    if (!box || !content) return;

    const linksArray = Array.isArray(item.links) && item.links.length > 0
        ? item.links
        : (item.link ? [{ label: "Apply Online / Official Notification", url: item.link }] : []);

    let linksTableHtml = '';
    if (linksArray.length > 0) {
        linksTableHtml = `
            <div style="margin-top:20px; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden;">
                <div style="background:#1E1B4B; color:#ffffff; padding:11px 16px; font-weight:700; font-size:14px; text-align:center;">
                    Important Links (Direct Official Portals)
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:13.5px;">
                    <tbody>
                        ${linksArray.map(l => `
                            <tr style="border-bottom:1px solid #E2E8F0;">
                                <td style="padding:12px 16px; font-weight:700; color:#1E293B; width:55%; background:#F8FAFC;">${l.label || 'Important Link'}</td>
                                <td style="padding:12px 16px; text-align:center;">
                                    <a href="${l.url}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none; padding:7px 16px; font-size:12.5px;">Click Here →</a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    const pickedTitle = (currentLang === 'hi' && item.titleHi) ? item.titleHi : item.title;
    const pickedDesc = (currentLang === 'hi' && item.descriptionHi) ? item.descriptionHi : (item.description || '');
    const descHtml = formatRichContentBlock(pickedDesc);
    content.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
            <span style="background:#EEF2FF; color:#4F46E5; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:6px;">${item.category || 'Latest Job'}</span>
            ${item.exam ? `<span style="background:#F1F5F9; color:#334155; font-size:11.5px; font-weight:600; padding:4px 10px; border-radius:6px;">${item.exam}</span>` : ''}
            ${item.date ? `<span style="font-size:12.5px; color:#64748B; font-weight:600;">📅 Post Date: ${item.date}</span>` : ''}
        </div>
        <h2 style="color:#1E1B4B; font-size:21px; margin:0 0 12px; line-height:1.4;">${pickedTitle}</h2>
        ${descHtml ? `<div style="font-size:14px; color:#1E293B; line-height:1.78; background:#F8FAFC; padding:18px; border-radius:10px; border:1px solid #E2E8F0;">${descHtml}</div>` : ''}
        ${linksTableHtml}
    `;

    box.setAttribute('data-active-job-id', jobId);
    box.classList.remove('hide');
    document.getElementById('updatesContentContainer').classList.add('hide');
    try { history.pushState({ screen: 'updatesScreen', subview: 'jobDetail', jobId }, '', '?page=updates'); } catch (e) {}
    box.scrollIntoView({ behavior: 'smooth' });
};

window.closeJobDetailReader = function() {
    const box = document.getElementById('jobDetailReaderBox');
    if (box) box.classList.add('hide');
    const cont = document.getElementById('updatesContentContainer');
    if (cont) cont.classList.remove('hide');
};

window.filterUpdates = function(categoryFilter, btn) {
    document.querySelectorAll('.upd-tab').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
    });
    if (btn) {
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-outline');
    }
    closeJobDetailReader();

    const container = document.getElementById('updatesContentContainer');
    if (!container) return;

    const matchesUpdateCategory = (catRaw, filterKey) => {
        const c = String(catRaw || '').trim().toLowerCase();
        const k = String(filterKey || '').trim().toLowerCase();
        if (!k || k === 'all') return true;
        if (k.includes('latest job') || k === 'job' || k === 'jobs') {
            return c.includes('job') || c.includes('vacancy') || c.includes('bharti') || c.includes('recruitment') || !c;
        }
        if (k.includes('admit')) return c.includes('admit');
        if (k.includes('result')) return c.includes('result');
        if (k.includes('syllabus')) return c.includes('syllabus');
        return c.includes(k);
    };

    // 4-Column Sarkari-Result Style Board when "All" is selected
    if (categoryFilter === 'All') {
        const columns = [
            { key: 'Latest Job', title: '💼 Latest Jobs', headerBg: '#1E1B4B' },
            { key: 'Admit Card', title: '🎫 Admit Card', headerBg: '#0F766E' },
            { key: 'Result',     title: '🏆 Result',     headerBg: '#B45309' },
            { key: 'Syllabus',   title: '📚 Exam Syllabus', headerBg: '#4338CA' }
        ];

        let boardHtml = `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(245px, 1fr)); gap:16px; align-items:start;">`;
        columns.forEach(col => {
            const items = allJobUpdates.filter(u => matchesUpdateCategory(u.category, col.key));
            boardHtml += `
                <div style="background:#ffffff; border:1px solid #CBD5E1; border-radius:12px; overflow:hidden; box-shadow:0 3px 10px rgba(15,23,42,0.04);">
                    <div style="background:${col.headerBg}; color:#ffffff; padding:12px 14px; font-weight:700; font-size:14.5px; text-align:center;">
                        ${col.title}
                    </div>
                    <div style="padding:10px 12px;">
                        ${items.length === 0
                            ? `<p style="font-size:12.5px; color:#64748B; text-align:center; padding:18px 6px;">No updates yet</p>`
                            : `<ul style="list-style:none; padding:0; margin:0;">
                                ${items.slice(0, 16).map(item => `
                                    <li style="padding:9px 4px; border-bottom:1px solid #F1F5F9;">
                                        <a href="javascript:void(0)" onclick="openJobDetailReader('${item.id}')" style="color:#1D4ED8; font-weight:600; font-size:13px; text-decoration:none; line-height:1.45; display:block;">
                                            ▸ ${(currentLang === 'hi' && item.titleHi) ? item.titleHi : item.title}
                                        </a>
                                        ${item.date ? `<span style="font-size:11px; color:#64748B;">${item.date}</span>` : ''}
                                    </li>
                                `).join('')}
                               </ul>`
                        }
                    </div>
                </div>
            `;
        });
        boardHtml += `</div>`;
        container.innerHTML = boardHtml;
        return;
    }

    const filtered = allJobUpdates.filter(u => matchesUpdateCategory(u.category, categoryFilter));
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:35px; background:#ffffff; border-radius:14px; border:1px solid #E2E8F0; color:#6B7280;">No updates published in ${categoryFilter} yet. Check back soon!</div>`;
        return;
    }

    let html = `<div style="display:grid; gap:14px;">`;
    filtered.forEach(u => {
        const cat = u.category || 'Latest Job';
        html += `
            <div style="background:#ffffff; border:1px solid #E2E8F0; border-left:4px solid #4F46E5; border-radius:12px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                <div style="flex:1; min-width:250px;">
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px;">
                        <span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px;">${cat}</span>
                        ${u.date ? `<span style="font-size:12px; color:#64748B; font-weight:500;">📅 ${u.date}</span>` : ''}
                    </div>
                    <h3 style="color:#1E1B4B; font-size:16px; margin:0 0 6px;">${u.title}</h3>
                    ${u.description ? `<p style="font-size:13px; color:#475569; margin:0; line-height:1.55;">${u.description.slice(0, 160)}${u.description.length > 160 ? '...' : ''}</p>` : ''}
                </div>
                <button class="btn btn-primary" onclick="openJobDetailReader('${u.id}')">View Details &amp; Links →</button>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
};

// Load Dynamic Promo Banners from Firestore (if configured in Admin Panel)
async function loadDynamicPromoBanners() {
    try {
        const bSnap = await getDoc(doc(db, "settings", "banners"));
        if (!bSnap.exists()) return;
        const b = bSnap.data();
        const slots = [
            { key: 'homeTop',     slotId: 'promoSlotHomeTop',     imgId: 'promoImgHomeTop',     linkId: 'promoLinkHomeTop' },
            { key: 'homeBottom',  slotId: 'promoSlotHomeBottom',  imgId: 'promoImgHomeBottom',  linkId: 'promoLinkHomeBottom' },
            { key: 'caTop',       slotId: 'promoSlotCaTop',       imgId: 'promoImgCaTop',       linkId: 'promoLinkCaTop' },
            { key: 'caBottom',    slotId: 'promoSlotCaBottom',    imgId: 'promoImgCaBottom',    linkId: 'promoLinkCaBottom' },
            { key: 'updatesTop',  slotId: 'promoSlotUpdatesTop',  imgId: 'promoImgUpdatesTop',  linkId: 'promoLinkUpdatesTop' },
            { key: 'jobBottom',   slotId: 'promoSlotJobBottom',   imgId: 'promoImgJobBottom',   linkId: 'promoLinkJobBottom' }
        ];
        slots.forEach(s => {
            const cfg = b[s.key];
            if (!cfg) return;
            const slotEl = document.getElementById(s.slotId);
            const imgEl = document.getElementById(s.imgId);
            const linkEl = document.getElementById(s.linkId);
            if (cfg.active === false && slotEl) {
                slotEl.style.display = 'none';
                return;
            }
            if (cfg.imgUrl && imgEl) {
                imgEl.src = cfg.imgUrl;
                if (slotEl) slotEl.style.display = 'block';
            }
            if (cfg.linkUrl && linkEl) {
                linkEl.removeAttribute('onclick');
                linkEl.href = cfg.linkUrl;
                if (cfg.linkUrl.startsWith('http')) {
                    linkEl.target = '_blank';
                    linkEl.rel = 'noopener';
                }
            }
        });
    } catch (e) {
        console.warn("Dynamic banners fallback active:", e);
    }
}
loadDynamicPromoBanners();

// =========================================================================
// COMPACT HEADER DROPDOWN CONTROLS
// =========================================================================
window.toggleNavDropdown = function(e, id) {
    if (e) e.stopPropagation();
    const target = document.getElementById(id)?.parentElement;
    const wasOpen = target && target.classList.contains('open');
    closeAllNavDropdowns();
    if (target && !wasOpen) target.classList.add('open');
};

window.closeAllNavDropdowns = function() {
    document.querySelectorAll('.tg-nav-dropdown').forEach(d => d.classList.remove('open'));
};

document.addEventListener('click', function() {
    closeAllNavDropdowns();
});

// =========================================================================
// EXAM TIPS & STUDY NOTES HUB
// =========================================================================
let allStudyNotes = [];

window.openStudyNotesHub = async function() {
    showScreen('studyNotesScreen');
    closeStudyNoteReader();
    const container = document.getElementById('studyNotesContainer');
    if (container) container.innerHTML = `<div style="text-align:center; padding:30px; color:#64748B;">Loading Exam Tips &amp; Study Notes...</div>`;
    try {
        const snap = await getDocs(collection(db, "study_notes"));
        allStudyNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        allStudyNotes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (e) {
        console.error("Study notes load error:", e);
    }
    filterStudyNotes('All', document.querySelector('.sn-tab'));
};

window.openStudyNoteReader = function(noteId) {
    const note = allStudyNotes.find(n => n.id === noteId);
    if (!note) return;
    const box = document.getElementById('studyNoteReaderBox');
    const content = document.getElementById('studyNoteReaderContent');
    if (!box || !content) return;

    const bodyHtml = formatRichContentBlock(note.content || '');
    content.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
            <span style="background:#EEF2FF; color:#4F46E5; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:6px;">📘 ${note.category || 'Study Notes'}</span>
            ${note.date ? `<span style="font-size:12.5px; color:#64748B; font-weight:600;">📅 ${note.date}</span>` : ''}
        </div>
        <h2 style="color:#1E1B4B; font-size:21px; margin:0 0 14px; line-height:1.4;">${note.title}</h2>
        <div style="font-size:14.5px; color:#1E293B; line-height:1.8; background:#F8FAFC; padding:18px; border-radius:10px; border:1px solid #E2E8F0;">
            ${bodyHtml}
        </div>
        ${note.pdfLink ? `<div style="margin-top:16px;"><a href="${note.pdfLink}" target="_blank" rel="noopener" class="btn btn-primary" style="text-decoration:none;">📥 Download PDF Notes →</a></div>` : ''}
    `;
    box.classList.remove('hide');
    document.getElementById('studyNotesContainer').classList.add('hide');
    try { history.pushState({ screen: 'studyNotesScreen', subview: 'studyNote', noteId }, '', '?page=study-notes'); } catch (e) {}
    box.scrollIntoView({ behavior: 'smooth' });
};

window.closeStudyNoteReader = function() {
    const box = document.getElementById('studyNoteReaderBox');
    if (box) box.classList.add('hide');
    const cont = document.getElementById('studyNotesContainer');
    if (cont) cont.classList.remove('hide');
};

window.filterStudyNotes = function(catFilter, btn) {
    document.querySelectorAll('.sn-tab').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
    });
    if (btn) {
        btn.classList.add('active', 'btn-primary');
        btn.classList.remove('btn-outline');
    }
    closeStudyNoteReader();

    const container = document.getElementById('studyNotesContainer');
    if (!container) return;

    const filtered = catFilter === 'All'
        ? allStudyNotes
        : allStudyNotes.filter(n => (n.category || '').toLowerCase().includes(catFilter.toLowerCase()));

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:35px; background:#ffffff; border-radius:14px; border:1px solid #E2E8F0; color:#64748B;">No study notes published in this category yet. Check back soon!</div>`;
        return;
    }

    let html = `<div style="display:grid; gap:14px;">`;
    filtered.forEach(n => {
        const preview = (n.content || '').slice(0, 190);
        html += `
            <div style="background:#ffffff; border:1px solid #E2E8F0; border-left:4px solid #4F46E5; border-radius:12px; padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                <div style="flex:1; min-width:250px;">
                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                        <span style="background:#EEF2FF; color:#4F46E5; font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px;">${n.category || 'Study Notes'}</span>
                        ${n.date ? `<span style="font-size:12px; color:#64748B;">📅 ${n.date}</span>` : ''}
                    </div>
                    <h3 style="color:#1E1B4B; font-size:16.5px; margin:0 0 6px;">${n.title}</h3>
                    <p style="font-size:13px; color:#475569; margin:0; line-height:1.55;">${preview}${preview.length >= 190 ? '...' : ''}</p>
                </div>
                <button class="btn btn-primary" onclick="openStudyNoteReader('${n.id}')">Read Notes →</button>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
};

// =========================================================================
// STUDENT REFER & EARN (+20 EXTRA PRO DAYS)
// =========================================================================
window.openReferAndEarn = async function() {
    if (!isLoggedIn) {
        showLogin();
        const err = document.getElementById('loginInlineError');
        if (err) {
            err.innerText = "Login or register free to get your personal Student Referral Link & earn free Pro Pass days!";
            err.classList.remove('hide');
        }
        return;
    }

    showScreen('referEarnScreen');
    const code = currentStudent.loginId || "TG0001";
    const shareUrl = `https://taiyarighar.in/?ref=${encodeURIComponent(code)}`;
    if (document.getElementById('myStudentRefCode')) document.getElementById('myStudentRefCode').innerText = code;
    if (document.getElementById('myStudentRefLink')) document.getElementById('myStudentRefLink').value = shareUrl;

    try {
        if (currentStudent.docId) {
            const snap = await getDoc(doc(db, "students", currentStudent.docId));
            if (snap.exists()) {
                const d = snap.data();
                if (document.getElementById('myRefSuccessCount')) document.getElementById('myRefSuccessCount').innerText = d.referralCount || 0;
                if (document.getElementById('myRefBonusDays')) document.getElementById('myRefBonusDays').innerText = `${d.referralBonusDays || 0} Days`;
            }
        }
    } catch (e) {}
};

window.copyStudentRefLink = function() {
    const inp = document.getElementById('myStudentRefLink');
    if (!inp) return;
    inp.select();
    navigator.clipboard?.writeText(inp.value);
    alert("Referral Link Copied: " + inp.value);
};

window.shareStudentRefWhatsApp = function() {
    const code = currentStudent.loginId || "TG0001";
    const link = `https://taiyarighar.in/?ref=${encodeURIComponent(code)}`;
    const text = `🎯 SSC, Railway & UP Police Mock Tests ke liye TaiyariGhar join karo!

Mera Referral Code *${code}* use karne par tumhe All-Access Pass par *₹15 Instant Discount + 10 Extra Days* milenge.

Abhi join karein: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};


// =========================================================================
// CLOUDFLARE D1 & WORKER DIRECT INTEGRATION LAYER (Non-Destructive)
// =========================================================================
(function initStudentD1Integration() {
  const api = () => window.TG_STUDENT_API;

  // Sync student registration to D1 automatically alongside existing flow
  const origDoRegister = window.doRegister;
  if (typeof origDoRegister === "function") {
    window.doRegister = async function (...args) {
      const name = document.getElementById("regName")?.value.trim() || "";
      const mobile = document.getElementById("regMobile")?.value.trim() || "";
      const pass = document.getElementById("regPass")?.value.trim() || "";
      const email = (verifiedRegEmail || document.getElementById("regEmail")?.value || "").trim().toLowerCase();
      await origDoRegister.apply(this, args);
      const newId = document.getElementById("newLoginId")?.innerText.trim();
      if (newId && api()) {
        api().registerStudent({
          login_id: newId,
          name,
          email,
          mobile,
          password_hash: pass,
          is_paid: 0,
          plan_name: "FREE",
          expiry_date: "",
          device_id: getDeviceId()
        }).catch(() => {});
      }
    };
  }

  // Practice Bank catalog: read directly from Cloudflare D1 /api/bundles
  window.openSmartPracticeBank = async function (sectionMode = "practice") {
    if (!isLoggedIn) {
      showLogin();
      const err = document.getElementById("loginInlineError");
      if (err) {
        err.innerText = "Please log in or register free to access Smart Practice Bank & NCERT Questions.";
        err.classList.remove("hide");
      }
      return;
    }

    pbCurrentSection = sectionMode === "ncert" ? "ncert" : "practice";
    showScreen("practiceBankScreen", true);
    updatePbAnalyticsUI();

    const btnP = document.getElementById("pbModeTabPractice");
    const btnN = document.getElementById("pbModeTabNcert");
    if (btnP) btnP.className = pbCurrentSection === "practice" ? "btn btn-primary" : "btn btn-outline";
    if (btnN) btnN.className = pbCurrentSection === "ncert" ? "btn btn-primary" : "btn btn-outline";

    const grid = document.getElementById("pbLevelSubjects");
    if (grid) grid.innerHTML = `<div style="grid-column:1/-1; padding:18px; color:#4F46E5; font-weight:600;">⚡ Loading subjects &amp; chapters from Cloudflare D1...</div>`;

    try {
      if (api()) {
        const res = await api().getBundles({});
        if (res && res.ok && Array.isArray(res.bundles) && res.bundles.length > 0) {
          pbMetaIndex = res.bundles.map((b, idx) => {
            const isNcert = Boolean(b.ncert_class) || String(b.bundle_id || "").startsWith("ncert_");
            return {
              bundleId: b.bundle_id,
              section: isNcert ? "ncert" : "practice",
              subject: (b.ncert_class ? `${b.ncert_class} - ${b.subject}` : (b.subject || "General")).trim(),
              topic: (b.topic || b.title_en || "Mixed").trim(),
              packIndex: idx + 1,
              count: Number(b.question_count || 0)
            };
          });
          pbCatalogLoaded = true;
          renderPbSubjects();
          return;
        }
      }
    } catch (e) {
      console.warn("D1 bundles fetch fallback:", e);
    }

    // Fallback to existing Firestore catalog if D1 has 0 bundles yet
    try {
      const bSnap = await getDocs(collection(db, "practice_bank_bundles"));
      pbMetaIndex = bSnap.docs.map(d => {
        const data = d.data();
        const qs = Array.isArray(data.questions) ? data.questions : null;
        if (qs) pbLoadedBundles[d.id] = qs;
        return {
          bundleId: d.id,
          section: data.section || "practice",
          subject: (data.subject || "General").trim(),
          topic: (data.topic || "Mixed").trim(),
          packIndex: data.packNumber || data.packIndex || 1,
          count: Number(data.questionCount || (qs ? qs.length : 0))
        };
      });
      pbCatalogLoaded = true;
      renderPbSubjects();
    } catch (e2) {
      if (grid) grid.innerHTML = `<div style="grid-column:1/-1; padding:18px; color:#DC2626;">Error loading Practice Bank: ${e2.message}</div>`;
    }
  };

  // Fetch topic questions directly from Cloudflare D1 (/api/questions with 15 free preview limit)
  window.startTopicPractice = async function (topic) {
    pbCurrentMode = "topic";
    pbCurrentTopic = topic;

    const matchingBundles = pbMetaIndex
      .filter(b => (b.section || "practice") === pbCurrentSection && b.subject === pbCurrentSubject && b.topic === topic)
      .sort((a, b) => (a.packIndex || 1) - (b.packIndex || 1));

    showProcessing(`Loading ${topic}...`, "Fetching questions from Cloudflare D1");

    try {
      if (api() && matchingBundles.length > 0) {
        const targetBundles = currentStudent.isPaid ? matchingBundles : matchingBundles.slice(0, 1);
        let d1Questions = [];
        for (const b of targetBundles) {
          const qRes = await api().getQuestions({ bundle_id: b.bundleId }, Boolean(currentStudent.isPaid));
          if (qRes && qRes.ok && Array.isArray(qRes.questions)) {
            const mapped = qRes.questions.map((row, idx) => {
              const opts = Array.isArray(row.options) ? row.options : [];
              const ansChar = String(row.correct_option || "A").trim().toUpperCase();
              const ansIdx = Math.max(0, ["A", "B", "C", "D"].indexOf(ansChar));
              return {
                id: `${row.bundle_id}_${row.q_no || idx + 1}`,
                topic: row.topic || topic,
                q: row.question_en || row.question_hi || "",
                qHi: row.question_hi || row.question_en || "",
                options: opts.map(o => (typeof o === "object" ? (o.en || o.hi || "") : String(o || ""))),
                optionsHi: opts.map(o => (typeof o === "object" ? (o.hi || o.en || "") : String(o || ""))),
                ans: ansIdx,
                exp: row.explanation_en || row.explanation_hi || "",
                expHi: row.explanation_hi || row.explanation_en || ""
              };
            });
            d1Questions = d1Questions.concat(mapped);
          }
        }
        if (d1Questions.length > 0) {
          if (!currentStudent.isPaid) d1Questions = d1Questions.slice(0, 15);
          hideProcessing();
          launchPracticeArena(d1Questions, `${pbCurrentSubject} • ${topic}`);
          return;
        }
      }
    } catch (e) {
      console.warn("D1 topic questions fallback:", e);
    }

    // Fallback to Firestore bundle if not in D1
    try {
      let allTopicQs = [];
      const bundlesToLoad = currentStudent.isPaid ? matchingBundles : matchingBundles.slice(0, 1);
      const fetchedArrays = await Promise.all(bundlesToLoad.map(b => fetchBundleQuestions(b.bundleId)));
      fetchedArrays.forEach(qs => { allTopicQs = allTopicQs.concat(qs); });
      if (!currentStudent.isPaid) allTopicQs = allTopicQs.slice(0, 15);
      hideProcessing();
      launchPracticeArena(allTopicQs, `${pbCurrentSubject} • ${topic}`);
    } catch (err) {
      hideProcessing();
      alert("Error loading topic: " + err.message);
    }
  };

  // Mix practice directly from Cloudflare D1
  window.startSubjectMixPractice = async function () {
    pbCurrentMode = "mix";
    pbCurrentTopic = "All Topics Mix";
    const subjectBundles = pbMetaIndex.filter(b => (b.section || "practice") === pbCurrentSection && b.subject === pbCurrentSubject);
    if (!subjectBundles.length) return;

    showProcessing(`Preparing ${pbCurrentSubject} Mix Practice...`, "Loading questions from Cloudflare D1");
    try {
      if (api()) {
        const targetBundles = currentStudent.isPaid ? subjectBundles.slice(0, 5) : subjectBundles.slice(0, 1);
        let mixed = [];
        for (const b of targetBundles) {
          const qRes = await api().getQuestions({ bundle_id: b.bundleId }, Boolean(currentStudent.isPaid));
          if (qRes && qRes.ok && Array.isArray(qRes.questions)) {
            qRes.questions.forEach((row, idx) => {
              const opts = Array.isArray(row.options) ? row.options : [];
              const ansChar = String(row.correct_option || "A").trim().toUpperCase();
              mixed.push({
                id: `${row.bundle_id}_${row.q_no || idx + 1}`,
                topic: row.topic || "Mix",
                q: row.question_en || row.question_hi || "",
                qHi: row.question_hi || row.question_en || "",
                options: opts.map(o => (typeof o === "object" ? (o.en || o.hi || "") : String(o || ""))),
                optionsHi: opts.map(o => (typeof o === "object" ? (o.hi || o.en || "") : String(o || ""))),
                ans: Math.max(0, ["A", "B", "C", "D"].indexOf(ansChar)),
                exp: row.explanation_en || row.explanation_hi || "",
                expHi: row.explanation_hi || row.explanation_en || ""
              });
            });
          }
        }
        if (mixed.length > 0) {
          for (let i = mixed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
          }
          if (!currentStudent.isPaid) mixed = mixed.slice(0, 15);
          hideProcessing();
          launchPracticeArena(mixed, `${pbCurrentSubject} • Mix Practice`);
          return;
        }
      }
    } catch (e) {
      console.warn("D1 mix fallback:", e);
    }

    // Fallback
    const targetBundles = currentStudent.isPaid ? subjectBundles : subjectBundles.slice(0, 2);
    const fetchedArrays = await Promise.all(targetBundles.map(b => fetchBundleQuestions(b.bundleId)));
    let mixedPool = [];
    fetchedArrays.forEach(qs => { mixedPool = mixedPool.concat(qs); });
    if (!currentStudent.isPaid) mixedPool = mixedPool.slice(0, 15);
    hideProcessing();
    launchPracticeArena(mixedPool, `${pbCurrentSubject} • Mix Practice`);
  };
})();


// =========================================================================
// MOCK & LIVE TESTS CLOUDFLARE D1 INTEGRATION (Student Portal)
// =========================================================================
(function initStudentMockTestsD1() {
  const api = () => window.TG_STUDENT_API;

  async function loadD1TestsIntoList() {
    if (!api()) return;
    try {
      const res = await api().getTests("");
      if (!res || !res.ok || !Array.isArray(res.tests)) return;
      const existingIds = new Set(allTests.map((t) => String(t.testId || t.id)));
      res.tests.forEach((row) => {
        if (existingIds.has(String(row.test_id))) return;
        let extra = {};
        try { extra = JSON.parse(row.title_hi || "{}"); } catch {}
        const posMark = Number(extra.posMark || 1);
        const negMark = Number(row.negative_marking || 0);
        allTests.unshift({
          id: row.test_id,
          testId: row.test_id,
          source: "d1",
          testName: row.title_en || row.test_id,
          examName: row.title_en || row.test_id,
          mainCat: row.category || "General",
          subCat: extra.subCat || row.category || "General",
          isLive: extra.isLive ? "Yes" : "No",
          liveEnd: extra.liveEndTime || "",
          liveReleaseTime: extra.liveEndTime || "",
          isFree: Number(row.is_paid) === 0 ? "Yes" : "No",
          duration: Number(row.duration_mins || 60),
          marks: Number(row.total_marks || 100),
          positiveMark: posMark,
          negativeMark: negMark,
          hasNegative: negMark > 0 ? "Yes" : "No",
          language: "Both"
        });
      });
      renderLiveTestsShowcase();
      renderMainCategories();
    } catch (e) {
      console.warn("D1 mock tests fetch warning:", e);
    }
  }

  // Hook fetchSettingsAndTests to also merge D1 Mock & Live Tests
  const origFetchSettingsAndTests = window.fetchSettingsAndTests;
  if (typeof origFetchSettingsAndTests === "function") {
    window.fetchSettingsAndTests = async function (...args) {
      await origFetchSettingsAndTests.apply(this, args);
      await loadD1TestsIntoList();
    };
  }
  setTimeout(loadD1TestsIntoList, 1200);

  // Hook startActualTest so D1 tests load questions directly from Cloudflare D1
  const origStartActualTest = window.startActualTest;
  window.startActualTest = async function () {
    const p = pendingTestDetails;
    if (!p || !String(p.id || "").startsWith("test_") || !api()) {
      return origStartActualTest.apply(this, arguments);
    }

    let selectedLang = p.lang;
    if (selectedLang === "Both") selectedLang = document.getElementById("instLangSelect").value;
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(updateFullScreenButtonLabel).catch(() => {});
    } catch {}

    isTestSubmitting = false;
    tabSwitchWarnings = 0;
    testStartTimestamp = Date.now();
    lastWarningTimestamp = 0;
    isCurrentTestLive = p.isLive;
    currentLiveEndTime = p.liveEnd;

    showProcessing("Downloading Test from Cloudflare D1...", "Preparing your bilingual CBT exam interface");

    currentTestId = p.id;
    currentTestName = p.name;
    currentTestMarks = p.marks;
    currentTestPosMark = Number(p.posMark) || 1;
    currentTestNegMark = p.hasNeg === "Yes" ? Number(p.negMark) : 0;
    currentTestLanguage = selectedLang || "Both";

    const switcher = document.getElementById("liveTestLangSwitcher");
    if (switcher) switcher.value = currentTestLanguage;

    const wm = document.getElementById("antiCheatWatermark");
    if (wm) wm.innerText = `${currentStudent.name} | ${currentStudent.loginId} | ${currentStudent.email || currentStudent.mobile}`;

    const liveTag = document.getElementById("testLiveTag");
    const warnBadge = document.getElementById("warningCounterBadge");
    if (p.isLive) {
      liveTag.classList.remove("hide");
      warnBadge.classList.remove("hide");
      warnBadge.innerText = "Warnings: 0/3";
    } else {
      liveTag.classList.add("hide");
      warnBadge.classList.add("hide");
    }

    document.getElementById("examHeaderName").innerText = p.name;
    document.getElementById("paletteName").innerText = currentStudent.name;
    document.getElementById("paletteId").innerText = currentStudent.loginId;
    document.getElementById("paletteAvatar").innerText = currentStudent.name.charAt(0).toUpperCase();

    try {
      const res = await api().getTests(p.id);
      const rawBox = res && res.test && res.test.questions ? res.test.questions : null;
      const rawQuestions = Array.isArray(rawBox) ? rawBox : (rawBox && Array.isArray(rawBox.questions) ? rawBox.questions : []);

      if (!rawQuestions.length) {
        hideProcessing();
        isTestSubmitting = true;
        disableAntiCheating();
        alert("No questions found in Cloudflare D1 for this test.");
        goDashboard();
        return;
      }

      rawQuestions.sort(() => Math.random() - 0.5);
      testQuestions = rawQuestions.map((qData, idx) => {
        const hOpts = qData.optionsHi || qData.options || [];
        const eOpts = qData.options || [];
        const optsArray = [];
        for (let i = 0; i < Math.max(hOpts.length, eOpts.length); i++) {
          optsArray.push({ h: hOpts[i] || eOpts[i] || "", e: eOpts[i] || hOpts[i] || "" });
        }
        const rightIdx = Number(qData.correctAnswer ?? 0);
        const correctObj = optsArray[rightIdx] || optsArray[0];
        optsArray.sort(() => Math.random() - 0.5);
        const newAnsIndex = optsArray.findIndex((o) => o === correctObj);

        return {
          qH: qData.questionHi || qData.question || "",
          qE: qData.question || qData.questionHi || "",
          uniqueId: qData.qId || `${p.id}-Q${idx + 1}`,
          opts: optsArray,
          ans: newAnsIndex >= 0 ? newAnsIndex : 0,
          exp: qData.explanationHi || qData.explanation || "No explanation provided.",
          marks: currentTestPosMark,
          neg: currentTestNegMark
        };
      });

      totalTime = p.duration * 60;
      timeLeft = totalTime;
      currentQIndex = 0;
      userAnswers = {};
      markedForReview = {};
      visitedQuestions = {};

      const container = document.getElementById("paletteContainer");
      container.innerHTML = "";
      testQuestions.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.className = "pallet-btn";
        btn.innerText = i + 1;
        btn.onclick = () => { currentQIndex = i; loadQuestion(); };
        container.appendChild(btn);
      });

      hideProcessing();
      showScreen("testScreen");
      loadQuestion();
      startTimer();
    } catch (err) {
      hideProcessing();
      isTestSubmitting = true;
      disableAntiCheating();
      alert("Error loading D1 test: " + err.message);
      goDashboard();
    }
  };
})();


// =========================================================================
// PRACTICE BANK REPORT QUESTION & SUBJECT-WISE PYQ VIEWER (NO LOGIN REQUIRED)
// =========================================================================
window.reportPracticeQuestionError = function (chosenIdx = 0) {
    const rawQ = pbActiveQuestions && pbActiveQuestions[pbCurrentIndex];
    if (!rawQ) return;
    const q = rawQ._norm || normalizePracticeQuestion(rawQ, pbCurrentIndex, pbCurrentTopic);
    testQuestions = [{
        qH: q.displayQ || "",
        qE: q.subQ || q.displayQ || "",
        uniqueId: q.id || `PB-${pbCurrentIndex + 1}`,
        opts: (q.displayOpts || []).map((o) => ({ h: o, e: o })),
        ans: q.rightIdx || 0,
        exp: q.displayExp || "",
        marks: 1,
        neg: 0
    }];
    currentQIndex = 0;
    userAnswers = { 0: chosenIdx };
    currentTestId = `PB_${pbCurrentSubject || "Practice"}`;
    currentTestName = `${pbCurrentSubject || "Practice"} — ${q.topic || pbCurrentTopic}`;
    window.reportCurrentQuestion();
};

let allPyqItems = [];
let selectedPyqSubject = "All";
let pyqVisibleLimit = 12;

function updateSeoMetaForPage(titleText, descText, urlSuffix) {
    try {
        if (titleText) document.title = titleText;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && descText) metaDesc.setAttribute('content', descText);
        if (urlSuffix) {
            history.replaceState({ screen: currentScreen }, '', urlSuffix);
        }
    } catch (e) {}
}

window.openSubjectPyqHub = async function (subjectFilter = "All") {
    selectedPyqSubject = subjectFilter || "All";
    pyqVisibleLimit = 12;
    showScreen("pyqHubScreen", true);
    const subLabel = selectedPyqSubject !== "All" ? `${selectedPyqSubject} ` : "";
    updateSeoMetaForPage(
        `${subLabel}Previous Year Questions (PYQs) with Answers & Explanation — TaiyariGhar`,
        `Practice free ${subLabel}Previous Year Questions (PYQs) for SSC, Railway, UP Police, Banking & State Govt Exams with green highlighted answers and detailed bilingual explanations.`,
        selectedPyqSubject !== "All" ? `?page=pyq&subject=${encodeURIComponent(selectedPyqSubject)}` : `?page=pyq`
    );
    const listEl = document.getElementById("pyqQuestionsList");
    if (listEl && allPyqItems.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding:24px; color:#4F46E5; font-weight:600;">Loading PYQ subjects...</div>`;
    }
    try {
        const base = (window.TAIYARIGHAR_CONFIG?.API_BASE_URL || "https://taiyarighar-api.taiyarighar.workers.dev").replace(/\/+$/, "");
        const subParam = (selectedPyqSubject && selectedPyqSubject !== "All") ? `?subject=${encodeURIComponent(selectedPyqSubject)}` : "";
        const res = await fetch(`${base}/api/pyqs${subParam}`);
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.pyqs)) {
            if (!subParam) {
                allPyqItems = data.pyqs;
            } else {
                const others = allPyqItems.filter(x => (x.subject || "General") !== selectedPyqSubject);
                allPyqItems = [...others, ...data.pyqs];
            }
        }
    } catch (e) {
        console.warn("PYQ fetch warning:", e);
    }
    renderPyqSubjectPills();
    renderSubjectPyqList();
};

function getAvailablePyqSubjects() {
    const defaultSubjects = [
        "Indian History",
        "Indian Polity",
        "Geography",
        "Indian Economy",
        "General Science",
        "General Hindi",
        "UP Special GK",
        "Reasoning",
        "Mathematics"
    ];
    const fromDb = Array.from(new Set(allPyqItems.map((x) => (x.subject || "General").trim()).filter(Boolean)));
    return Array.from(new Set([...fromDb, ...defaultSubjects]));
}

function renderPyqSubjectPills() {
    const pillsWrap = document.getElementById("pyqSubjectPills");
    if (!pillsWrap) return;
    const subjects = ["All", ...getAvailablePyqSubjects()];
    pillsWrap.innerHTML = subjects.map((sub) => {
        const active = selectedPyqSubject === sub;
        return `<button type="button" class="btn ${active ? "btn-primary" : "btn-outline"}" style="padding:6px 13px; font-size:12.5px;" onclick="selectPyqSubjectPill('${sub.replace(/'/g, "\'")}')">${sub}</button>`;
    }).join("");
}

window.selectPyqSubjectPill = function (sub) {
    selectedPyqSubject = sub;
    pyqVisibleLimit = 12;
    const subLabel = sub !== "All" ? `${sub} ` : "";
    updateSeoMetaForPage(
        `${subLabel}Previous Year Questions (PYQs) with Answers & Explanation — TaiyariGhar`,
        `Read free ${subLabel}Previous Year Questions (PYQs) asked in SSC, Railway, UP Police & State Exams with green correct option and explanation.`,
        sub !== "All" ? `?page=pyq&subject=${encodeURIComponent(sub)}` : `?page=pyq`
    );
    renderPyqSubjectPills();
    renderSubjectPyqList();
};

window.loadMorePyqQuestions = function () {
    pyqVisibleLimit += 12;
    renderSubjectPyqList();
};

window.renderSubjectPyqList = function () {
    const listEl = document.getElementById("pyqQuestionsList");
    if (!listEl) return;
    const qInput = (document.getElementById("pyqSearchInput")?.value || "").trim().toLowerCase();

    if (selectedPyqSubject === "All" && !qInput) {
        const subjects = getAvailablePyqSubjects();
        listEl.innerHTML = `
            <div style="margin-bottom:12px; font-size:13.5px; font-weight:700; color:#1E1B4B;">
                Select a Subject Tab to Open Previous Year Questions:
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:12px;">
                ${subjects.map((sub) => {
                    const count = allPyqItems.filter(x => (x.subject || "General").trim() === sub).length;
                    return `
                    <div onclick="selectPyqSubjectPill('${sub.replace(/'/g, "\'")}')" style="background:#ffffff; border:1.5px solid #CBD5E1; border-radius:12px; padding:16px; cursor:pointer; transition:0.15s;" onmouseover="this.style.borderColor='#4F46E5'" onmouseout="this.style.borderColor='#CBD5E1'">
                        <div style="font-size:15.5px; font-weight:800; color:#1E1B4B; margin-bottom:4px;">📘 ${sub}</div>
                        <div style="font-size:12px; color:#64748B;">${count > 0 ? `${count} PYQs Available` : "Subject PYQ Tab"}</div>
                        <div style="margin-top:8px; font-size:12.5px; font-weight:700; color:#4F46E5;">Open Subject →</div>
                    </div>`;
                }).join("")}
            </div>`;
        return;
    }

    const filtered = allPyqItems.filter((item) => {
        const matchSub = selectedPyqSubject === "All" || (item.subject || "General") === selectedPyqSubject;
        const matchText = !qInput ||
            String(item.question_en || "").toLowerCase().includes(qInput) ||
            String(item.question_hi || "").toLowerCase().includes(qInput) ||
            String(item.topic || "").toLowerCase().includes(qInput) ||
            String(item.exam_year || "").toLowerCase().includes(qInput);
        return matchSub && matchText;
    });

    if (!filtered.length) {
        listEl.innerHTML = `<div style="text-align:center; padding:32px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; color:#64748B;">
            No Previous Year Questions found for this filter yet. Check back soon or explore <strong>Unlimited Smart Practice Bank</strong>!
        </div>`;
        return;
    }

    const visibleItems = filtered.slice(0, pyqVisibleLimit);
    const remainingCount = filtered.length - visibleItems.length;
    const letters = ["A", "B", "C", "D"];

    const cardsHtml = visibleItems.map((item, idx) => {
        const mainQ = (currentLang === "hi" && item.question_hi) ? item.question_hi : (item.question_en || item.question_hi || "");
        const secQ = (currentLang === "hi" && item.question_en && item.question_en !== item.question_hi)
            ? item.question_en
            : ((currentLang !== "hi" && item.question_hi && item.question_hi !== item.question_en) ? item.question_hi : "");
        const opts = Array.isArray(item.options) ? item.options : [];
        const rightChar = String(item.correct_option || "A").trim().toUpperCase();
        const rightIdx = Math.max(0, letters.indexOf(rightChar));
        const expText = (currentLang === "hi" && item.explanation_hi) ? item.explanation_hi : (item.explanation_en || item.explanation_hi || "Correct answer explanation will be updated soon.");
        const examList = String(item.exam_year || "").split(/[;,|]+/).map((s) => s.trim()).filter(Boolean);

        return `
        <article style="background:#ffffff; border:1.5px solid #CBD5E1; border-radius:14px; padding:20px; margin-bottom:18px; box-shadow:0 3px 12px rgba(15,23,42,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    <span style="background:#EEF2FF; color:#4F46E5; font-size:11.5px; font-weight:700; padding:3px 9px; border-radius:6px;">${item.subject || "General"}</span>
                    ${item.topic ? `<span style="background:#F1F5F9; color:#334155; font-size:11.5px; font-weight:600; padding:3px 9px; border-radius:6px;">${item.topic}</span>` : ""}
                </div>
                <button type="button" class="btn btn-outline" style="padding:4px 9px; font-size:11.5px; color:#B45309; border-color:#FDE68A; background:#FFFBEB;" onclick="openPyqErrorReport('${String(item.pyq_id || idx).replace(/'/g, "\'")}')">⚠️ Report Error</button>
            </div>

            ${examList.length ? `
            <div style="margin-bottom:12px; padding:8px 12px; background:#F8FAFC; border-left:3px solid #0F766E; border-radius:6px; font-size:12.5px; color:#0F172A;">
                <strong>Asked in Exam(s):</strong> ${examList.map((ex) => `<span style="display:inline-block; background:#CCFBF1; color:#115E59; font-weight:700; padding:2px 8px; border-radius:5px; margin:2px 4px 2px 0;">${ex}</span>`).join("")}
            </div>` : ""}

            <div style="font-size:16px; font-weight:700; color:#0F172A; line-height:1.6;">Q${idx + 1}. ${mainQ}</div>
            ${secQ ? `<div style="font-size:14px; color:#475569; margin-top:4px; line-height:1.55;">${secQ}</div>` : ""}

            <div style="margin-top:14px; display:grid; gap:8px;">
                ${[0, 1, 2, 3].map((oIdx) => {
                    const rawOpt = opts[oIdx];
                    const optLabel = typeof rawOpt === "object"
                        ? ((currentLang === "hi" && rawOpt.hi) ? rawOpt.hi : (rawOpt.en || rawOpt.hi || ""))
                        : String(rawOpt || "");
                    if (!optLabel) return "";
                    const isRight = oIdx === rightIdx;
                    return `<div style="padding:10px 14px; border-radius:9px; border:1.5px solid ${isRight ? "#10B981" : "#E2E8F0"}; background:${isRight ? "#ECFDF5" : "#F8FAFC"}; color:${isRight ? "#065F46" : "#1E293B"}; font-weight:${isRight ? "700" : "500"}; font-size:14px;">
                        <strong>${letters[oIdx]}.</strong> ${optLabel} ${isRight ? '<span style="float:right; color:#059669;">✅ Correct Answer</span>' : ""}
                    </div>`;
                }).join("")}
            </div>

            <div style="margin-top:14px; padding:14px 16px; background:#F0FDF4; border:1px solid #A7F3D0; border-radius:10px; font-size:13.5px; color:#064E3B; line-height:1.65;">
                <strong>💡 Explanation:</strong><br>${expText}
            </div>
        </article>`;
    }).join("");

    const loadMoreHtml = remainingCount > 0
        ? `<div style="text-align:center; margin:16px 0;">
            <button type="button" class="btn btn-primary" style="padding:10px 22px;" onclick="loadMorePyqQuestions()">Load More PYQs (${remainingCount} more available) →</button>
           </div>`
        : `<div style="text-align:center; margin:12px 0; font-size:12.5px; color:#64748B;">Showing all ${filtered.length} question(s) in this view.</div>`;

    listEl.innerHTML = cardsHtml + loadMoreHtml;
};

window.openPyqErrorReport = function (pyqId) {
    const item = allPyqItems.find((x) => String(x.pyq_id) === String(pyqId));
    if (!item) return;
    testQuestions = [{
        qH: item.question_hi || item.question_en || "",
        qE: item.question_en || item.question_hi || "",
        uniqueId: item.pyq_id || "PYQ",
        opts: (item.options || []).map((o) => ({ h: typeof o === "object" ? (o.hi || o.en || "") : String(o), e: typeof o === "object" ? (o.en || o.hi || "") : String(o) })),
        ans: Math.max(0, ["A", "B", "C", "D"].indexOf(String(item.correct_option || "A").trim().toUpperCase())),
        exp: item.explanation_en || item.explanation_hi || "",
        marks: 1,
        neg: 0
    }];
    currentQIndex = 0;
    userAnswers = {};
    currentTestId = `PYQ_${item.subject || "General"}`;
    currentTestName = `${item.subject || "PYQ"} (${item.exam_year || ""})`;
    window.reportCurrentQuestion();
};


// =========================================================================
// DARK MODE / LIGHT MODE TOGGLE (Saved in localStorage)
// =========================================================================
window.toggleDarkMode = function () {
    const isDark = document.body.classList.toggle("tg-dark");
    localStorage.setItem("tg_theme_mode", isDark ? "dark" : "light");
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.innerText = isDark ? "☀️" : "🌙";
};

(function applySavedThemeMode() {
    try {
        const saved = localStorage.getItem("tg_theme_mode");
        if (saved === "dark") {
            document.body.classList.add("tg-dark");
            const btn = document.getElementById("themeToggleBtn");
            if (btn) btn.innerText = "☀️";
        }
    } catch (e) {}
})();


// =========================================================================
// PER-QUESTION TIME HEATMAP, MISTAKE NOTEBOOK & QUIZ CHALLENGE LINK
// =========================================================================
function renderCbtTimeHeatmap(qList, ansMap, timeMap) {
    const grid = document.getElementById('cbtTimeHeatmapGrid');
    const badge = document.getElementById('heatmapSummaryBadge');
    if (!grid) return;

    const totalQ = Array.isArray(qList) ? qList.length : 0;
    let totalSec = 0;
    let slowCount = 0;
    let html = "";

    for (let i = 0; i < totalQ; i++) {
        const sec = Number((timeMap && timeMap[i]) || 0);
        totalSec += sec;
        if (sec > 120) slowCount++;
        const qObj = qList[i] || {};
        const uAns = ansMap ? ansMap[i] : undefined;
        const isRight = uAns !== undefined && uAns === qObj.ans;

        let bg = "#F1F5F9";
        let border = "#CBD5E1";
        let color = "#475569";
        if (uAns !== undefined) {
            if (sec > 120) {
                bg = "#FEE2E2"; border = "#EF4444"; color = "#991B1B";
            } else if (sec > 45) {
                bg = "#FEF3C7"; border = "#F59E0B"; color = "#92400E";
            } else if (isRight) {
                bg = "#D1FAE5"; border = "#10B981"; color = "#065F46";
            } else {
                bg = "#FEF2F2"; border = "#F87171"; color = "#991B1B";
            }
        }
        html += `<div title="Q${i + 1}: ${sec}s${sec > 120 ? ' (>2m Slow)' : ''}" style="background:${bg}; border:1.5px solid ${border}; color:${color}; border-radius:8px; padding:6px 4px; text-align:center; font-size:11.5px; font-weight:700;">
            <div>Q${i + 1}</div>
            <div style="font-size:10.5px;">${sec}s</div>
        </div>`;
    }

    grid.innerHTML = html || `<div style="color:#64748B; font-size:12px;">No per-question timing recorded for this test.</div>`;
    const avgSec = totalQ > 0 ? Math.round(totalSec / totalQ) : 0;
    if (badge) {
        badge.innerText = `Avg: ${avgSec}s/Q • Slow (>2m): ${slowCount} Qs`;
    }
}

function saveMistakesToNotebook(tName, qList, ansMap, timeMap) {
    if (!Array.isArray(qList)) return;
    try {
        const key = "tg_mistake_notebook_" + (currentStudent.loginId || "guest");
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const newItems = [];
        qList.forEach((q, idx) => {
            const uAns = ansMap ? ansMap[idx] : undefined;
            const sec = Number((timeMap && timeMap[idx]) || 0);
            const isWrong = uAns !== undefined && uAns !== q.ans;
            if (isWrong || sec > 120) {
                newItems.push({
                    testName: tName,
                    qText: q.qH || q.qE || "",
                    exp: q.exp || "",
                    timeSec: sec,
                    reason: isWrong ? "Wrong Answer" : "Slow (>2 mins)",
                    savedAt: new Date().toISOString()
                });
            }
        });
        const merged = [...newItems, ...existing].slice(0, 80);
        localStorage.setItem(key, JSON.stringify(merged));
    } catch (e) {}
}

window.openMistakeNotebook = function () {
    const modal = document.getElementById("mistakeNotebookModal");
    const body = document.getElementById("mistakeNotebookBody");
    if (!modal || !body) return;

    const key = "tg_mistake_notebook_" + (currentStudent.loginId || "guest");
    let items = [];
    try { items = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}

    if (!items.length) {
        body.innerHTML = `<div style="padding:24px; text-align:center; background:#F8FAFC; border-radius:12px; color:#64748B;">
            Abhi tak koi galat ya &gt;2 min slow question notebook mein save nahi hua hai. Mock test ya practice attempt karte hi yahan auto-save ho jayega.
        </div>`;
    } else {
        body.innerHTML = items.slice(0, 25).map((it, idx) => `
            <div style="border:1px solid #E2E8F0; border-left:4px solid ${it.reason.includes('Wrong') ? '#EF4444' : '#F59E0B'}; border-radius:10px; padding:14px; margin-bottom:10px; background:#F8FAFC;">
                <div style="display:flex; justify-content:space-between; gap:8px; font-size:11.5px; color:#64748B; margin-bottom:5px;">
                    <strong>#${idx + 1} • ${it.testName || "Mock Test"}</strong>
                    <span style="font-weight:700; color:#1E1B4B;">${it.reason} (${it.timeSec || 0}s)</span>
                </div>
                <div style="font-weight:600; color:#0F172A; margin-bottom:6px;">${it.qText}</div>
                ${it.exp ? `<div style="font-size:12.5px; color:#065F46; background:#ECFDF5; padding:8px 10px; border-radius:7px;"><b>Solution:</b> ${it.exp}</div>` : ""}
            </div>
        `).join("");
    }
    modal.classList.remove("hide");
};

window.shareQuizChallengeLink = function () {
    const code = currentStudent.loginId || "TG0001";
    const link = `https://taiyarighar.in/?ref=${encodeURIComponent(code)}`;
    const msg = `⚔️ TaiyariGhar Quiz Challenge!

Maine abhi mock test/practice diya hai. Kya tum mera score aur speed beat kar sakte ho?

Join here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
};


// =========================================================================
// SSC / BANKING STYLE SECTIONAL TIMER ENGINE (Alongside Per-Question Timer)
// =========================================================================
let cbtSections = [];
let cbtActiveSectionIdx = 0;
let cbtSectionRemainingSec = {};
let cbtSectionalTimerActive = false;

function initCbtSectionalTimer(qList, totalDurationSec) {
    clearInterval(cbtSectionalTimerActive);
    cbtSections = [];
    cbtActiveSectionIdx = 0;
    cbtSectionRemainingSec = {};

    const rawSecs = (Array.isArray(qList) ? qList : [])
        .map(q => String(q.section || q.subject || "").trim())
        .filter(Boolean);

    const uniqueSecs = Array.from(new Set(rawSecs));
    const secBadge = document.getElementById("cbtSectionalTimerBadge");
    const secBar = document.getElementById("cbtSectionTabsBar");

    // Activate sectional timer automatically when 2+ sections exist in the test
    if (uniqueSecs.length >= 2) {
        cbtSections = uniqueSecs;
        const perSec = Math.max(60, Math.floor(totalDurationSec / uniqueSecs.length));
        uniqueSecs.forEach((sName, i) => {
            cbtSectionRemainingSec[i] = (i === uniqueSecs.length - 1)
                ? Math.max(60, totalDurationSec - perSec * (uniqueSecs.length - 1))
                : perSec;
        });
        cbtSectionalTimerActive = true;
        if (secBadge) secBadge.classList.remove("hide");
        if (secBar) secBar.classList.remove("hide");
        renderCbtSectionTabsBar();
        updateSectionalTimerDisplay();
    } else {
        cbtSectionalTimerActive = false;
        if (secBadge) secBadge.classList.add("hide");
        if (secBar) {
            secBar.classList.add("hide");
            secBar.innerHTML = "";
        }
    }
}

function renderCbtSectionTabsBar() {
    const secBar = document.getElementById("cbtSectionTabsBar");
    if (!secBar || !cbtSectionalTimerActive) return;
    secBar.innerHTML = cbtSections.map((name, idx) => {
        const active = idx === cbtActiveSectionIdx;
        const rem = Math.max(0, cbtSectionRemainingSec[idx] || 0);
        const mm = String(Math.floor(rem / 60)).padStart(2, "0");
        const ss = String(rem % 60).padStart(2, "0");
        return `<span style="padding:4px 10px; border-radius:6px; font-weight:700; background:${active ? '#4F46E5' : '#ffffff'}; color:${active ? '#ffffff' : '#334155'}; border:1px solid ${active ? '#4F46E5' : '#CBD5E1'};">
            ${name} (${mm}:${ss})
        </span>`;
    }).join("");
}

function updateSectionalTimerDisplay() {
    if (!cbtSectionalTimerActive || !cbtSections.length) return;
    const secName = cbtSections[cbtActiveSectionIdx] || "Section";
    const rem = Math.max(0, cbtSectionRemainingSec[cbtActiveSectionIdx] || 0);
    const mm = String(Math.floor(rem / 60)).padStart(2, "0");
    const ss = String(rem % 60).padStart(2, "0");

    const nameEl = document.getElementById("cbtSectionNameLabel");
    const dispEl = document.getElementById("cbtSectionTimerDisplay");
    if (nameEl) nameEl.innerText = secName;
    if (dispEl) dispEl.innerText = `${mm}:${ss}`;
    renderCbtSectionTabsBar();
}

function tickSectionalTimerOneSec() {
    if (!cbtSectionalTimerActive || !cbtSections.length) return;
    const curRem = cbtSectionRemainingSec[cbtActiveSectionIdx] ?? 0;
    if (curRem > 1) {
        cbtSectionRemainingSec[cbtActiveSectionIdx] = curRem - 1;
        updateSectionalTimerDisplay();
    } else {
        cbtSectionRemainingSec[cbtActiveSectionIdx] = 0;
        if (cbtActiveSectionIdx < cbtSections.length - 1) {
            flushCurrentCbtQuestionTime();
            cbtActiveSectionIdx++;
            const targetSecName = cbtSections[cbtActiveSectionIdx];
            const firstIdxInSec = testQuestions.findIndex(q => String(q.section || q.subject || "").trim() === targetSecName);
            if (firstIdxInSec >= 0) {
                currentQIndex = firstIdxInSec;
                loadQuestion();
            }
            updateSectionalTimerDisplay();
            alert(`⏱️ ${cbtSections[cbtActiveSectionIdx - 1]} ka sectional time poora ho gaya hai! Ab ${targetSecName} section shuru ho raha hai.`);
        } else {
            updateSectionalTimerDisplay();
            finalSubmitTest();
        }
    }
}


// =========================================================================
// OPTIONAL BI DASHBOARD FOR ALL TESTS (ANY QUESTION COUNT) + SAVE & SHARE
// =========================================================================
function getBiAnalyticsPayload() {
    const qList = Array.isArray(testQuestions) ? testQuestions : [];
    const ansMap = userAnswers || {};
    const timeMap = questionTimeMap || {};
    const totalQ = qList.length;

    let correct = 0, wrong = 0, skipped = 0, totalSec = 0;
    let fastQ = 0, modQ = 0, slowQ = 0, unattQ = 0;

    for (let i = 0; i < totalQ; i++) {
        const q = qList[i] || {};
        const uAns = ansMap[i];
        const sec = Number(timeMap[i] || 0);
        totalSec += sec;

        if (uAns === undefined) {
            skipped++;
            unattQ++;
        } else if (uAns === q.ans) {
            correct++;
        } else {
            wrong++;
        }

        if (uAns === undefined) {
            // tracked in unattQ
        } else if (sec > 120) {
            slowQ++;
        } else if (sec > 45) {
            modQ++;
        } else {
            fastQ++;
        }
    }

    const attempted = correct + wrong;
    const accuracyPct = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : "0.0";
    const avgSec = totalQ > 0 ? Math.round(totalSec / totalQ) : 0;
    const scoreVal = currentResultData ? currentResultData.score : "0.00";
    const totalMarksVal = currentResultData ? currentResultData.total : currentTestMarks;
    const rankVal = currentResultData ? currentResultData.rank : "-";
    const totalStudVal = currentResultData ? currentResultData.totalStudents : "-";
    const percentVal = currentResultData ? currentResultData.percent : "0.0";

    return {
        studentName: currentStudent.name || "Student",
        loginId: currentStudent.loginId || "N/A",
        testName: currentTestName || "Mock Test",
        totalQ,
        attempted,
        correct,
        wrong,
        skipped,
        totalSec,
        avgSec,
        accuracyPct,
        scoreVal,
        totalMarksVal,
        percentVal,
        rankVal,
        totalStudVal,
        fastQ,
        modQ,
        slowQ,
        unattQ,
        qList,
        ansMap,
        timeMap
    };
}

window.openBiDashboardModal = function () {
    const modal = document.getElementById("biDashboardModal");
    const content = document.getElementById("biDashboardContent");
    if (!modal || !content) return;

    const d = getBiAnalyticsPayload();
    document.getElementById("biDashTitle").innerText = `${d.testName} — BI Analytics Dashboard`;
    document.getElementById("biDashCandidateMeta").innerText =
        `Candidate: ${d.studentName} (${d.loginId}) • Score: ${d.scoreVal}/${d.totalMarksVal} (${d.percentVal}%) • Rank: ${d.rankVal}${d.totalStudVal !== '-' ? ' / ' + d.totalStudVal : ''}`;

    const safePct = (num) => d.totalQ > 0 ? Math.min(100, Math.round((num / d.totalQ) * 100)) : 0;
    const cPct = safePct(d.correct);
    const wPct = safePct(d.wrong);
    const sPct = safePct(d.skipped);

    const blocksHtml = Array.from({ length: d.totalQ }, (_, i) => {
        const q = d.qList[i] || {};
        const uAns = d.ansMap[i];
        const sec = Number(d.timeMap[i] || 0);
        let bg = "#E2E8F0", fg = "#334155", bd = "#CBD5E1", tag = "Skip";
        if (uAns === undefined) {
            bg = "#F1F5F9"; fg = "#64748B"; bd = "#CBD5E1"; tag = "Skip";
        } else if (uAns === q.ans) {
            bg = sec > 120 ? "#FEF3C7" : "#D1FAE5";
            fg = sec > 120 ? "#92400E" : "#065F46";
            bd = sec > 120 ? "#F59E0B" : "#10B981";
            tag = "Right";
        } else {
            bg = "#FEE2E2"; fg = "#991B1B"; bd = "#EF4444"; tag = "Wrong";
        }
        return `<div title="Q${i + 1}: ${tag} (${sec}s)" style="background:${bg}; color:${fg}; border:1px solid ${bd}; border-radius:6px; padding:5px 2px; text-align:center; font-size:10.5px; font-weight:700;">
            <div>Q${i + 1}</div>
            <div style="font-size:9.5px;">${sec}s</div>
        </div>`;
    }).join("");

    content.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-bottom:16px;">
            <div style="background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
                <div style="font-size:11px; color:#64748B; font-weight:700;">CANDIDATE</div>
                <div style="font-size:15px; font-weight:800; color:#0F172A; margin-top:3px;">${d.studentName}</div>
                <div style="font-size:11.5px; color:#4F46E5; font-weight:600;">ID: ${d.loginId}</div>
            </div>
            <div style="background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
                <div style="font-size:11px; color:#64748B; font-weight:700;">SCORE &amp; RANK</div>
                <div style="font-size:16px; font-weight:800; color:#0F172A; margin-top:3px;">${d.scoreVal} / ${d.totalMarksVal}</div>
                <div style="font-size:11.5px; color:#059669; font-weight:700;">Rank ${d.rankVal}${d.totalStudVal !== '-' ? ' of ' + d.totalStudVal : ''}</div>
            </div>
            <div style="background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
                <div style="font-size:11px; color:#64748B; font-weight:700;">ACCURACY</div>
                <div style="font-size:18px; font-weight:800; color:#4338CA; margin-top:3px;">${d.accuracyPct}%</div>
                <div style="font-size:11.5px; color:#475569;">${d.correct} Right / ${d.wrong} Wrong</div>
            </div>
            <div style="background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:14px;">
                <div style="font-size:11px; color:#64748B; font-weight:700;">AVG SPEED &amp; SLOW Qs</div>
                <div style="font-size:18px; font-weight:800; color:#B45309; margin-top:3px;">${d.avgSec}s / Q</div>
                <div style="font-size:11.5px; color:#475569;">Slow (&gt;120s): ${d.slowQ} Qs</div>
            </div>
        </div>

        <div style="background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:16px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <strong style="color:#0F172A; font-size:14px;">Question Distribution Across All ${d.totalQ} Questions</strong>
                <span style="font-size:12px; color:#475569;">Attempted: <b>${d.attempted}/${d.totalQ}</b> • Skipped: <b>${d.skipped}</b></span>
            </div>
            <div style="height:18px; width:100%; border-radius:999px; overflow:hidden; display:flex; background:#E2E8F0; margin-bottom:10px;">
                <div style="width:${cPct}%; background:#10B981;" title="Correct ${cPct}%"></div>
                <div style="width:${wPct}%; background:#EF4444;" title="Wrong ${wPct}%"></div>
                <div style="width:${sPct}%; background:#94A3B8;" title="Skipped ${sPct}%"></div>
            </div>
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12px; font-weight:600; color:#334155;">
                <span>🟢 Correct: ${d.correct} (${cPct}%)</span>
                <span>🔴 Wrong: ${d.wrong} (${wPct}%)</span>
                <span>⚪ Unattempted: ${d.skipped} (${sPct}%)</span>
                <span>⚡ Fast (≤45s): ${d.fastQ}</span>
                <span>🟡 Moderate (46–120s): ${d.modQ}</span>
                <span>🔴 Slow (&gt;120s): ${d.slowQ}</span>
            </div>
        </div>

        <div style="background:#ffffff; border:1px solid #E2E8F0; border-radius:12px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                <strong style="color:#0F172A; font-size:14px;">Compact Matrix View (Best for 100 / 200+ Question Tests)</strong>
                <span style="font-size:11.5px; color:#64748B;">Hover any block for status &amp; seconds</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(54px, 1fr)); gap:5px; max-height:260px; overflow-y:auto; padding-right:4px;">
                ${blocksHtml}
            </div>
        </div>
    `;

    modal.classList.remove("hide");
};

window.closeBiDashboardModal = function () {
    const modal = document.getElementById("biDashboardModal");
    if (modal) modal.classList.add("hide");
};

window.saveBiDashboardReport = function () {
    const d = getBiAnalyticsPayload();
    const safePct = (num) => d.totalQ > 0 ? Math.min(100, Math.round((num / d.totalQ) * 100)) : 0;
    const cPct = safePct(d.correct);
    const wPct = safePct(d.wrong);
    const sPct = safePct(d.skipped);
    const originUrl = (window.location && window.location.origin && window.location.origin.startsWith("http"))
        ? window.location.origin
        : "https://taiyarighar.in";
    const logoSrc = `${originUrl}/logo.png`;

    const matrixCells = Array.from({ length: d.totalQ }, (_, i) => {
        const q = d.qList[i] || {};
        const uAns = d.ansMap[i];
        const sec = Number(d.timeMap[i] || 0);
        let bg = "#F8FAFC", fg = "#334155", bd = "#CBD5E1";
        if (uAns === undefined) {
            bg = "#F8FAFC"; fg = "#475569"; bd = "#CBD5E1";
        } else if (uAns === q.ans) {
            bg = sec > 120 ? "#FEF3C7" : "#ECFDF5";
            fg = sec > 120 ? "#92400E" : "#065F46";
            bd = sec > 120 ? "#F59E0B" : "#10B981";
        } else {
            bg = "#FEF2F2"; fg = "#991B1B"; bd = "#EF4444";
        }
        return `<div style="background:${bg};color:${fg};border:1.5px solid ${bd};border-radius:8px;padding:7px 4px;text-align:center;font-size:11px;font-weight:700;">
            <div>Q${i + 1}</div>
            <div style="font-size:10px;font-weight:600;margin-top:2px;">${sec}s</div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>TaiyariGhar BI Dashboard - ${d.studentName}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Poppins', 'Inter', Arial, sans-serif; background: #F1F5F9; color: #0F172A; padding: 24px; }
        .sheet { max-width: 940px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(15,23,42,0.06); }
        .brand-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #E2E8F0; }
        .brand-left { display: flex; align-items: center; gap: 10px; }
        .brand-logo { height: 30px; width: auto; border-radius: 6px; }
        .brand-name { font-size: 17px; font-weight: 800; color: #1E1B4B; }
        .brand-tag { font-size: 11px; font-weight: 700; color: #4338CA; background: #EEF2FF; padding: 3px 9px; border-radius: 6px; }
        .title { font-size: 19px; font-weight: 800; color: #0F172A; margin-bottom: 4px; }
        .sub { font-size: 12.5px; color: #475569; font-weight: 600; margin-bottom: 16px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
        .kpi-box { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; background: #FFFFFF; }
        .kpi-lbl { font-size: 10.5px; font-weight: 700; color: #64748B; text-transform: uppercase; }
        .kpi-val { font-size: 17px; font-weight: 800; color: #0F172A; margin-top: 4px; }
        .kpi-sub { font-size: 11.5px; font-weight: 600; color: #475569; margin-top: 2px; }
        .card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #FFFFFF; margin-bottom: 16px; }
        .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 13.5px; font-weight: 700; color: #0F172A; }
        .bar { height: 16px; width: 100%; border-radius: 999px; overflow: hidden; display: flex; background: #E2E8F0; margin-bottom: 10px; }
        .legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 11.5px; font-weight: 600; color: #334155; }
        .matrix { display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 7px; }
        .foot-note { margin-top: 14px; padding-top: 10px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
        @media print { body { background: #FFFFFF; padding: 0; } .sheet { box-shadow: none; border: none; padding: 12px; } }
    </style></head><body>
    <div class="sheet">
        <div class="brand-row">
            <div class="brand-left">
                <img src="${logoSrc}" alt="TaiyariGhar" class="brand-logo" onerror="this.style.display='none'">
                <span class="brand-name">TaiyariGhar</span>
            </div>
            <span class="brand-tag">BI Analytics Report</span>
        </div>
        <div class="title">${d.testName} — BI Analytics Dashboard</div>
        <div class="sub">Candidate: ${d.studentName} (${d.loginId}) • Score: ${d.scoreVal}/${d.totalMarksVal} (${d.percentVal}%) • Rank: ${d.rankVal}${d.totalStudVal !== '-' ? ' / ' + d.totalStudVal : ''}</div>

        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-lbl">CANDIDATE</div>
                <div class="kpi-val">${d.studentName}</div>
                <div class="kpi-sub" style="color:#4F46E5;">ID: ${d.loginId}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-lbl">SCORE &amp; RANK</div>
                <div class="kpi-val">${d.scoreVal} / ${d.totalMarksVal}</div>
                <div class="kpi-sub" style="color:#059669;">Rank ${d.rankVal}${d.totalStudVal !== '-' ? ' of ' + d.totalStudVal : ''}</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-lbl">ACCURACY</div>
                <div class="kpi-val" style="color:#4338CA;">${d.accuracyPct}%</div>
                <div class="kpi-sub">${d.correct} Right / ${d.wrong} Wrong</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-lbl">AVG SPEED &amp; SLOW Qs</div>
                <div class="kpi-val" style="color:#D97706;">${d.avgSec}s / Q</div>
                <div class="kpi-sub">Slow (&gt;120s): ${d.slowQ} Qs</div>
            </div>
        </div>

        <div class="card">
            <div class="card-head">
                <span>Question Distribution Across All ${d.totalQ} Questions</span>
                <span style="font-size:12px;color:#475569;">Attempted: <b>${d.attempted}/${d.totalQ}</b> • Skipped: <b>${d.skipped}</b></span>
            </div>
            <div class="bar">
                <div style="width:${cPct}%;background:#10B981;"></div>
                <div style="width:${wPct}%;background:#EF4444;"></div>
                <div style="width:${sPct}%;background:#94A3B8;"></div>
            </div>
            <div class="legend">
                <span>🟢 Correct: ${d.correct} (${cPct}%)</span>
                <span>🔴 Wrong: ${d.wrong} (${wPct}%)</span>
                <span>⚪ Unattempted: ${d.skipped} (${sPct}%)</span>
                <span>⚡ Fast (≤45s): ${d.fastQ}</span>
                <span>🟡 Moderate (46–120s): ${d.modQ}</span>
                <span>🔴 Slow (&gt;120s): ${d.slowQ}</span>
            </div>
        </div>

        <div class="card" style="margin-bottom:0;">
            <div class="card-head">
                <span>Question Matrix &amp; Per-Question Time (${d.totalQ} Questions)</span>
                <span style="font-size:11.5px;color:#64748B;">Candidate: ${d.studentName}</span>
            </div>
            <div class="matrix">${matrixCells}</div>
        </div>

        <div class="foot-note">
            <span>TaiyariGhar (www.taiyarighar.in) — Mehnat Aapki, Saath Hamara</span>
            <span>Candidate: ${d.studentName} (${d.loginId})</span>
        </div>
    </div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (w) {
        w.document.write(html);
        w.document.close();
        w.onload = function () { setTimeout(() => w.print(), 250); };
        setTimeout(() => { try { w.print(); } catch (e) {} }, 600);
    }
};

window.shareBiDashboardSummary = function () {
    const d = getBiAnalyticsPayload();
    const text = `📊 TaiyariGhar BI Dashboard Report
Candidate: ${d.studentName} (${d.loginId})
Test: ${d.testName}
Score: ${d.scoreVal}/${d.totalMarksVal} (${d.percentVal}%) | Rank: ${d.rankVal}${d.totalStudVal !== '-' ? '/' + d.totalStudVal : ''}
Attempted: ${d.attempted}/${d.totalQ} | Right: ${d.correct}, Wrong: ${d.wrong}, Skip: ${d.skipped}
Accuracy: ${d.accuracyPct}% | Avg Speed: ${d.avgSec}s/Q | Slow (>120s): ${d.slowQ}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

window.backToMockTestsView = function () {
    if (!isLoggedIn) return showLogin();
    if (nav && nav.mainCat) {
        openCategory(nav.mainCat);
    } else {
        goDashboard();
    }
};
