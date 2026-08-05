# Changelog

## 1.1.0 - 2026-08-06

- Added a live due-follow-up count to the CareerFlow menu
- Added an automatic spreadsheet-open reminder for overdue and due-today work
- Added a detailed follow-up alert with application IDs and due labels
- Excluded future follow-ups and closed applications from notifications
- Added automated notification tests
- Removed trailing whitespace from the Search sidebar

## 1.0.1 - 2026-08-05

- Recovered the complete live Apps Script source into version control
- Added a locked, persistent application ID sequence
- Added canonical status, platform, and work-type validation
- Added a one-time data consistency repair command
- Prevented repeated Add-form submissions while a save is in progress
- Made empty-database deletion fail safely
- Removed the outdated Add-form placeholder message
- Changed the Apps Script manifest timezone to `Asia/Manila`
- Added automated stability tests and local `clasp` documentation
