# Demo-day guide

## 1. One-time setup (about 3 minutes)

Stop the server first (Ctrl+C), then in the project folder run **one at a time**:

```powershell
npm run db:generate      # picks up the new password-reset table
npm run db:push          # creates that table (safe: only adds)
npm run db:seed          # categories + districts (safe to repeat)
npm run db:seed:demo     # OPTIONAL: demo schools, OPEN demo cycle, demo staff logins
npm run doctor           # tells you exactly what is still wrong, if anything
npm start
```

Open **http://localhost:3000** (not a file, not VS Code Live Server).

`npm run doctor` checks: .env, database login, tables, categories, districts, schools, open cycle, staff accounts, password-reset table. Fix every red line before presenting.

### Demo logins (only after `npm run db:seed:demo`)
Password for all: `DemoPassw0rd!2026` (override with `DEMO_PASSWORD=... npm run db:seed:demo`)

| Role | Email |
|---|---|
| System admin | admin@demo.nta.test |
| Provincial official | provincial@demo.nta.test |
| District admin (Frances Baard) | district.francesbaard@demo.nta.test |
| District admin (others) | district.johntaologaetsewe@…, district.namakwa@…, district.pixleykaseme@…, district.zfmgcawu@… (all `@demo.nta.test`) |

Demo schools are named `DEMO … School (District)` with fake `DEMO-` EMIS numbers. They are **not** official data. Remove them before any real use. Teachers register live during the demo.

## 2. Suggested 8-minute presentation flow

1. **Home page** – value proposition, countdown to cycle close, Hall of Fame photos (click one: lightbox).
2. **Teacher registration** – show inline validation (blank form, weak password, mismatched passwords, years at school > years teaching), then register properly. You land signed in, with a welcome notification.
3. **Forgot password** – sign out, use *Forgot password?*, enter the email. In development without SMTP configured, the reset link appears on the page. With SMTP configured, it is emailed. Set a new password, then sign in with it. Reset links are single-use and expire after 30 minutes.
4. **New application** – pick a category and a demo school, tick the declaration, upload a PDF/JPG/PNG, submit.
5. **District admin** – sign in as the district admin for that school's district. Open the application, complete the vetting checklist, approve.
6. **Provincial official** – compliance approval, then *Export approved records* (CSV).
7. **Audit logs / Admin console** – show the trail of every step, plus `/admin.html` analytics and CMS.

## 3. If something goes wrong on the day

| Symptom | Fix |
|---|---|
| "Cannot reach the NTA server" | `npm start` is not running, or you opened the page on another port |
| "database is not reachable" | PostgreSQL service stopped, or wrong DATABASE_URL |
| "tables are missing or out of date" | Stop server → `npm run db:push` |
| `P1000` on any prisma command | Wrong DB username/password in `.env` |
| Teacher cannot create application | No OPEN cycle or no schools: `npm run db:seed:demo` or use Award cycles / Manage schools screens |
| `EPERM` on `db:generate` (Windows) | The server is still running; stop it first |

## 4. Honest limitations to mention if asked
- Password-reset emails are **not sent** (no email provider configured). The link is shown/logged in development only; in production (`NODE_ENV=production`) it is never returned to the browser and an email integration is required.
- Still a development build: no MFA, no email verification, no malware scanning; see README "Important limitations".
