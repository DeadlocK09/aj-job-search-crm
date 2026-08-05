/**
 * CareerFlow
 * Dashboard Module
 */

/**
 * Rebuilds the CareerFlow Dashboard using live application data.
 */
function updateDashboard() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const dashboard = spreadsheet.getSheetByName(
    CONFIG.SHEETS.DASHBOARD
  );

  const applications = spreadsheet.getSheetByName(
    CONFIG.SHEETS.APPLICATIONS
  );

  if (!dashboard || !applications) {
    SpreadsheetApp.getUi().alert(
      "Dashboard or Applications sheet was not found."
    );
    return;
  }

  const totalApplications = Math.max(
    applications.getLastRow() - 1,
    0
  );

  const statusCounts =
    getApplicationStatusCounts_(applications);

  const followUpsDue =
    getFollowUpsDueCount_(applications);

  // Remove old merged cells before rebuilding the layout.
  dashboard
    .getRange(
      1,
      1,
      dashboard.getMaxRows(),
      Math.min(dashboard.getMaxColumns(), 8)
    )
    .breakApart();

  // Clears only the Dashboard sheet.
  dashboard.clear();
  dashboard.setHiddenGridlines(true);
  dashboard.setFrozenRows(2);

  buildDashboardHeader_(dashboard);

  buildDashboardCard_(
    dashboard,
    3,
    1,
    "📄 Applications",
    totalApplications,
    "#E8F0FE"
  );

  buildDashboardCard_(
    dashboard,
    3,
    3,
    "🎤 Interviews",
    statusCounts.interviews,
    "#FEF7E0"
  );

  buildDashboardCard_(
    dashboard,
    3,
    5,
    "💼 Offers",
    statusCounts.offers,
    "#E6F4EA"
  );

  buildDashboardCard_(
    dashboard,
    3,
    7,
    "❌ Rejected",
    statusCounts.rejected,
    "#FCE8E6"
  );

  buildDashboardCard_(
    dashboard,
    8,
    1,
    "🔔 Follow-ups Due",
    followUpsDue,
    "#FFF3CD"
  );

  buildRecentApplicationsSection_(
    dashboard,
    applications
  );

  buildFollowUpsSection_(
    dashboard,
    applications
  );

  // Dashboard column sizing.
  dashboard.setColumnWidth(1, 145);
  dashboard.setColumnWidth(2, 135);
  dashboard.setColumnWidth(3, 165);
  dashboard.setColumnWidth(4, 175);
  dashboard.setColumnWidth(5, 135);
  dashboard.setColumnWidth(6, 135);
  dashboard.setColumnWidth(7, 135);
  dashboard.setColumnWidth(8, 135);

  spreadsheet.setActiveSheet(dashboard);
}

/**
 * Builds the main dashboard heading.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function buildDashboardHeader_(sheet) {
  sheet.getRange("A1:H1").merge();

  sheet
    .getRange("A1")
    .setValue("🚀 CareerFlow Dashboard")
    .setFontSize(22)
    .setFontWeight("bold")
    .setFontColor("#FFFFFF")
    .setBackground("#1A73E8")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setRowHeight(1, 48);

  sheet.getRange("A2:H2").merge();

  sheet
    .getRange("A2")
    .setValue(
      "Track applications, interviews, offers, and follow-ups"
    )
    .setFontColor("#5F6368")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setRowHeight(2, 28);
}

/**
 * Builds one dashboard statistics card.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} row
 * @param {number} column
 * @param {string} title
 * @param {number} value
 * @param {string} backgroundColor
 */
function buildDashboardCard_(
  sheet,
  row,
  column,
  title,
  value,
  backgroundColor
) {
  const cardRange = sheet.getRange(
    row,
    column,
    3,
    2
  );

  cardRange
    .setBackground(backgroundColor)
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      "#DADCE0",
      SpreadsheetApp.BorderStyle.SOLID
    );

  sheet
    .getRange(row, column, 1, 2)
    .merge()
    .setValue(title)
    .setFontSize(11)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet
    .getRange(row + 1, column, 2, 2)
    .merge()
    .setValue(value)
    .setFontSize(28)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setRowHeight(row, 30);
  sheet.setRowHeight(row + 1, 32);
  sheet.setRowHeight(row + 2, 32);
}

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

    if (
      status === "offer" ||
      status === "accepted"
    ) {
      counts.offers++;
    }

    if (status === "rejected") {
      counts.rejected++;
    }
  });

  return counts;
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

  const closedStatuses = [
    "accepted",
    "rejected",
    "withdrawn"
  ];

  let count = 0;

  rows.forEach(function (row) {
    const status = String(row[8] || "")
      .trim()
      .toLowerCase();

    const followUpDate = row[12];

    if (closedStatuses.includes(status)) {
      return;
    }

    if (!(followUpDate instanceof Date)) {
      return;
    }

    const normalizedDate = new Date(followUpDate);
    normalizedDate.setHours(0, 0, 0, 0);

    if (normalizedDate <= today) {
      count++;
    }
  });

  return count;
}

/**
 * Builds the Recent Applications section.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dashboard
 * @param {GoogleAppsScript.Spreadsheet.Sheet} applications
 */
