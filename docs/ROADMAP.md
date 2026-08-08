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

## Next

1. Verify Gmail parsing against real application-confirmation emails
2. Gmail phase 2: status-update detection and optional scheduled scan/trigger
   management, with automatic imports remaining disabled by default
3. Sprint 9: sidebar and dashboard UI/UX polish

Automatic Gmail imports remain intentionally disabled until the review-first
workflow has been verified against the user's real email formats.
