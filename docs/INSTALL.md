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
4. Push with `clasp push`.
5. Test Add, Search, Edit, Delete, dashboard refresh, and follow-up reminders
   in Sheets.
6. Commit and push the verified Git changes.

## Gmail authorization

The first use of `Review Gmail Applications` may display a Google authorization
prompt because the script now reads Gmail messages that match the configured
search. Complete authorization using the same Google account that owns the CRM.
CareerFlow does not modify Gmail messages and does not install an automatic
Gmail trigger in version 1.2.0.

## First deployment of the stability-fixes ZIP

Extract the ZIP into a separate folder, open that folder in Visual Studio Code,
and run:

```bash
npm test
clasp push
```

Do not run `clasp pull` before this first push because it would overwrite the
patched files with the older source currently in Apps Script.
