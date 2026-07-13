/**
 * CareerFlow
 * Applications Module
 */

/**
 * Creates the Applications sheet if it does not exist
 * and initializes the headers without deleting existing data.
 */
function initializeApplicationsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(CONFIG.SHEETS.APPLICATIONS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.APPLICATIONS);
  }

  // Stop if the sheet already contains headers or records.
  if (sheet.getLastRow() > 0) {
    SpreadsheetApp.getUi().alert(
      "Applications sheet already exists. No data was changed."
    );
    return;
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

  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers]);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);

  headerRange
    .setFontWeight("bold")
    .setBackground("#1A73E8")
    .setFontColor("#FFFFFF");

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  SpreadsheetApp.getUi().alert(
    "Applications sheet initialized successfully!"
  );
}

/**
 * Saves a new job application.
 *
 * @param {Object} data Form data from the sidebar.
 */
function saveApplication(data) {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEETS.APPLICATIONS);

  const lastRow = sheet.getLastRow();

  const applicationId =
  generateApplicationId(lastRow);

  sheet.appendRow([
    applicationId,
    getCurrentTimestamp(),          // Date Applied
    data.company,
    data.position,
    data.platform,
    data.location,
    data.workType,
    data.salary,
    CONFIG.STATUS.APPLIED,
    "",                  // Recruiter
    "",                  // Recruiter Email
    data.jobUrl,
    "",                  // Follow-up Date
    data.resumeVersion,
    data.coverLetter,
    data.notes,
    getCurrentTimestamp() // Last Updated           
  ]);

  return {
    success: true,
    applicationId: applicationId
  };

}