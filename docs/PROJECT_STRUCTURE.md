# Project structure
- `server.js`: API, session handling, access checks, upload/download, workflow and audit routes.
- `public/index.html`: responsive landing page and role-specific workspace.
- `public/assets/css/main.css`: shared design styles.
- `public/assets/js/home.js`: browser-side workflows and API calls.
- `prisma/schema.prisma`: PostgreSQL data model.
- `prisma/seed.js`: reference-only categories and district records; no operational demo applications.
- `.env.example`: local environment template.
- `private_uploads/`: created at runtime; files are not exposed by Express static hosting.