function buildRecentApplicationsSection_(
  dashboard,
  applications
) {
  dashboard.getRange("A13:H13").merge();

  dashboard
    .getRange("A13")
    .setValue("📋 Recent Applications")
    .setFontSize(14)
    .setFontWeight("bold")
    .setBackground("#E8F0FE");

  const totalApplications = Math.max(
    applications.getLastRow() - 1,
    0
  );

  if (totalApplications === 0) {
    dashboard.getRange("A14:H14").merge();

    dashboard
      .getRange("A14")
      .setValue("No applications recorded yet.")
      .setFontColor("#5F6368");

    return;
  }

  const numberOfRecentRecords = Math.min(
    totalApplications,
    5
  );

  const rows = applications
    .getRange(
      applications.getLastRow() -
        numberOfRecentRecords +
        1,
      1,
      numberOfRecentRecords,
      9
    )
    .getValues()
    .reverse();

  const headers = [
    "Application ID",
    "Date Applied",
    "Company",
    "Position",
    "Platform",
    "Status"
  ];

  dashboard
    .getRange(14, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#F1F3F4");

  const values = rows.map(function (row) {
    return [
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[8]
    ];
  });

  dashboard
    .getRange(
      15,
      1,
      values.length,
      values[0].length
    )
    .setValues(values);

  dashboard
    .getRange(15, 2, values.length, 1)
    .setNumberFormat("mmm d, yyyy");

  applyDashboardStatusColors_(
    dashboard,
    values
  );
}

/**
 * Applies status colors to the Recent Applications table.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<Array<*>>} applications
 */
function applyDashboardStatusColors_(
  sheet,
  applications
) {
  applications.forEach(function (application, index) {
    const status = String(application[5] || "")
      .trim()
      .toLowerCase();

    const cell = sheet.getRange(
      15 + index,
      6
    );

    if (status.includes("interview")) {
      cell
        .setBackground("#FEF7E0")
        .setFontColor("#B06000");
    } else if (
      status === "offer" ||
      status === "accepted"
    ) {
      cell
        .setBackground("#E6F4EA")
        .setFontColor("#137333");
    } else if (status === "rejected") {
      cell
        .setBackground("#FCE8E6")
        .setFontColor("#B3261E");
    } else {
      cell
        .setBackground("#E8F0FE")
        .setFontColor("#1967D2");
    }

    cell.setFontWeight("bold");
  });
}

/**
 * Builds the Upcoming Follow-ups section.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dashboardSheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} applicationsSheet
 */
function buildFollowUpsSection_(
  dashboardSheet,
  applicationsSheet
) {
  const followUps = getUpcomingFollowUps_(
    applicationsSheet,
    5
  );

  dashboardSheet.getRange("A21:H21").merge();

  dashboardSheet
    .getRange("A21")
    .setValue("🔔 Upcoming Follow-ups")
    .setFontSize(14)
    .setFontWeight("bold")
    .setBackground("#FFF3CD");

  const headers = [
    "Company",
    "Position",
    "Follow-up Date",
    "Due",
    "Application Status"
  ];

  dashboardSheet
    .getRange(22, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#F1F3F4");

  if (followUps.length === 0) {
    dashboardSheet.getRange("A23:E23").merge();

    dashboardSheet
      .getRange("A23")
      .setValue("No follow-ups are currently scheduled.")
      .setFontColor("#5F6368");

    return;
  }

  const values = followUps.map(function (followUp) {
    return [
      followUp.company,
      followUp.position,
      followUp.date,
      followUp.dueLabel,
      followUp.status
    ];
  });

  dashboardSheet
    .getRange(
      23,
      1,
      values.length,
      values[0].length
    )
    .setValues(values);

  dashboardSheet
    .getRange(23, 3, values.length, 1)
    .setNumberFormat("mmm d, yyyy");

  applyFollowUpColors_(
    dashboardSheet,
    followUps
  );
}

/**
 * Returns scheduled follow-ups ordered from earliest to latest.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} limit
 * @returns {Array<Object>}
 */
function getUpcomingFollowUps_(sheet, limit) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const rows = sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      sheet.getLastColumn()
    )
    .getValues();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const closedStatuses = [
    "accepted",
    "rejected",
    "withdrawn"
  ];

  return rows
    .filter(function (row) {
      const status = String(row[8] || "")
        .trim()
        .toLowerCase();

      const followUpDate = row[12];

      return (
        followUpDate instanceof Date &&
        !closedStatuses.includes(status)
      );
    })
    .map(function (row) {
      const followUpDate = new Date(row[12]);
      followUpDate.setHours(0, 0, 0, 0);

      const daysDifference = Math.round(
        (followUpDate.getTime() - today.getTime()) /
          (24 * 60 * 60 * 1000)
      );

      let dueLabel = "";

      if (daysDifference < 0) {
        const overdueDays = Math.abs(
          daysDifference
        );

        dueLabel =
          overdueDays === 1
            ? "Overdue by 1 day"
            : "Overdue by " +
              overdueDays +
              " days";
      } else if (daysDifference === 0) {
        dueLabel = "Due today";
      } else if (daysDifference === 1) {
        dueLabel = "Due tomorrow";
      } else {
        dueLabel =
          "Due in " +
          daysDifference +
          " days";
      }

      return {
        company: String(row[2] || ""),
        position: String(row[3] || ""),
        date: followUpDate,
        dueLabel: dueLabel,
        status: String(row[8] || ""),
        daysDifference: daysDifference
      };
    })
    .sort(function (first, second) {
      return (
        first.date.getTime() -
        second.date.getTime()
      );
    })
    .slice(0, limit);
}

/**
 * Applies colors to follow-up due labels.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<Object>} followUps
 */
function applyFollowUpColors_(sheet, followUps) {
  followUps.forEach(function (followUp, index) {
    const dueCell = sheet.getRange(
      23 + index,
      4
    );

    if (followUp.daysDifference < 0) {
      dueCell
        .setBackground("#FCE8E6")
        .setFontColor("#B3261E")
        .setFontWeight("bold");
    } else if (
      followUp.daysDifference === 0
    ) {
      dueCell
        .setBackground("#FEF7E0")
        .setFontColor("#B06000")
        .setFontWeight("bold");
    } else {
      dueCell
        .setBackground("#E6F4EA")
        .setFontColor("#137333");
    }
  });
}