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
    throw new Error('The "Applications" sheet was not found.');
  }

  return sheet;
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
    timestamp,                                  // Date Applied
    company,
    position,
    platform,
    String(data.location || "").trim(),
    workType,
    String(data.salary || "").trim(),
    CONFIG.STATUS.APPLIED,
    "",                                         // Recruiter
    "",                                         // Recruiter Email
    String(data.jobUrl || "").trim(),
    "",                                         // Follow-up Date
    String(data.resumeVersion || "").trim(),
    String(data.coverLetter || "No").trim(),
    String(data.notes || "").trim(),
    timestamp                                   // Last Updated
  ]);

  updateDashboard();

  return {
    success: true,
    applicationId: applicationId
  };
}
/**
 * Returns one application by ID.
 *
 * @param {string} applicationId
 * @returns {Object}
 */
function getApplicationById(applicationId) {
  const sheet = getApplicationsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error("No applications were found.");
  }

  const rows = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (String(row[0]) === String(applicationId)) {
      return {
        applicationId: String(row[0] || ""),
        dateApplied: formatDateForSidebar_(row[1]),
        company: String(row[2] || ""),
        position: String(row[3] || ""),
        platform: String(row[4] || ""),
        location: String(row[5] || ""),
        workType: String(row[6] || ""),
        salary: String(row[7] || ""),
        status: String(row[8] || ""),
        recruiter: String(row[9] || ""),
        recruiterEmail: String(row[10] || ""),
        jobUrl: String(row[11] || ""),
        followUpDate: formatDateInput_(row[12]),
        resumeVersion: String(row[13] || ""),
        coverLetter: String(row[14] || "No"),
        notes: String(row[15] || "")
      };
    }
  }

  throw new Error("Application not found: " + applicationId);
}

/**
 * Updates an existing application.
 *
 * @param {Object} data
 * @returns {{success: boolean, applicationId: string}}
 */
function updateApplication(data) {
  if (!data || !data.applicationId) {
    throw new Error("Application ID is required.");
  }

  const company = String(data.company || "").trim();
  const position = String(data.position || "").trim();

  if (!company) {
    throw new Error("Company is required.");
  }

  if (!position) {
    throw new Error("Position is required.");
  }

  const sheet = getApplicationsSheet();
  const lastRow = sheet.getLastRow();

  const ids = sheet
    .getRange(2, 1, Math.max(lastRow - 1, 1), 1)
    .getValues();

  let targetRow = -1;

  for (let index = 0; index < ids.length; index++) {
    if (String(ids[index][0]) === String(data.applicationId)) {
      targetRow = index + 2;
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error("Application not found: " + data.applicationId);
  }

  const existingDateApplied = sheet.getRange(targetRow, 2).getValue();

  sheet.getRange(targetRow, 1, 1, 17).setValues([[
    data.applicationId,
    existingDateApplied,
    company,
    position,
    String(data.platform || "").trim(),
    String(data.location || "").trim(),
    String(data.workType || "").trim(),
    String(data.salary || "").trim(),
    String(data.status || "Applied").trim(),
    String(data.recruiter || "").trim(),
    String(data.recruiterEmail || "").trim(),
    String(data.jobUrl || "").trim(),
    parseDateInput_(data.followUpDate),
    String(data.resumeVersion || "").trim(),
    String(data.coverLetter || "No").trim(),
    String(data.notes || "").trim(),
    getCurrentTimestamp()
  ]]);

  updateDashboard();

  return {
    success: true,
    applicationId: data.applicationId
  };
}

/**
 * Deletes an application by ID.
 *
 * @param {string} applicationId
 * @returns {{success:boolean}}
 */
function deleteApplication(applicationId) {

  const sheet = getApplicationsSheet();

  const lastRow = sheet.getLastRow();

  const ids = sheet
    .getRange(2,1,lastRow-1,1)
    .getValues();

  for(let i=0;i<ids.length;i++){

    if(String(ids[i][0])===String(applicationId)){

      sheet.deleteRow(i+2);

      updateDashboard();

      return {
        success:true
      };

    }

  }

  throw new Error(
    "Application not found."
  );

}

/**
 * Converts a date to yyyy-MM-dd for HTML date inputs.
 *
 * @param {*} value
 * @returns {string}
 */
function formatDateInput_(value) {
  if (!(value instanceof Date)) {
    return "";
  }

  return Utilities.formatDate(
    value,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

/**
 * Converts an HTML date value into a Date object.
 *
 * @param {string} value
 * @returns {Date|string}
 */
function parseDateInput_(value) {
  if (!value) {
    return "";
  }

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return "";
  }

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}