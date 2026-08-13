/**
 * CareerFlow
 * Main Entry Point
 */

function onOpen() {
  const followUpMenuLabel =
    getFollowUpMenuLabel_();

  SpreadsheetApp.getUi()
    .createMenu("🚀 CareerFlow")
    .addItem("📊 Dashboard", "updateDashboard")
    .addItem(
      followUpMenuLabel,
      "showFollowUpNotifications"
    )
    .addSeparator()
    .addItem("🔍 Search Applications", "showSearchSidebar")
    .addItem("➕ Add Application", "addApplication")
    .addItem(
      "📧 Review Gmail Applications",
      "showGmailImportSidebar"
    )
    .addItem(
      "📨 Review Gmail Status Updates",
      "showGmailStatusUpdateSidebar"
    )
    .addItem(
      "⏱ Enable Daily Gmail Scan",
      "enableScheduledGmailScanFromMenu"
    )
    .addItem(
      "🧪 Check Gmail Scan Now",
      "runScheduledGmailScanNowFromMenu"
    )
    .addItem(
      "ℹ️ Gmail Scan Status",
      "showGmailScanScheduleStatusFromMenu"
    )
    .addItem(
      "⏹ Disable Daily Gmail Scan",
      "disableScheduledGmailScanFromMenu"
    )
    .addSeparator()
    .addItem(
      "🛠 Repair Data Consistency",
      "repairApplicationDataConsistencyFromMenu"
    )
    .addSeparator()
    .addItem("ℹ️ About", "showAbout")
    .addToUi();

  showFollowUpReminderToast_();
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    "CareerFlow v" + CONFIG.VERSION +
      "\n\nBuilt by AJ using Google Apps Script."
  );
}
