:root { 
    --primary: #4F46E5; --primary-hover: #4338CA; --secondary: #EC4899; 
    --accent: #10B981; --danger: #EF4444; --bg: #F3F4F6; --text: #1F2937; 
    --white: #FFFFFF; --purple: #8B5CF6; --grey: #9CA3AF;
    --test-header: #0F172A;
}

* { box-sizing: border-box; font-family: 'Poppins', sans-serif; margin: 0; padding: 0; }
body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
.hide { display: none !important; }

.btn { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block; text-align: center; transition: all 0.3s ease; font-family: 'Poppins', sans-serif; }
.btn-primary { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: var(--white); box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3); }
.btn-primary:hover { transform: translateY(-2px); }
.btn-accent { background: var(--accent); color: var(--white); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
.btn-outline { border: 2px solid var(--primary); color: var(--primary); background: transparent; }
.btn-outline:hover { background: var(--primary); color: white; }

.lang-btn { border: 2px solid var(--primary); background: transparent; color: var(--primary); padding: 6px 12px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.3s; font-family: 'Poppins', sans-serif; font-size: 13px; margin-right: 8px;}
.lang-btn:hover { background: var(--primary); color: white; }
.install-btn { background: var(--accent); color: white; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; border: none; cursor: pointer; margin-right: 8px; display: flex; align-items: center; gap: 5px;}

.header { background: var(--white); padding: 12px 5%; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; flex-wrap: wrap; gap: 10px; transition: all 0.3s ease; }
.header.scrolled { padding: 8px 5%; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(5px); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }

.logo { display: flex; align-items: center; gap: 8px; transition: 0.3s; cursor: pointer; }
.logo img { height: 45px; width: auto; object-fit: contain; }

.nav-links { display: flex; gap: 20px; align-items: center; }
.nav-links a { text-decoration: none; color: var(--text); font-weight: 500; font-size: 14px; cursor: pointer; }
.nav-links a:hover { color: var(--primary); }
.header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;}

/* Live Dot Animation in Navbar */
.live-dot-nav { width: 9px; height: 9px; background-color: #DC2626; border-radius: 50%; display: inline-block; animation: livePulse 1.4s infinite; }
@keyframes livePulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 7px rgba(220, 38, 38, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}

.profile-menu { position: relative; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: var(--primary); background: #EEF2FF; padding: 6px 14px; border-radius: 20px; }
.profile-dropdown { position: absolute; top: 120%; right: 0; background: var(--white); box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 12px; width: 200px; display: none; flex-direction: column; padding: 10px 0; border: 1px solid #E5E7EB; z-index: 200; }
.profile-menu:hover .profile-dropdown { display: flex; }
.profile-dropdown a { padding: 10px 20px; text-decoration: none; color: var(--text); font-weight: 500; font-size: 14px;}
.profile-dropdown a:hover { background: #F3F4F6; color: var(--primary); }

/* =========================================================
   FULL-WIDTH LAPTOP MOCKUP HERO BANNER WITH BLUR OVERLAY
   ========================================================= */
.hero-banner-full {
    position: relative;
    width: 100%;
    min-height: 410px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    padding: 45px 5%;
    background: #0F172A;
}

.hero-bg-media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    filter: blur(2.5px) brightness(0.88);
    transform: scale(1.03);
    z-index: 0;
}

.hero-dark-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.78) 100%);
    z-index: 1;
}

.hero-banner-content {
    position: relative;
    z-index: 2;
    max-width: 860px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.hero-banner-content h1 {
    font-size: 44px;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 16px;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.55);
}

.hero-grad-text {
    background: linear-gradient(90deg, #38BDF8 0%, #60A5FA 45%, #818CF8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hero-banner-content p {
    font-size: 16px;
    color: #F1F5F9;
    line-height: 1.65;
    max-width: 680px;
    margin-bottom: 26px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
}

.hero-cta-group {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    justify-content: center;
}

.hero-btn-sub {
    background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%);
    color: #FFFFFF;
    padding: 13px 26px;
    font-size: 15px;
    font-weight: 700;
    border-radius: 10px;
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}
.hero-btn-sub:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(16, 185, 129, 0.55); }

.hero-btn-free {
    background: rgba(15, 23, 42, 0.65);
    color: #FFFFFF;
    border: 2px solid rgba(255, 255, 255, 0.8);
    padding: 11px 24px;
    font-size: 15px;
    font-weight: 700;
    border-radius: 10px;
    backdrop-filter: blur(6px);
}
.hero-btn-free:hover { background: #FFFFFF; color: #0F172A; transform: translateY(-2px); }

/* =========================================================
   3-TIER SUBSCRIPTION & DISCOUNT PLAN CARDS
   ========================================================= */
.plan-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
}

