# Installation and local workflow

## Requirements

- Node.js and npm
- Visual Studio Code
- `@google/clasp`
- Access to the connected Google Apps Script project

## Setup

```bash
npm install -g @google/clasp
clasp login
git clone https://github.com/DeadlocK09/aj-job-search-crm.git
cd aj-job-search-crm
clasp pull
npm test
```

The repository's `.clasp.json` points to the existing Apps Script project and
uses `src/` as the push directory. Keep `.clasprc.json`, tokens, passwords, and
other credentials out of Git.

## Safe change cycle

1. Pull the latest Apps Script source with `clasp pull`.
2. Edit the files in `src/` using Visual Studio Code.
3. Run `npm test`.
4. Commit and push the tested change to GitHub.
5. Deploy that same commit with `clasp push`.
6. Test the affected feature in the connected Google Sheet.

## Gmail authorization

The first use of `Review Gmail Applications` may display a Google authorization
prompt because the script now reads Gmail messages that match the configured
search. Complete authorization using the same Google account that owns the CRM.
CareerFlow does not mark messages read, move them, delete them, or apply labels.

Version 1.3.0 can install one optional time-driven Gmail trigger after you
explicitly select `Enable Daily Gmail Scan` and confirm the notification email.
Google may request authorization to manage the trigger and send notification
emails. The schedule runs once per day between 8:00 and 9:00 AM Asia/Manila.
Use `Disable Daily Gmail Scan` to remove it. Automatic imports remain disabled.

Version 1.4.0 adds a separate manual Gmail status-review scan. It uses the
existing Gmail read permission and does not add a status-update trigger. The
scan never changes an application. A status changes only after you select a
matched suggestion and confirm it in the sidebar.

## First deployment of the stability-fixes ZIP

Extract the ZIP into a separate folder, open that folder in Visual Studio Code,
and run:

```bash
npm test
clasp push
```

Do not run `clasp pull` before this first push because it would overwrite the
patched files with the older source currently in Apps Script.
