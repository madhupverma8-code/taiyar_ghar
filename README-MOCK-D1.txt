TaiyariGhar Mock & Live Tests -> Cloudflare D1 Update Pack
==========================================================

Is update ke baad aapka architecture is tarah set hai:

[Cloudflare D1 (`taiyarighar-db`)]
- Practice Bank & NCERT Base Questions (Tab 4)
- Mock Tests & All-India Live Tests (Tab 3)

[Firebase (Bilkul Safe & Unchanged)]
- Admin Login Password
- Current Affairs, Jobs, Admit Card, Result & Study Notes (Tab 10)
- Students & Pro Pass (Tab 6)
- Payments & Invoices (Tab 7)
- Partners & Coupons (Tab 5)
- Promo Banners & Settings (Tab 11 & 12)

Setup Steps:
1. Cloudflare Worker (`taiyarighar-api`) -> Edit code mein `worker.js` paste karke Deploy karein.
2. GitHub Repository Root mein `admin-app.js`, `student-app.js`, aur `tg-admin-bridge.js` upload/replace karein.
