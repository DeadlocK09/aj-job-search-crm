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
