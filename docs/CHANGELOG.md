# Changelog

## 1.2.0 - 2026-08-08

- Added a review-first Gmail scanner for recent application confirmations
- Added conservative company, position, and platform parsing
- Added editable candidates that are never preselected
- Added explicit confirmation before importing any application
- Added Gmail message-ID and company/position duplicate protection
- Added import logging without saving full email bodies
- Added spreadsheet-formula injection protection for imported email text
- Kept automatic imports and time-driven Gmail triggers disabled by default
- Added automated parser, scan, duplicate, import, and sidebar safety tests

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
