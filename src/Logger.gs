/**
 * CareerFlow
 * Activity Logging
 */

const GMAIL_LOG_HEADERS = [
  "Timestamp",
  "Level",
  "Action",
  "Gmail Message ID",
  "Application ID",
  "Company",
  "Position",
  "Details"
];

/**
 * Returns the Logs sheet and initializes its header when it is empty.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getLogsSheet_() {
  const spreadsheet = getCareerFlowSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEETS.LOGS);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEETS.LOGS);
  }

  if (sheet.getLastRow() === 0) {
    sheet
      .getRange(1, 1, 1, GMAIL_LOG_HEADERS.length)
      .setValues([GMAIL_LOG_HEADERS])
      .setFontWeight("bold")
      .setBackground("#E8F0FE");

    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Writes one Gmail import event without storing the email body.
 *
 * @param {Object} event
 */
function logGmailEvent_(event) {
  const data = event || {};

  getLogsSheet_().appendRow([
    getCurrentTimestamp(),
    String(data.level || "INFO"),
    String(data.action || "GMAIL_EVENT"),
    String(data.messageId || ""),
    String(data.applicationId || ""),
    String(data.company || ""),
    String(data.position || ""),
    String(data.details || "")
  ]);
}

/**
 * Returns Gmail message IDs that were already imported successfully.
 *
 * @returns {Object<string, boolean>}
 */
function getImportedGmailMessageIds_() {
  return getGmailMessageIdsForActions_(["GMAIL_IMPORTED"]);
}

/**
 * Returns Gmail message IDs already used for a confirmed status update.
 *
 * @returns {Object<string, boolean>}
 */
function getProcessedGmailStatusMessageIds_() {
  return getGmailMessageIdsForActions_(["GMAIL_STATUS_UPDATED"]);
}

/**
 * Returns Gmail message IDs logged with one of the supplied actions.
 *
 * @param {Array<string>} actions
 * @returns {Object<string, boolean>}
 */
function getGmailMessageIdsForActions_(actions) {
  const sheet = getCareerFlowSpreadsheet_()
    .getSheetByName(CONFIG.SHEETS.LOGS);

  if (!sheet) {
    return {};
  }

  const lastRow = sheet.getLastRow();
  const messageIds = {};
  const allowedActions = {};

  (actions || []).forEach(function (action) {
    allowedActions[String(action || "").trim()] = true;
  });

  if (lastRow < 2) {
    return messageIds;
  }

  const rows = sheet
    .getRange(2, 3, lastRow - 1, 2)
    .getValues();

  rows.forEach(function (row) {
    const action = String(row[0] || "").trim();
    const messageId = String(row[1] || "").trim();

    if (allowedActions[action] && messageId) {
      messageIds[messageId] = true;
    }
  });

  return messageIds;
}