.plan-card {
    position: relative;
    background: #F8FAFC;
    border: 2px solid #E2E8F0;
    border-radius: 12px;
    padding: 18px 10px 14px;
    cursor: pointer;
    transition: all 0.25s ease;
    text-align: center;
}
.plan-card:hover { border-color: #A5B4FC; transform: translateY(-2px); }
.plan-card.selected {
    background: #EEF2FF;
    border-color: var(--primary);
    box-shadow: 0 6px 18px rgba(79, 70, 229, 0.2);
}

.plan-best-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #F59E0B, #EA580C);
    color: white;
    font-size: 10px;
    font-weight: 800;
    padding: 2px 10px;
    border-radius: 12px;
    letter-spacing: 0.5px;
    white-space: nowrap;
}

.plan-save-tag {
    display: inline-block;
    background: #D1FAE5;
    color: #065F46;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    margin-bottom: 6px;
}

.plan-price-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
    margin-top: 2px;
}
.plan-mrp {
    font-size: 13px;
    color: #9CA3AF;
    text-decoration: line-through;
    font-weight: 500;
}
.plan-offer {
    font-size: 22px;
    font-weight: 800;
    color: var(--primary);
}

.plan-summary-box {
    background: #F8FAFC;
    border: 1px dashed #CBD5E1;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 16px;
    font-size: 13px;
}
.ps-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    color: #334155;
}
.ps-row.ps-total {
    border-top: 1px solid #E2E8F0;
    padding-top: 8px;
    margin-top: 6px;
    margin-bottom: 0;
    font-size: 16px;
    font-weight: 800;
    color: #1E1B4B;
}

