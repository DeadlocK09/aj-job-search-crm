# User guide

Open the connected `AJ Job Search CRM` spreadsheet and use the
`🚀 CareerFlow` menu.

- `📊 Dashboard` rebuilds the live dashboard.
- `🔍 Search Applications` opens search, edit, delete, and job-link actions.
- `➕ Add Application` opens the protected application form.
- `🛠 Repair Data Consistency` normalizes capitalization and spaces, reapplies
  dropdown validation, and synchronizes the persistent ID counter.

Run the repair once after deploying version 1.0.1. If the summary reports
unrecognized cells, review those values manually; the repair deliberately does
not guess an unknown platform, work type, or status.
