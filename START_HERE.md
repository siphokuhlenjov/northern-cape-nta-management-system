# Northern Cape NTA – enhanced project (v3)

This is a **development build** of the Northern Cape National Teaching Awards application. It includes the existing teacher registration/application, district vetting, provincial compliance, evidence upload, support assistant, notifications, award cycles and audit trail, plus a public FAQ, published CMS pages, basic visit analytics, admin overview, editable site configuration, content CRUD and bulk operations, health view, and configuration export/import.

## Run on Windows (PowerShell)

1. Extract the ZIP. Open PowerShell in the folder containing `package.json`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` if `.env` does not exist: `Copy-Item .env.example .env`.
4. Edit `.env` using `notepad .env`. Set `DATABASE_URL` to the **real PostgreSQL username/password**, host, port and existing database. The shipped `nta_admin:CHANGE_ME` is deliberately **not** a working credential. PostgreSQL must be running. Do not share your password. URL-encode reserved characters in the password. Set a long random `SESSION_SECRET`.
5. Create database `nta_northern_cape` in pgAdmin if missing. For a local development install, use the actual `postgres` login (or an explicitly created application role with schema privileges). In pgAdmin you can use Query Tool on the postgres database: `CREATE DATABASE nta_northern_cape;` (only if it does not exist). To use `nta_admin`, create that login and grant CONNECT and USAGE/CREATE on schema public to it; changing the database password in `.env` alone cannot create an account.
6. Run these **one at a time**, stopping if a command fails:
   ```powershell
   npx prisma validate
   npm run db:generate
   npm run db:push
   npm run db:seed
   npm start
   ```
7. Open `http://localhost:3000`. Admin console: `http://localhost:3000/admin.html`.
8. Create the first staff account **after** the DB is ready: `npm run staff:create`. Follow the prompts and choose an authorised role. Staff accounts are not seeded by default.

**Important:** `prisma db pull` introspects the database and may overwrite your local Prisma schema. Do not run it as a routine connectivity test. Use `npx prisma validate` and `npm run db:push` after setting credentials. Do not run `db:push` against an important existing database without taking a backup and reviewing schema changes.

## Features and limits

- **Public site:** homepage explaining the portal, sign-in/register calls to action, FAQ, published announcements, support widget, deadlines/countdown.
- **Workflows:** existing teacher applications, evidence uploads, district vetting and provincial compliance; national adjudicators are not an in-app role.
- **Analytics:** application counts by status, unique-ish page visits (per IP and page per minute, no tracking cookie), 14-day graph, server error counts, process uptime and memory. These are **basic application metrics**, not Google Analytics or real-time network monitoring. No sales charts: this is not an e-commerce system.
- **CMS:** admin create/edit/delete/publish/unpublish pages and bulk actions; imported JSON pages start unpublished. Text is rendered as text to reduce XSS risk. Image/media library is **not implemented**; existing evidence uploads remain separate.
- **Settings:** site title, tagline, theme, SEO description, contact email, domain label, alert preference. Changing a domain label does not configure DNS/SSL. Alert preference does not send email; external email provider integration is needed.
- **Data:** approved-application CSV export (changes export status), configuration JSON export, page JSON import. **Not a complete backup/restore.** For complete backups use PostgreSQL `pg_dump` and test restores in a separate environment.
- **Security:** session auth and staff role restrictions are included. This development build is **not production-certified**; implement CSRF protection, rate limiting, secure deployment, privacy controls, independent penetration testing and a full backup/recovery plan before processing real teacher data.

## Example page import file

```json
{"pages":[{"slug":"important-update","title":"Important update","summary":"Information for applicants","body":"Details here."}]}
```

## Troubleshooting

- `P1000` means wrong PostgreSQL credentials. Check `.env` and the account in pgAdmin. PostgreSQL being *running* does not prove the login works.
- `P1001` means database host/port cannot be reached.
- `P1012` means invalid Prisma schema. This release fixes the original one-line enum syntax.
- If seed fails, run `node prisma/seed.js` to see the underlying error. Never post secrets from `.env`.
