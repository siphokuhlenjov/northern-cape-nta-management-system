# Northern Cape National Teaching Awards Digital Management System

A role-based web application project for teacher applications, district vetting, provincial compliance approval and audit/reporting. This is a development build intended for local testing and academic demonstration. It is **not approved for real personal or confidential data** until security, policy, infrastructure and acceptance testing are completed.

## Technology
- Node.js + Express 5
- PostgreSQL + Prisma 6
- PostgreSQL-backed session store
- Private filesystem document storage (not served as public static files)
- Responsive HTML/CSS/JavaScript interface

## Requirements
Install Node.js 20 LTS or later and PostgreSQL 15 or later. Create an empty database and a database user that can create tables. Do not use a production database for local testing.

## Windows / VS Code setup
1. Extract this ZIP to a folder such as `C:\Projects\Northern_Cape_NTA_System`.
2. Open that folder in VS Code.
3. Copy `.env.example` to `.env`.
4. Edit `DATABASE_URL` with your local PostgreSQL username, password, host and database name. Set `SESSION_SECRET` to a long random secret.
5. In VS Code choose **Terminal → New Terminal** and run:
   ```powershell
   npm install
   npx prisma generate
   npx prisma db push
   npm run db:seed
   npm start
   ```
6. Open `http://localhost:3000`. Check `http://localhost:3000/api/health` if the page reports that the database is unavailable.

The server loads `.env` from the application folder, so its database and session settings are available even if Node is started from a different working directory.

## First-time access / staff accounts
- Teachers register themselves from the page. Teachers and authorised staff use the same sign-in form; after staff sign-in, open **Admin console** or `/admin.html` for the administration tools. Passwords are hashed with bcrypt.
- Teacher registration requires a SACE certificate; ID documents, supporting evidence (up to 10 files) and motivational letters (up to 5) are optional. Files may be PDF/JPG/PNG up to 10 MB each. Generate the Prisma client and apply the document table without dropping existing session data:
  ```powershell
  npm run db:generate
  npx prisma db execute --schema .\prisma\schema.prisma --file .\add_teacher_registration_document_table.sql
  ```
- No fake teacher profiles, schools, applications or staff logins are seeded.
- After `npm run db:seed`, create the first administrator from the VS Code terminal with `npm run staff:create`. The script prompts for an email, role and password; district officials are linked to a district. It supports `SYSTEM_ADMIN`, `PROVINCIAL_OFFICIAL`, and `DISTRICT_ADMIN` roles.
- The password prompt is visible in the terminal, so do not run the script while screen-sharing or recording. Use a unique development password and store it securely. No staff credentials are included in the ZIP.
- Add the official school directory using the School Directory screen after signing in with an authorised staff account. Do not invent school names or EMIS numbers.

## Password reset email
Password reset emails contain a single-use link that expires after 30 minutes. Passwords are never emailed. Configure SMTP in the server's local `.env` file and restart the server to enable delivery:
```dotenv
APP_URL=https://your-public-site.example
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-provider-username
SMTP_PASS=your-provider-app-password
SMTP_FROM=notifications@your-domain.example
MAIL_FROM_NAME=Northern Cape NTA
```
Use the SMTP app password/credential issued by your email provider, not a personal mailbox password, and never commit `.env`. Port 587 uses STARTTLS; use `SMTP_SECURE=true` with a provider's implicit-TLS port (typically 465). For development without SMTP, the reset link is shown on the Forgot-password page only; it is not printed to server logs. SMTP credentials have not been supplied or configured in this project, so email delivery will remain unavailable until the system administrator sets them.

