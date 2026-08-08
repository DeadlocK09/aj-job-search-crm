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

## Next

1. Continue verifying Gmail parsing against more real application-confirmation
   formats
2. Gmail phase 3: detect interview, assessment, rejection, and offer updates
   for manual review before changing an application status
3. Sprint 9: sidebar and dashboard UI/UX polish

Automatic Gmail imports and automatic status changes remain intentionally
disabled. Email-derived changes continue to require manual review.
