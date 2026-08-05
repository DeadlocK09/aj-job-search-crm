/**
 * CareerFlow
 * Main Entry Point
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 CareerFlow")
    .addItem("📊 Dashboard", "updateDashboard")
    .addSeparator()
    .addItem("🔍 Search Applications", "showSearchSidebar")
    .addItem("➕ Add Application", "addApplication")
    .addSeparator()
    .addItem(
      "🛠 Repair Data Consistency",
      "repairApplicationDataConsistencyFromMenu"
    )
    .addSeparator()
    .addItem("ℹ️ About", "showAbout")
    .addToUi();
}

function showAbout() {
  SpreadsheetApp.getUi().alert(
    "CareerFlow v" + CONFIG.VERSION +
      "\n\nBuilt by AJ using Google Apps Script."
  );
}
