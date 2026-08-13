# AJ Job Search CRM

AJ Job Search CRM (CareerFlow) is a Google Sheets and Apps Script tool for
tracking job applications, statuses, follow-up dates, and recent activity.

## Current features

- Add, search, edit, and delete applications
- Filter by company, status, platform, and work type
- Live dashboard totals and recent applications
- Upcoming and overdue follow-up tracking
- Dynamic due-follow-up menu count and automatic open reminder
- Detailed overdue and due-today follow-up alert
- Review-first Gmail scanner for application confirmations
- Editable Gmail import candidates with confirmation and duplicate protection
- Gmail import activity logging without storing full email bodies
- Optional daily Gmail scan with new-candidate email notifications
- One-click schedule enable, status check, manual test, and disable controls
- Review-first Gmail status detection for assessments, interviews, offers, and
  rejections
- Conservative application matching, stale-review protection, and manual
  confirmation before any status change
- Canonical dropdown validation for platform, work type, and status
- Persistent application IDs that are not reused after deletion

## Local workflow

The Apps Script source is stored in `src/` and is linked through `.clasp.json`.

```bash
clasp pull
npm test
clasp push
```

When deploying the provided stability-fixes ZIP for the first time, skip
`clasp pull` and run `npm test` followed by `clasp push`; pulling first would
replace the patched files with the older live source.

After pushing, test the changes in the connected Google Sheet before committing
and publishing the Git branch. Never commit `.clasprc.json` or other credential
files.

See [docs/INSTALL.md](docs/INSTALL.md) for setup and
[docs/ROADMAP.md](docs/ROADMAP.md) for planned work.
