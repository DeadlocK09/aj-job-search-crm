/**
 * CareerFlow
 * Search Module
 */

function showSearchSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile("SearchSidebar")
    .setTitle("CareerFlow Search");

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Searches applications by company name and returns
 * browser-safe objects instead of raw spreadsheet rows.
 *
 * @param {string} keyword
 * @returns {Array<Object>}
 */
function searchApplications(keyword) {
  const searchTerm = String(keyword || "")
    .trim()
    .toLowerCase();

  const sheet = getApplicationsSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const rows = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  return rows
    .filter(function (row) {
      const company = String(row[2] || "").toLowerCase();

      return company.includes(searchTerm);
    })
    .map(function (row) {
      return {
        applicationId: String(row[0] || ""),
        dateApplied: formatDateForSidebar_(row[1]),
        company: String(row[2] || ""),
        position: String(row[3] || ""),
        platform: String(row[4] || ""),
        workType: String(row[6] || ""),
        status: String(row[8] || "")
      };
    });
}

/**
 * Converts spreadsheet dates into sidebar-safe text.
 *
 * @param {*} value
 * @returns {string}
 */
function formatDateForSidebar_(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "MMM d, yyyy"
    );
  }

  return String(value);
}