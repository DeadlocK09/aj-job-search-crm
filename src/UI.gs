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
  showGmailImportSidebar();
}

/**
 * Opens the review-first Gmail import sidebar.
 * Scanning does not modify Gmail or the Applications sheet.
 */
function showGmailImportSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile("GmailImportSidebar")
    .setTitle("Review Gmail Applications");

  SpreadsheetApp.getUi().showSidebar(html);
}


function showSettings() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nSettings");

}

function showEditApplicationSidebar(applicationId) {
  const template = HtmlService.createTemplateFromFile(
    "EditApplicationSidebar"
  );

  template.applicationId = String(applicationId);

  const html = template
    .evaluate()
    .setTitle("Edit Application");

  SpreadsheetApp.getUi().showSidebar(html);
}

function repairApplicationDataConsistencyFromMenu() {
  const result = repairApplicationDataConsistency();

  const message = [
    "CareerFlow stability repair completed.",
    "",
    "Normalized cells: " + result.normalizedCells,
    "Unrecognized cells: " + result.unrecognizedCells,
    "Current ID sequence: " + result.applicationSequence
  ].join("\n");

  SpreadsheetApp.getUi().alert(message);
}
