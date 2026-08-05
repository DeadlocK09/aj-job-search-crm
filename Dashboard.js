/**
 * CareerFlow Dashboard
 */

function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const dashboard = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  const applications = ss.getSheetByName(CONFIG.SHEETS.APPLICATIONS);

  if (!dashboard || !applications) {
    SpreadsheetApp.getUi().alert(
      "Dashboard or Applications sheet was not found."
    );
    return;
  }

  const totalApplications = Math.max(applications.getLastRow() - 1, 0);
  const followUpsDue = getFollowUpsDueCount_(applications);

  dashboard.clear();
  dashboard.setHiddenGridlines(true);

  // Title
  dashboard.getRange("A1:H1").merge();

  dashboard
    .getRange("A1")
    .setValue("🚀 CareerFlow Dashboard")
    .setFontSize(22)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground("#1A73E8")
    .setFontColor("#FFFFFF");

  dashboard.setRowHeight(1, 40);

  // Statistics cards
  const statusCounts = getApplicationStatusCounts_(applications);

buildDashboardCard_(
  dashboard,
  3,
  1,
  "Applications",
  totalApplications
);

buildDashboardCard_(
  dashboard,
  3,
  4,
  "Interviews",
  statusCounts.interviews
);

buildDashboardCard_(
  dashboard,
  8,
  1,
  "Offers",
  statusCounts.offers
);

buildDashboardCard_(
  dashboard,
  8,
  4,
  "Rejected",
  statusCounts.rejected
);

buildDashboardCard_(
  dashboard,
  3,
  7,
  "Follow-ups Due",
  followUpsDue
);
/**
 * Counts applications by status.
 *
 * Status is stored in column I.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} applicationsSheet
 * @returns {{
 *   interviews: number,
 *   offers: number,
 *   rejected: number
 * }}
 */
function getApplicationStatusCounts_(applicationsSheet) {
  const lastRow = applicationsSheet.getLastRow();

  const counts = {
    interviews: 0,
    offers: 0,
    rejected: 0
  };

  if (lastRow < 2) {
    return counts;
  }

  const statuses = applicationsSheet
    .getRange(2, 9, lastRow - 1, 1)
    .getValues();

  statuses.forEach(function (row) {
    const status = String(row[0] || "")
      .trim()
      .toLowerCase();

    if (status.includes("interview")) {
      counts.interviews++;
    }

    if (status === "offer" || status === "accepted") {
      counts.offers++;
    }

    if (status === "rejected") {
      counts.rejected++;
    }
  });

  return counts;
}

  // Recent applications title
  dashboard
    .getRange("A13:D13")
    .merge()
    .setValue("Recent Applications")
    .setFontWeight("bold")
    .setFontSize(14)
    .setBackground("#E8F0FE");

  if (totalApplications === 0) {
    dashboard
      .getRange("A14:D14")
      .merge()
      .setValue("No applications recorded yet.");

    ss.setActiveSheet(dashboard);
    return;
  }

  const numberOfRecentRecords = Math.min(totalApplications, 5);

  const recentApplications = applications
    .getRange(
      applications.getLastRow() - numberOfRecentRecords + 1,
      1,
      numberOfRecentRecords,
      4
    )
    .getValues()
    .reverse();

  dashboard
    .getRange(14, 1, recentApplications.length, 4)
    .setValues(recentApplications);

  dashboard
    .getRange(14, 2, recentApplications.length, 1)
    .setNumberFormat("mmm d, yyyy");

  dashboard.autoResizeColumns(1, 8);

  ss.setActiveSheet(dashboard);
}

/**
 * Builds one dashboard statistics card.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} row
 * @param {number} column
 * @param {string} title
 * @param {number} value
 */
function buildDashboardCard_(sheet, row, column, title, value) {
  const cardRange = sheet.getRange(row, column, 3, 2);

  cardRange
    .setBackground("#F8F9FA")
    .setBorder(true, true, true, true, false, false);

  sheet
    .getRange(row, column, 1, 2)
    .merge()
    .setValue(title)
    .setBackground("#E8F0FE")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet
    .getRange(row + 1, column, 2, 2)
    .merge()
    .setValue(value)
    .setFontSize(24)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
}

/**
 * Counts applications whose follow-up date is today or overdue.
 *
 * Follow-up Date: column M
 * Status: column I
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} applicationsSheet
 * @returns {number}
 */
function getFollowUpsDueCount_(applicationsSheet) {
  const lastRow = applicationsSheet.getLastRow();

  if (lastRow < 2) {
    return 0;
  }

  const rows = applicationsSheet
    .getRange(2, 1, lastRow - 1, 13)
    .getValues();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let count = 0;

  rows.forEach(function (row) {
    const status = String(row[8] || "")
      .trim()
      .toLowerCase();

    const followUpDate = row[12];

    const closedStatuses = [
      "accepted",
      "rejected",
      "withdrawn"
    ];

    if (closedStatuses.includes(status)) {
      return;
    }

    if (!(followUpDate instanceof Date)) {
      return;
    }

    const normalizedFollowUpDate = new Date(followUpDate);
    normalizedFollowUpDate.setHours(0, 0, 0, 0);

    if (normalizedFollowUpDate <= today) {
      count++;
    }
  });

  return count;
}