# Feature checklist

| Request | Implementation |
|---|---|
| Clear homepage value proposition | Existing hero + updated tagline setting |
| Simple navigation and CTAs | Homepage nav, teacher workspace CTA, admin link |
| FAQ | Public FAQ section |
| Analytics / charts | Admin KPI cards, visits chart, application status |
| Activity logs | Existing audited actions, recent events |
| Monitoring | DB health, process uptime/memory, error count |
| Site configuration | Admin settings API and editor |
| Custom workflows | Existing vetting/notifications; custom workflow builder not included |
| Password reset email | SMTP delivery of one-time 30-minute reset links; requires provider credentials in `.env` |
| CMS | Text pages/announcements CRUD, publish, bulk actions |
| Media management | Evidence uploads only; general CMS media library not included |
| Database export/import | Approved CSV export, config JSON export, page JSON import |
| Full database backup and restore | Requires PostgreSQL backup tools; not implemented in UI |
| Bulk actions | CMS publish/unpublish/delete selected pages |
| Sales charts | Not applicable to awards system |
| Password reset | Token links (30 min, single use); delivered by configured SMTP in production, shown on the reset page in development when SMTP is not configured |
| Hall of Fame viewer | Working lightbox with next/previous and keyboard support |
| Setup diagnostics | `npm run doctor` |

This file distinguishes implemented features from integration/deployment work still required.
