/**
 * CareerFlow
 * Search Module
 */

/**
 * Opens the Search Applications sidebar.
 */
function showSearchSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile("SearchSidebar")
    .setTitle("CareerFlow Search");

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Searches applications using one or more filters.
 *
 * Supports the older string format:
 * searchApplications("Google")
 *
 * And the new filter-object format:
 * searchApplications({
 *   company: "Google",
 *   status: "Applied",
 *   platform: "LinkedIn",
 *   workType: "Remote"
 * })
 *
 * @param {string|Object} filters
 * @returns {Array<Object>}
 */
function searchApplications(filters) {
  const normalizedFilters = normalizeSearchFilters_(filters);

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
      const company = String(row[2] || "").trim().toLowerCase();
      const platform = String(row[4] || "").trim().toLowerCase();
      const workType = String(row[6] || "").trim().toLowerCase();
      const status = String(row[8] || "").trim().toLowerCase();

      const companyMatches =
        !normalizedFilters.company ||
        company.includes(normalizedFilters.company);

      const statusMatches =
        !normalizedFilters.status ||
        status === normalizedFilters.status;

      const platformMatches =
        !normalizedFilters.platform ||
        platform === normalizedFilters.platform;

      const workTypeMatches =
        !normalizedFilters.workType ||
        workType === normalizedFilters.workType;

      return (
        companyMatches &&
        statusMatches &&
        platformMatches &&
        workTypeMatches
      );
    })
    .map(function (row) {
      return {
        applicationId: String(row[0] || ""),
        dateApplied: formatDateForSidebar_(row[1]),
        company: String(row[2] || ""),
        position: String(row[3] || ""),
        platform: String(row[4] || ""),
        location: String(row[5] || ""),
        workType: String(row[6] || ""),
        status: String(row[8] || ""),
        jobUrl: String(row[11] || "").trim()
      };
    });
}

/**
 * Converts search input into a consistent filter object.
 *
 * @param {string|Object} filters
 * @returns {Object}
 */
function normalizeSearchFilters_(filters) {
  if (typeof filters === "string") {
    return {
      company: filters.trim().toLowerCase(),
      status: "",
      platform: "",
      workType: ""
    };
  }

  const input = filters || {};

  return {
    company: String(input.company || "").trim().toLowerCase(),
    status: String(input.status || "").trim().toLowerCase(),
    platform: String(input.platform || "").trim().toLowerCase(),
    workType: String(input.workType || "").trim().toLowerCase()
  };
}

/**
 * Converts spreadsheet dates into browser-safe text.
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