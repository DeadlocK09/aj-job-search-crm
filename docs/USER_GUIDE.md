# User guide

Open the connected `AJ Job Search CRM` spreadsheet and use the
`🚀 CareerFlow` menu.

- `📊 Dashboard` rebuilds the live dashboard.
- `🔔 Follow-ups Due (number)` lists applications that are overdue or due
  today. The number refreshes whenever the spreadsheet is reopened.
- `🔍 Search Applications` opens search, edit, delete, and job-link actions.
- `➕ Add Application` opens the protected application form.
- `📧 Review Gmail Applications` scans recent application-confirmation emails
  and opens editable suggestions. Nothing is imported until you select and
  confirm it.
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

## Gmail review and import

1. Open `🚀 CareerFlow → 📧 Review Gmail Applications`.
2. Approve Gmail access if Google requests authorization.
3. Review the scan totals and each suggested application.
4. Correct the company or position when necessary, choose the work type, and
   select only the applications you want to add.
5. Click `Import Selected Applications` and confirm the count.

The scanner searches recent application-submission confirmations only. It does
not mark messages read, move them, delete them, or apply labels. It also does
not import automatically. Previously imported Gmail message IDs and existing
company/position pairs are skipped. Successful imports are recorded on the
`Logs` tab; full email bodies are not stored.
