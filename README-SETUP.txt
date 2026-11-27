TaiyariGhar Complete Cloudflare D1 + GitHub Pack
================================================

1. Cloudflare Worker (`taiyarighar-api`) Update:
   - `worker.js` file ke code ko Cloudflare Dashboard -> Workers & Pages -> `taiyarighar-api` -> Edit code mein paste karke Deploy karein.
   - `DB` binding (`taiyarighar-db`) aur `ADMIN_API_KEY` (`TG_ADMIN_2026_3026_SECURE`) pehle se set hain.

2. GitHub Repository Root Mein Upload Karein (Purani files ko replace karein):
   - `index.html`
   - `tg-admin-secure-99x.html`
   - `student-app.js`
   - `admin-app.js`
   - `tg-api-config.js`
   - `tg-student-bridge.js`
   - `tg-admin-bridge.js`
   - `sw.js`
   - `partner.html`
   - `manifest.json`
   - `sitemap.xml`

3. Khas Baat:
   - Admin Portal (`tg-admin-secure-99x.html`) ka login password wahi Firebase se chalta rahega.
   - Tab 4 (Bulk Qs & Practice Bank) se Excel upload karne par ab questions seedha Cloudflare D1 (`taiyarighar-db`) mein save honge aur Student Practice Bank / NCERT Bank mein wahin se load honge (15 free questions per subject + full access for Pro Pass).
