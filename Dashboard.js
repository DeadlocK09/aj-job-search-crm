/**
 * =====================================
 * Dashboard Module
 * =====================================
 */

/**
 * Returns dashboard statistics.
 */
function getDashboardStats() {

  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEETS.APPLICATIONS);

  const totalApplications =
    Math.max(sheet.getLastRow() - 1, 0);

  return {

    totalApplications: totalApplications

  };

}