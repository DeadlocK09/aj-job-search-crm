/**
 * AJ Job Search CRM
 * Main Entry Point
 * Version 1.0
 */

function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu("🚀 CareerFlow")
    .addItem("➕ Add Application", "addApplication")
    .addSeparator()
    .addItem("🛠 Initialize Database", "initializeApplicationsSheet")
    .addSeparator()
    .addItem("ℹ️ About", "showAbout")
    .addToUi();

}

function showAbout() {

  SpreadsheetApp.getUi().alert(
    "CareerFlow v1.0.0\n\nBuilt by AJ using Google Apps Script."
  );

}