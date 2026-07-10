/**
 * UI Functions
 */

function showDashboard() {

  SpreadsheetApp.getActiveSpreadsheet()
    .setActiveSheet(
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName("Dashboard")
    );

}

function addApplication() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nApplication Form");

}

function scanGmail() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nScanning Gmail...");

}

function updateDashboard() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nUpdating Dashboard");

}

function showSettings() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nSettings");

}

function showAbout() {

  SpreadsheetApp
    .getUi()
    .alert(
      "AJ Job Search CRM\n\nVersion 1.0\n\nBuilt with Google Apps Script"
    );

}