/**
 * AJ Job Search CRM
 * Main Entry Point
 * Version 1.0
 */

function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu("🚀 AJ Job Search CRM")
    .addItem("📊 Dashboard", "showDashboard")
    .addSeparator()
    .addItem("➕ Add Application", "addApplication")
    .addItem("📧 Scan Gmail", "scanGmail")
    .addSeparator()
    .addItem("📈 Update Dashboard", "updateDashboard")
    .addSeparator()
    .addItem("⚙ Settings", "showSettings")
    .addItem("ℹ About", "showAbout")
    .addToUi();

}