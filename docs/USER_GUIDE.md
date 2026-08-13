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
- `📨 Review Gmail Status Updates` scans hiring-process emails, matches safe
  suggestions to existing applications, and requires confirmation before a
  status changes.
- `⏱ Enable Daily Gmail Scan` creates one optional daily notification schedule.
- `🧪 Check Gmail Scan Now` safely runs the scheduled scan path on demand.
- `ℹ️ Gmail Scan Status` shows whether the schedule is enabled and summarizes
  the most recent run.
- `⏹ Disable Daily Gmail Scan` removes the current user's CareerFlow trigger.
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

## Scheduled Gmail notifications

1. Open `🚀 CareerFlow → ⏱ Enable Daily Gmail Scan`.
2. Confirm the notification account and authorize Google if requested.
3. CareerFlow creates one daily trigger for the current user. Apps Script runs
   it sometime between 8:00 and 9:00 AM in the `Asia/Manila` timezone.
4. When new application-confirmation candidates are found, CareerFlow emails a
   short list and a link back to the spreadsheet.
5. Open `Review Gmail Applications` to edit, select, and manually import any
   candidate you want to track.

The enable time becomes the first scan boundary, so old unimported candidates
do not produce an initial notification flood. A successful scan advances the
boundary and does not repeatedly email the same candidates. Messages that
arrive while a scan is already running remain eligible for the next scan.

`Check Gmail Scan Now` uses the same notification-only path and never imports
anything. `Disable Daily Gmail Scan` removes all copies of the CareerFlow Gmail
trigger owned by the current user; manual Gmail Review continues to work.

## Gmail status update review

1. Open `🚀 CareerFlow → 📨 Review Gmail Status Updates`.
2. Review the scan totals. Unmatched, ambiguous, already processed, unchanged,
   and unsafe messages are excluded from the selectable suggestions.
3. Check the application ID, company, position, current status, proposed
   status, and confidence indicators on each card.
4. Select only the status changes you recognize. Correct the proposed interview
   stage when necessary.
5. Click `Apply Selected Status Updates` and confirm the count.

Every suggestion starts unselected. Before applying a change, CareerFlow
rechecks the application's current status. It blocks the update if the CRM was
changed after the scan, if the proposed change moves backward, or if the
application is already Accepted, Rejected, or Withdrawn. Successful updates
change only the Status and Last Updated fields, rebuild the dashboard, and log
the old and new status without storing the email body.

The status-review scanner does not mark Gmail messages read, move them, delete
them, or apply labels. Status changes are never automatic.
