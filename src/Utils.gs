/**
 * ==========================================
 * Utils Library
 * CareerFlow
 * ==========================================
 */

/**
 * Generates an application ID.
 *
 * Example:
 * APP-000001
 */
function generateApplicationId(number) {

  return `${CONFIG.ID_PREFIX}-${String(number).padStart(6, "0")}`;

}

/**
 * Returns the current timestamp.
 */
function getCurrentTimestamp() {

  return new Date();

}

/**
 * Remembers the bound spreadsheet for time-driven trigger executions.
 * Scheduled triggers do not always have an active spreadsheet context.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function rememberCareerFlowSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("The CareerFlow spreadsheet is not available.");
  }

  PropertiesService
    .getScriptProperties()
    .setProperty(
      CONFIG.PROPERTIES.SPREADSHEET_ID,
      spreadsheet.getId()
    );

  return spreadsheet;
}

/**
 * Returns the active spreadsheet or reopens the remembered spreadsheet when
 * CareerFlow is running from a time-driven trigger.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getCareerFlowSpreadsheet_() {
  const activeSpreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty(CONFIG.PROPERTIES.SPREADSHEET_ID);

  if (!spreadsheetId) {
    throw new Error(
      "CareerFlow does not know which spreadsheet to open. " +
      "Enable the Gmail schedule again from the spreadsheet menu."
    );
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

/**
 * Returns the canonical value from an allowed list.
 * Matching ignores surrounding whitespace and capitalization.
 *
 * @param {*} value
 * @param {Array<string>} allowedValues
 * @returns {string}
 */
function findCanonicalChoice_(value, allowedValues) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "";
  }

  for (let index = 0; index < allowedValues.length; index++) {
    const allowedValue = String(allowedValues[index]);

    if (allowedValue.toLowerCase() === normalized) {
      return allowedValue;
    }
  }

  return "";
}

/**
 * Returns a canonical choice or throws a useful validation error.
 *
 * @param {*} value
 * @param {Array<string>} allowedValues
 * @param {string} fieldName
 * @returns {string}
 */
function requireCanonicalChoice_(
  value,
  allowedValues,
  fieldName
) {
  const canonicalValue = findCanonicalChoice_(
    value,
    allowedValues
  );

  if (!canonicalValue) {
    throw new Error(fieldName + " is invalid.");
  }

  return canonicalValue;
}

/**
 * Returns a canonical choice when possible and otherwise preserves
 * the trimmed value for backward compatibility with older records.
 *
 * @param {*} value
 * @param {Array<string>} allowedValues
 * @returns {string}
 */
function canonicalizeExistingChoice_(value, allowedValues) {
  const trimmedValue = String(value || "").trim();

  return (
    findCanonicalChoice_(trimmedValue, allowedValues) ||
    trimmedValue
  );
}

/**
 * Extracts the numeric sequence from a CareerFlow application ID.
 *
 * @param {*} applicationId
 * @returns {number}
 */
function getApplicationSequence_(applicationId) {
  const prefix = CONFIG.ID_PREFIX + "-";
  const value = String(applicationId || "").trim();

  if (value.indexOf(prefix) !== 0) {
    return 0;
  }

  const sequence = Number(value.slice(prefix.length));

  if (!Number.isInteger(sequence) || sequence < 1) {
    return 0;
  }

  return sequence;
}

/**
 * Finds the greatest application sequence that still exists in the sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {number}
 */
function getMaximumApplicationSequence_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return 0;
  }

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues();

  return ids.reduce(function (maximum, row) {
    return Math.max(
      maximum,
      getApplicationSequence_(row[0])
    );
  }, 0);
}

/**
 * Synchronizes the saved application sequence with existing records.
 * The caller must hold the script lock.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {number}
 */
function syncApplicationIdSequence_(sheet) {
  const properties = PropertiesService
    .getScriptProperties();

  const storedSequence = Number(
    properties.getProperty(
      CONFIG.PROPERTIES.LAST_APPLICATION_SEQUENCE
    ) || 0
  );

  const currentSequence = Math.max(
    Number.isFinite(storedSequence)
      ? storedSequence
      : 0,
    getMaximumApplicationSequence_(sheet)
  );

  properties.setProperty(
    CONFIG.PROPERTIES.LAST_APPLICATION_SEQUENCE,
    String(currentSequence)
  );

  return currentSequence;
}

/**
 * Generates the next application ID using a persistent, locked counter.
 * Deleted rows therefore cannot cause a previously used ID to reappear.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {string}
 */
function getNextApplicationId_(sheet) {
  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const nextSequence =
      syncApplicationIdSequence_(sheet) + 1;

    PropertiesService
      .getScriptProperties()
      .setProperty(
        CONFIG.PROPERTIES.LAST_APPLICATION_SEQUENCE,
        String(nextSequence)
      );

    return generateApplicationId(nextSequence);
  } finally {
    lock.releaseLock();
  }
}
