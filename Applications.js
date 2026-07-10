/**
 * CareerFlow
 * Applications Module
 */

/**
 * Creates the Applications sheet if it doesn't exist
 * and initializes the headers.
 */
function initializeApplicationsSheet() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(CONFIG.SHEETS.APPLICATIONS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.APPLICATIONS);
  }

  const headers = [
    "Application ID",
    "Date Applied",
    "Company",
    "Position",
    "Platform",
    "Location",
    "Work Type",
    "Salary",
    "Status",
    "Recruiter",
    "Recruiter Email",
    "Job URL",
    "Follow-up Date",
    "Resume Version",
    "Cover Letter",
    "Notes",
    "Last Updated"
  ];

  sheet.clear();

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format the header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);

  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1A73E8");
  headerRange.setFontColor("#FFFFFF");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  SpreadsheetApp.getUi().alert(
    "Applications sheet initialized successfully!"
  );

}