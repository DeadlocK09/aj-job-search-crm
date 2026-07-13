/**
 * CareerFlow
 * Applications Module
 */

/**
 * Returns the Applications sheet.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getApplicationsSheet() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEETS.APPLICATIONS);

  if (!sheet) {
    throw new Error(
      'Applications sheet was not found. Please create the "Applications" sheet first.'
    );
  }

  return sheet;
}

/**
 * Database initialization is disabled to protect existing data.
 */
function initializeApplicationsSheet() {
  throw new Error(
    "Database initialization has been disabled to protect existing application data."
  );
}

/**
 * Saves a new job application.
 *
 * @param {Object} data Form data from the sidebar.
 * @returns {{success: boolean, applicationId: string}}
 */
function saveApplication(data) {
  if (!data) {
    throw new Error("No application data was received.");
  }

  const company = String(data.company || "").trim();
  const position = String(data.position || "").trim();
  const platform = String(data.platform || "").trim();
  const workType = String(data.workType || "").trim();

  if (!company) {
    throw new Error("Company is required.");
  }

  if (!position) {
    throw new Error("Position is required.");
  }

  if (!platform) {
    throw new Error("Platform is required.");
  }

  if (!workType) {
    throw new Error("Work type is required.");
  }

  const sheet = getApplicationsSheet();
  const lastRow = sheet.getLastRow();

  const applicationId = generateApplicationId(lastRow);
  const timestamp = getCurrentTimestamp();

  sheet.appendRow([
    applicationId,
    timestamp,                         // Date Applied
    company,
    position,
    platform,
    String(data.location || "").trim(),
    workType,
    String(data.salary || "").trim(),
    CONFIG.STATUS.APPLIED,
    "",                                // Recruiter
    "",                                // Recruiter Email
    String(data.jobUrl || "").trim(),
    "",                                // Follow-up Date
    String(data.resumeVersion || "").trim(),
    String(data.coverLetter || "No").trim(),
    String(data.notes || "").trim(),
    timestamp                          // Last Updated
  ]);

  return {
    success: true,
    applicationId: applicationId
  };
}