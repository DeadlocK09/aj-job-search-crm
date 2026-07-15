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

  const html = HtmlService
    .createHtmlOutputFromFile("AddApplication")
    .setTitle("Add Application");

  SpreadsheetApp
    .getUi()
    .showSidebar(html);

}

function scanGmail() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nScanning Gmail...");

}


function showSettings() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nSettings");

}