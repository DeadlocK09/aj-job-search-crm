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
  const sheet = getCareerFlowSpreadsheet_()
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

  if (!company) {
    throw new Error("Company is required.");
  }

  if (!position) {
    throw new Error("Position is required.");
  }

  const platform = requireCanonicalChoice_(
    data.platform,
    CONFIG.PLATFORMS,
    "Platform"
  );

  const workType = requireCanonicalChoice_(
    data.workType,
    CONFIG.WORK_TYPES,
    "Work type"
  );

  const sheet = getApplicationsSheet();
  const applicationId = getNextApplicationId_(sheet);
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
        platform: canonicalizeExistingChoice_(
          row[4],
          CONFIG.PLATFORMS
        ),
        location: String(row[5] || ""),
        workType: canonicalizeExistingChoice_(
          row[6],
          CONFIG.WORK_TYPES
        ),
        salary: String(row[7] || ""),
        status: canonicalizeExistingChoice_(
          row[8],
          CONFIG.STATUS_VALUES
        ),
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

  if (lastRow < 2) {
    throw new Error("No applications were found.");
  }

  const platform = requireCanonicalChoice_(
    data.platform,
    CONFIG.PLATFORMS,
    "Platform"
  );

  const workType = requireCanonicalChoice_(
    data.workType,
    CONFIG.WORK_TYPES,
    "Work type"
  );

  const status = requireCanonicalChoice_(
    data.status,
    CONFIG.STATUS_VALUES,
    "Status"
  );

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
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
    platform,
    String(data.location || "").trim(),
    workType,
    String(data.salary || "").trim(),
    status,
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

  if (!String(applicationId || "").trim()) {
    throw new Error("Application ID is required.");
  }

  if (lastRow < 2) {
    throw new Error("No applications were found.");
  }

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues();

  for (let index = 0; index < ids.length; index++) {
    if (String(ids[index][0]) === String(applicationId)) {
      sheet.deleteRow(index + 2);

      updateDashboard();

      return {
        success: true
      };
    }
  }

  throw new Error("Application not found: " + applicationId);
}

/**
 * Repairs case/whitespace differences in application choices, reapplies
 * dropdown validation, and synchronizes the persistent ID counter.
 * Unknown values are preserved and reported instead of being guessed.
 *
 * @returns {{normalizedCells:number, unrecognizedCells:number,
 *   applicationSequence:number}}
 */
function repairApplicationDataConsistency() {
  const sheet = getApplicationsSheet();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const lastRow = sheet.getLastRow();
  const dataRowCount = Math.max(lastRow - 1, 0);

  let normalizedCells = 0;
  let unrecognizedCells = 0;

  const choiceColumns = [
    {
      column: 5,
      allowedValues: CONFIG.PLATFORMS
    },
    {
      column: 7,
      allowedValues: CONFIG.WORK_TYPES
    },
    {
      column: 9,
      allowedValues: CONFIG.STATUS_VALUES
    }
  ];

  if (dataRowCount > 0) {
    choiceColumns.forEach(function (choiceColumn) {
      const range = sheet.getRange(
        2,
        choiceColumn.column,
        dataRowCount,
        1
      );

      const values = range.getValues();
      let columnChanged = false;

      values.forEach(function (row) {
        const originalValue = String(row[0] || "");
        const canonicalValue = findCanonicalChoice_(
          originalValue,
          choiceColumn.allowedValues
        );

        if (!canonicalValue && originalValue.trim()) {
          unrecognizedCells++;
          return;
        }

        if (canonicalValue && canonicalValue !== originalValue) {
          row[0] = canonicalValue;
          normalizedCells++;
          columnChanged = true;
        }
      });

      if (columnChanged) {
        range.setValues(values);
      }
    });
  }

  applyApplicationsDataValidation_(sheet);
  spreadsheet.setSpreadsheetTimeZone(CONFIG.TIME_ZONE);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  let applicationSequence = 0;

  try {
    applicationSequence = syncApplicationIdSequence_(sheet);
  } finally {
    lock.releaseLock();
  }

  updateDashboard();

  return {
    normalizedCells: normalizedCells,
    unrecognizedCells: unrecognizedCells,
    applicationSequence: applicationSequence
  };
}

/**
 * Reapplies canonical dropdown lists to the Applications sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function applyApplicationsDataValidation_(sheet) {
  const validationRowCount = Math.max(
    sheet.getMaxRows() - 1,
    1
  );

  const choiceColumns = [
    {
      column: 5,
      allowedValues: CONFIG.PLATFORMS
    },
    {
      column: 7,
      allowedValues: CONFIG.WORK_TYPES
    },
    {
      column: 9,
      allowedValues: CONFIG.STATUS_VALUES
    }
  ];

  choiceColumns.forEach(function (choiceColumn) {
    const validation = SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        choiceColumn.allowedValues,
        true
      )
      .setAllowInvalid(false)
      .build();

    sheet
      .getRange(
        2,
        choiceColumn.column,
        validationRowCount,
        1
      )
      .setDataValidation(validation);
  });
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