/* Live Test Showcase Card */
.live-showcase-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 10px; }
.live-card { background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; border-radius: 14px; padding: 20px 22px; box-shadow: 0 10px 25px rgba(30, 27, 75, 0.25); display: flex; flex-direction: column; justify-content: space-between; gap: 14px; border: 1px solid rgba(255,255,255,0.12); position: relative; overflow: hidden; }
.live-badge-pill { display: inline-flex; align-items: center; gap: 6px; background: #DC2626; color: white; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; width: fit-content; }
.live-card h3 { font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 4px 0; }
.live-card p { font-size: 13px; color: #C7D2FE; margin: 0; }
.live-timer-strip { background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; color: #FDE047; display: flex; justify-content: space-between; align-items: center; }

/* Candidate Read-Only Profile Card on Dashboard */
.candidate-profile-card { background: var(--white); border-radius: 14px; padding: 20px 24px; box-shadow: 0 4px 18px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; border-left: 5px solid var(--primary); }
.cp-left { display: flex; align-items: center; gap: 15px; }
.cp-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; font-size: 22px; font-weight: 700; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
.cp-right { text-align: right; }
.sub-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
.sub-badge.pro { background: #D1FAE5; color: #065F46; }
.sub-badge.free { background: #FEF3C7; color: #92400E; }

/* Attempt History List on Dashboard */
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item { background: var(--white); padding: 14px 18px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border: 1px solid #E5E7EB; }

.section { padding: 25px 5%; }
.section-title { font-size: 22px; font-weight: 700; margin-bottom: 15px; color: var(--text); }

.category-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 15px; width: 100%; }
.cat-card { flex: 1 1 250px; max-width: 320px; padding: 25px 15px; border-radius: 12px; box-shadow: 0 6px 15px rgba(0,0,0,0.1); cursor: pointer; transition: 0.3s; text-align: center; color: white; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 150px; }
.cat-card:hover { transform: translateY(-5px) scale(1.03); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
.cat-icon { font-size: 40px; margin-bottom: 10px; text-shadow: 0 3px 6px rgba(0,0,0,0.3);}
.cat-title { font-size: 20px; font-weight: 800; text-shadow: 1px 1px 4px rgba(0,0,0,0.6); line-height: 1.2; letter-spacing: 0.5px;}
.cat-sub-text { font-size: 13px; opacity: 0.95; margin-top: 8px; font-weight: 500; text-shadow: 1px 1px 3px rgba(0,0,0,0.5); }

.wide-cat-banner { padding: 20px 25px; border-radius: 12px; color: white; display: flex; justify-content: space-between; align-items: center; margin-top: 15px; box-shadow: 0 8px 20px rgba(0,0,0,0.15); cursor: pointer; transition: 0.3s;}
.wide-cat-banner:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(0,0,0,0.25);}
.wide-cat-banner h2 { font-size: 20px; margin-bottom: 5px; color: white; text-shadow: 1px 1px 3px rgba(0,0,0,0.4);}
.wide-cat-banner p { font-size: 13px; opacity: 0.9; text-shadow: 1px 1px 2px rgba(0,0,0,0.4);}

.sub-cat-container { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px; }
.sub-cat-pill { padding: 8px 16px; background: white; border: 2px solid var(--primary); color: var(--primary); border-radius: 20px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 14px; }
.sub-cat-pill:hover, .sub-cat-pill.active { background: var(--primary); color: white; }

.exam-type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px; margin-top: 15px; margin-bottom: 30px; }
.exam-name-card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; padding: 25px 15px; text-align: center; cursor: pointer; transition: 0.3s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.exam-name-card:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.08); border-color: #D1D5DB; }
.exam-name-card.active { background: #EEF2FF; border: 2px solid var(--primary); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); }
.exam-name-card .e-icon { font-size: 32px; }
.exam-name-card .e-title { font-size: 14px; font-weight: 600; color: #374151; line-height: 1.3; }
.exam-name-card.active .e-title { color: var(--primary); }

@media (max-width: 768px) {
    .exam-type-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .exam-name-card { padding: 15px 10px; gap: 8px; }
    .exam-name-card .e-icon { font-size: 26px; }
    .exam-name-card .e-title { font-size: 12px; }
}

.quick-view { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 15px; }
.qv-card { background: var(--white); padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-left: 5px solid var(--secondary); }
.qv-card h3 { font-size: 13px; color: var(--grey); margin-bottom: 10px; text-transform: uppercase; }
.qv-card p { font-size: 16px; font-weight: 700; margin-bottom: 15px; color: var(--text); }

.test-list { display: flex; flex-direction: column; gap: 12px; }
.test-item { background: var(--white); padding: 15px 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; border: 1px solid #E5E7EB; }
.test-item.locked { border-left: 5px solid var(--grey); opacity: 0.92; }

.steps-container { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 15px; margin-top: 20px; }
.step-box { flex: 1; min-width: 150px; text-align: center; position: relative; }
.step-num { width: 40px; height: 40px; background: var(--primary); color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 15px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 10px rgba(79,70,229,0.3); }
.step-box h4 { font-size: 15px; margin-bottom: 5px; color: var(--text); }
.step-box p { font-size: 12px; color: #6B7280; }

.faq-container { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 800px; margin: 0 auto; }
details { margin-bottom: 10px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px; }
details:last-child { border-bottom: none; margin-bottom: 0; }
summary { font-weight: 600; cursor: pointer; list-style: none; padding: 10px 0; color: var(--text); display: flex; justify-content: space-between; align-items: center; font-size: 15px; }
summary::-webkit-details-marker { display: none; }
summary::after { content: '+'; font-weight: bold; color: var(--primary); font-size: 20px; }
details[open] summary::after { content: '-'; }
details p { font-size: 14px; color: #6B7280; margin-top: 10px; padding-left: 10px; border-left: 3px solid var(--primary); line-height: 1.5; }

.footer { background: #1F2937; color: white; padding: 30px 5%; text-align: center; margin-top: auto; }
.footer-links { display: flex; justify-content: center; flex-wrap: wrap; gap: 15px; margin-bottom: 15px; }
.footer-links a { color: #9CA3AF; text-decoration: none; font-size: 13px; cursor: pointer; transition: 0.2s; }
.footer-links a:hover { color: var(--white); }
.footer p { font-size: 12px; color: #6B7280; }

.instruction-container { max-width: 900px; margin: 20px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.inst-header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
.inst-header h2 { color: var(--primary); font-size: 24px; }
.inst-rules { font-size: 14px; line-height: 1.8; color: #374151; margin-bottom: 20px; }
.inst-rules ul { margin-left: 20px; margin-bottom: 15px; }
.lang-select-box { margin: 20px 0; padding: 15px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; }
.lang-select-box select { padding: 10px; font-size: 15px; border-radius: 6px; border: 1px solid #ccc; width: 100%; max-width: 300px; }
.declaration-box { display: flex; align-items: center; gap: 10px; font-weight: 600; margin: 20px 0; }

/* Anti-Cheating Dynamic Watermark Overlay */
.ac-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 26px; font-weight: 800; color: rgba(15, 23, 42, 0.06); pointer-events: none; z-index: 999; white-space: nowrap; user-select: none; }

.test-header { background: var(--test-header); color: var(--white); padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top:0; z-index: 100; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
.test-header h2 { font-size: 16px; font-weight: 500; }
.timer-box { display: flex; align-items: center; gap: 12px; }
.timer { font-weight: 700; background: #1E293B; border: 1px solid #334155; padding: 8px 15px; border-radius: 8px; font-size: 18px; color: #F8FAFC;}
.timer-danger { background: var(--danger) !important; border-color: var(--danger); animation: blink 1s infinite; }
@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

.test-body { display: flex; height: calc(100vh - 65px); overflow: hidden; background: #fff; }
.question-section { flex: 1; display: flex; flex-direction: column; border-right: 1px solid #E5E7EB; }

.question-top-bar { display: flex; justify-content: space-between; padding: 15px 25px; border-bottom: 1px solid #E5E7EB; background: #F8FAFC; }
.q-num { font-size: 18px; font-weight: 600; }
.marks-badges { display: flex; gap: 10px; }
.badge { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
.badge.positive { background: #D1FAE5; color: #065F46; }
.badge.negative { background: #FEE2E2; color: #991B1B; }

.question-content { padding: 25px; overflow-y: auto; flex: 1; }
.question-text { font-size: 16px; font-weight: 500; line-height: 1.6; margin-bottom: 15px; }
.q-lang-en { display: block; margin-top: 15px; color: #4B5563; font-weight: 400; font-size: 15px; border-top: 1px dashed #ddd; padding-top: 10px;}

.q-id-tag { font-size: 12px; color: #6B7280; margin-bottom: 10px; display: inline-block; background: #F3F4F6; padding: 4px 8px; border-radius: 4px; border: 1px solid #E5E7EB;}

.options-list { display: flex; flex-direction: column; gap: 12px; }
.option-label { display: flex; align-items: flex-start; gap: 12px; padding: 15px; border: 2px solid #E5E7EB; border-radius: 8px; cursor: pointer; transition: 0.2s; font-size: 15px; }
.option-label:hover { background: #F9FAFB; border-color: #D1D5DB; }
.option-label input[type="radio"] { margin-top: 4px; transform: scale(1.2); accent-color: var(--primary); }
.opt-en { display: block; font-size: 13px; color: #6B7280; margin-top: 4px; }

.question-bottom-bar { padding: 15px 25px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; background: #fff; }
.btn-mark { background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB; }
.btn-mark.marked { background: var(--purple); color: white; border-color: var(--purple); }

.sidebar-section { width: 320px; display: flex; flex-direction: column; background: #F8FAFC; }
.profile-palette-header { padding: 15px; background: #fff; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; gap: 10px; }
.avatar { width: 40px; height: 40px; background: #E0E7FF; color: var(--primary); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 20px; font-weight: bold; }

.palette-legend { padding: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; background: #fff; }
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-box { width: 20px; height: 20px; border-radius: 4px; display: inline-block; }

.palette-area { padding: 15px; overflow-y: auto; flex: 1; background: #F8FAFC;}
.palette-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.pallet-btn { width: 100%; aspect-ratio: 1; border: none; border-radius: 6px; background: #E5E7EB; color: #374151; font-weight: 600; cursor: pointer; font-size: 14px; transition: 0.2s; border: 2px solid transparent;}
.pallet-btn.answered { background: var(--accent); color: white; border-radius: 50% 50% 50% 0; }
.pallet-btn.not-answered { background: var(--danger); color: white; border-radius: 50% 50% 0 50%; }
.pallet-btn.marked { background: var(--purple); color: white; border-radius: 50%; }
.pallet-btn.answered-marked { background: var(--purple); color: white; border-radius: 50% 50% 50% 0; position: relative;}
.pallet-btn.answered-marked::after { content: '✓'; position: absolute; bottom: -2px; right: -2px; font-size: 10px; background: var(--accent); width: 14px; height: 14px; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white;}
.pallet-btn.active { border-color: #111827; transform: scale(1.1); box-shadow: 0 0 10px rgba(0,0,0,0.2); }

.sidebar-bottom { padding: 15px; background: #fff; border-top: 1px solid #E5E7EB; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(17, 24, 39, 0.7); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.submit-modal { background: white; padding: 25px; border-radius: 12px; max-width: 600px; width: 90%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.submit-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
.submit-table th, .submit-table td { border: 1px solid #E5E7EB; padding: 12px; }
.submit-table th { background: #F8FAFC; color: var(--primary); }

.analysis-container { max-width: 800px; margin: 30px auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; }
.score-circle { width: 180px; height: 180px; border-radius: 50%; margin: 20px auto; display: flex; flex-direction: column; justify-content: center; align-items: center; background: conic-gradient(var(--accent) 0%, var(--accent) 100%); position: relative; }
.score-circle::before { content: ''; position: absolute; width: 150px; height: 150px; background: white; border-radius: 50%; }
.score-text { position: relative; z-index: 1; }
.score-text h1 { font-size: 42px; color: var(--text); margin: 0; }
.score-text p { color: #6B7280; font-size: 14px; font-weight: 500; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 25px 0; }
.stat-card { padding: 15px; border-radius: 10px; background: #F8FAFC; border: 1px solid #E5E7EB; }
.stat-card h3 { font-size: 13px; color: #6B7280; margin-bottom: 5px; }
.stat-card p { font-size: 20px; font-weight: 700; margin: 0; }
.stat-card.correct { border-bottom: 4px solid var(--accent); }
.stat-card.correct p { color: var(--accent); }
.stat-card.wrong { border-bottom: 4px solid var(--danger); }
.stat-card.wrong p { color: var(--danger); }
.stat-card.skipped { border-bottom: 4px solid var(--grey); }
.stat-card.skipped p { color: var(--grey); }

.ca-tabs { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;}
.ca-tab { padding: 10px 20px; border-radius: 20px; background: white; border: 1px solid #ddd; cursor: pointer; font-weight: 600; }
.ca-tab.active { background: var(--primary); color: white; border-color: var(--primary); }
.ca-article { background: #F8FAFC; padding: 20px; border-radius: 10px; border-left: 5px solid var(--primary); margin-bottom: 20px; }
.ca-question { background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.ca-option { display: block; padding: 12px; border: 2px solid #E5E7EB; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: 0.2s; }
.ca-option:hover { background: #F3F4F6; }
.ca-option.correct { background: #D1FAE5; border-color: #10B981; color: #065F46; font-weight: 600; }
.ca-option.wrong { background: #FEE2E2; border-color: #EF4444; color: #991B1B; font-weight: 600; }
.ca-explanation { display: none; background: #EFF6FF; padding: 12px; border-radius: 8px; color: #1E3A8A; font-size: 14px; margin-top: 10px; border-left: 4px solid #3B82F6; }

.game-popup { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; z-index: 2000; opacity: 0; transition: 0.3s; pointer-events: none; }
.game-popup.show { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
.game-popup h2 { font-size: 24px; margin-bottom: 10px; }
.game-popup.success { border-top: 5px solid var(--accent); }
.game-popup.warning { border-top: 5px solid var(--danger); }

.modal-overlay-payment { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(17, 24, 39, 0.75); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 12px; overflow-y: auto; }
.modal-box { background: white; padding: 30px; border-radius: 16px; max-width: 440px; width: 95%; text-align: center; }

.support-btn-group { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
.support-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; border-radius: 8px; font-weight: 600; text-decoration: none; color: white; transition: 0.2s; border: none; cursor: pointer; font-size: 14px;}
.support-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.15); }
.support-q { background: #4F46E5; }
.support-l { background: #F59E0B; }
.support-p { background: #10B981; }

@media (max-width: 768px) {
    .hero-banner-full { min-height: 330px; padding: 30px 5%; }
    .hero-banner-content h1 { font-size: 28px; }
    .hero-banner-content p { font-size: 14px; }
    .hero-cta-group { flex-direction: column; width: 100%; }
    .hero-btn-sub, .hero-btn-free { width: 100%; }
    .plan-cards-grid { grid-template-columns: 1fr; gap: 14px; }
    .candidate-profile-card { flex-direction: column; align-items: flex-start; }
    .cp-right { text-align: left; width: 100%; border-top: 1px solid #E5E7EB; padding-top: 10px; }
    .wide-cat-banner { flex-direction: column; text-align: center; gap: 10px;}
    .category-grid { justify-content: center; }
    .cat-card { flex: 1 1 130px; min-height: 120px; padding: 15px 10px; }
    .cat-icon { font-size: 30px; }
    .cat-title { font-size: 15px; }
    .cat-sub-text { font-size: 11px; }
    .nav-links { display: none; } 
    .test-item { flex-direction: column; align-items: flex-start; gap: 10px; }
    .header { justify-content: center;}
    .header-right { justify-content: center; width: 100%;}
    .test-body { flex-direction: column; height: auto; overflow: visible; }
    .sidebar-section { width: 100%; order: -1; }
    .question-section { overflow: visible; }
    .question-content { overflow: visible; }
    .question-bottom-bar { flex-direction: column; gap: 10px; }
    .score-circle { width: 140px; height: 140px; }
    .score-circle::before { width: 110px; height: 110px; }
    .score-text h1 { font-size: 32px; }
    .stats-grid { grid-template-columns: 1fr; }
    .steps-container { flex-direction: column; align-items: center; }
    .step-box { width: 100%; }
    .logo img { height: 35px; }
}