## Included functional workflows
- Teacher registration (server-side validation with per-field messages, consent, SACE normalisation, duplicate email/SACE detection, a required privately stored SACE certificate, and optional identity document, supporting evidence and motivational-letter uploads), sign-in / sign-out, and token-based password reset (30-minute single-use links; hashed in the database).
- Role-protected teacher application drafts, school/category selection, submission, document upload and download, status history, and dispute submission.
- District queue filtered by assigned district, checklist-based vetting, return/approve/disqualify decisions and audit events.
- Service-tenure review displays teacher-reported and verified years of total and current-school service, records reviewer evidence notes, and checks the configured category minimum before district approval. Confirm all criteria against the current official award guide.
- System administrators and provincial officials can configure eligibility reminders and required/optional document lists for each award-cycle/category pair. Teachers see the matching checklist before creating a draft and in application readiness; missing configured documents warn but do not prevent submission. These settings are guidance only and do not determine eligibility.
- System administrators and provincial officials can create award cycles, set dates and guide links from either the staff workspace or admin console. Expired open cycles close automatically when a new cycle is opened; a still-active cycle must be closed first.
- After upgrading the Prisma client, add service-tenure review columns without disturbing live sessions: `npx prisma db execute --schema .\prisma\schema.prisma --file .\add_service_tenure_checks.sql`.
- After upgrading the Prisma client, add the cycle/category requirements table without disturbing live sessions: `npm run db:generate` then `npx prisma db execute --schema .\prisma\schema.prisma --file .\add_cycle_category_requirements.sql`.
- Provincial compliance decisions, cycle management, CSV export restricted to provincial-approved applications, and audit log view.
- Private upload directory; file type and size checks; SHA-256 metadata; application access checks on document download.
- School directory maintenance, notifications, dispute management, and reassessment task creation/status updates.
- Dashboard statistics from PostgreSQL, not seeded fake application records.

## Important limitations before real use
This is a broad functional development build, not a production-certified or fully policy-validated system. It does not yet implement email verification, mandatory MFA, a complete staff-account management screen, a formal amendment/version scope workflow for published rules, full PDF/XLSX reporting, configurable per-cycle scoring rubrics, malware scanning, object storage, retention/restore drills, comprehensive automated tests, or a penetration test. Official NTA eligibility rules must be verified against the applicable DBE guide and configured by authorised staff; do not infer them from category labels. Configured document requirements are applicant-facing warnings and do not block submission or replace district verification.

## Security and privacy
- Do not use real teacher data in public or shared test environments.
- Keep `.env`, database backups and `private_uploads/` out of source control and out of public web roots.
- Set `NODE_ENV=production`, use HTTPS, a strong `SESSION_SECRET`, a least-privilege DB user and protected backups for a properly configured deployment.
- Restrict the server to trusted networks until security review is complete.
- Have the provincial department approve retention, consent, access, correction, dispute, and breach-response procedures before operational use.

## Troubleshooting
- `P1000` / authentication failed: check PostgreSQL username/password in `.env`.
- `P1001` / cannot reach database: ensure PostgreSQL is running and host/port are correct.
- Prisma client missing: run `npx prisma generate`.
- Empty category or district list: run `npm run db:seed`.
- Port in use: change `PORT=3001` in `.env`.


## Support assistant and award-date countdown

The homepage now shows a countdown for the configured open cycle's closing date, or the next configured opening date. If no dates are configured, it tells the user that the dates need to be set by an authorised official.

The floating Support Assistant helps with site navigation, sign-in basics, drafts, and file-upload troubleshooting only. It must not be treated as an eligibility or policy authority. Without `OPENAI_API_KEY`, it uses built-in guided responses. To enable AI responses, add an API key to `.env` and optionally set `OPENAI_MODEL` (default `gpt-4o-mini`). Restart the Node server after editing `.env`. Never put the API key in browser JavaScript or commit it to source control.


## v2.1 changes
- Teacher registration rewritten: clear per-field errors, password strength meter and confirmation, consent checkbox, citizenship/title selects, instant sign-in after registering, welcome notification, helpful messages when the database is unreachable or out of date.
- Forgot-password now works end to end (`/forgot-password.html`, `/reset-password.html`, `/api/auth/forgot-password`, `/api/auth/reset-password`). Reset links are single-use and expire after 30 minutes. SMTP email delivery is supported when configured; without SMTP, development shows the link on the Forgot-password page only.
- Hall of Fame photo viewer fixed (script was missing its `.js` extension and was never loaded).
- Basic rate limiting on register, sign-in and reset endpoints.
- `npm run doctor` checks your setup; `npm run db:seed:demo` (optional, never in production) adds clearly-labelled demo schools, an open demo cycle and demo staff logins.
- Debug helper scripts with hard-coded IDs moved to `scripts/debug/`.
