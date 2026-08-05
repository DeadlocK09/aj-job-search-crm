# User guide

Open the connected `AJ Job Search CRM` spreadsheet and use the
`🚀 CareerFlow` menu.

- `📊 Dashboard` rebuilds the live dashboard.
- `🔔 Follow-ups Due (number)` lists applications that are overdue or due
  today. The number refreshes whenever the spreadsheet is reopened.
- `🔍 Search Applications` opens search, edit, delete, and job-link actions.
- `➕ Add Application` opens the protected application form.
- `🛠 Repair Data Consistency` normalizes capitalization and spaces, reapplies
  dropdown validation, and synchronizes the persistent ID counter.

Run the repair once after deploying version 1.0.1. If the summary reports
unrecognized cells, review those values manually; the repair deliberately does
not guess an unknown platform, work type, or status.

## Follow-up reminders

When the spreadsheet opens, CareerFlow shows a short toast only when one or
more active applications have an overdue or due-today follow-up. Use the
`Follow-ups Due` menu item to see the application IDs and details. Follow-ups
scheduled for tomorrow or later and applications marked Accepted, Rejected,
or Withdrawn are not included in the due count.
