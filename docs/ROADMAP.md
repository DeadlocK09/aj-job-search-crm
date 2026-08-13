# Roadmap

## Completed

- Core Add/Search/Edit/Delete workflow
- Advanced application filters
- Live dashboard counts and recent applications
- Follow-ups Due counter and upcoming follow-up list
- Menu notifications for overdue and due-today follow-ups
- Stability package: persistent IDs, canonical choices, guarded submissions,
  safe empty-database deletion, Manila timezone, and source backup
- Review-first Gmail application-confirmation scanner
- Editable, manually confirmed Gmail imports with message-ID and
  company/position duplicate protection
- Gmail import logging without storing full message bodies
- Opt-in daily Gmail scan with email notifications for new candidates
- Trigger enable, status, manual check, and disable controls
- Background-safe access to the connected spreadsheet
- Review-first Gmail status update detection for assessment, interview, offer,
  and rejection messages
- Conservative existing-application matching with manual status confirmation
- Stale-review, duplicate-message, backward-transition, and closed-status
  protection
- Status change logging without storing full email bodies

## Next

1. Continue verifying Gmail parsing against more real application-confirmation
   and hiring-status formats
2. Sprint 9: sidebar and dashboard UI/UX polish
3. Add optional reporting and analytics views after the interface refresh

Automatic Gmail imports and automatic status changes remain intentionally
disabled. Email-derived changes continue to require manual review.
