/**
 * CareerFlow
 * Follow-up Notifications Module
 */

/**
 * Returns the overdue and due-today follow-ups used by notifications.
 * Future follow-ups and applications with a closed status are excluded by
 * getUpcomingFollowUps_.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} applicationsSheet
 * @param {number} displayLimit
 * @returns {{total:number, overdue:number, dueToday:number,
 *   items:Array<Object>}}
 */
function getFollowUpNotificationSummary_(
  applicationsSheet,
  displayLimit
) {
  const applicationCount = Math.max(
    applicationsSheet.getLastRow() - 1,
    0
  );

  const maximumItems =
    Number.isInteger(displayLimit) && displayLimit > 0
      ? displayLimit
      : 5;

  const dueFollowUps = getUpcomingFollowUps_(
    applicationsSheet,
    applicationCount
  ).filter(function (followUp) {
    return followUp.daysDifference <= 0;
  });

  const overdue = dueFollowUps.filter(
    function (followUp) {
      return followUp.daysDifference < 0;
    }
  ).length;

  return {
    total: dueFollowUps.length,
    overdue: overdue,
    dueToday: dueFollowUps.length - overdue,
    items: dueFollowUps.slice(0, maximumItems)
  };
}

/**
 * Returns a menu label that includes the live number of due follow-ups.
 * The fallback keeps the menu usable if the Applications sheet is missing.
 *
 * @returns {string}
 */
function getFollowUpMenuLabel_() {
  try {
    const summary = getFollowUpNotificationSummary_(
      getApplicationsSheet(),
      5
    );

    return summary.total > 0
      ? "🔔 Follow-ups Due (" + summary.total + ")"
      : "🔔 Check Follow-ups";
  } catch (error) {
    console.error(
      "CareerFlow could not build the follow-up menu label.",
      error
    );

    return "🔔 Check Follow-ups";
  }
}

/**
 * Shows a short reminder when the spreadsheet opens.
 * No toast is shown when there are no overdue or due-today follow-ups.
 */
function showFollowUpReminderToast_() {
  try {
    const spreadsheet =
      SpreadsheetApp.getActiveSpreadsheet();

    const summary = getFollowUpNotificationSummary_(
      getApplicationsSheet(),
      5
    );

    if (summary.total === 0) {
      return;
    }

    const parts = [];

    if (summary.overdue > 0) {
      parts.push(summary.overdue + " overdue");
    }

    if (summary.dueToday > 0) {
      parts.push(summary.dueToday + " due today");
    }

    spreadsheet.toast(
      parts.join(" • "),
      "🔔 CareerFlow Follow-up Reminder",
      8
    );
  } catch (error) {
    console.error(
      "CareerFlow could not show the follow-up reminder.",
      error
    );
  }
}

/**
 * Opens a detailed follow-up reminder from the CareerFlow menu.
 */
function showFollowUpNotifications() {
  const ui = SpreadsheetApp.getUi();
  const summary = getFollowUpNotificationSummary_(
    getApplicationsSheet(),
    8
  );

  ui.alert(
    "CareerFlow Follow-up Reminder",
    buildFollowUpNotificationMessage_(summary),
    ui.ButtonSet.OK
  );
}

/**
 * Builds the detailed reminder shown from the CareerFlow menu.
 *
 * @param {{total:number, overdue:number, dueToday:number,
 *   items:Array<Object>}} summary
 * @returns {string}
 */
function buildFollowUpNotificationMessage_(summary) {
  if (summary.total === 0) {
    return [
      "You are all caught up.",
      "",
      "There are no overdue or due-today follow-ups."
    ].join("\n");
  }

  const lines = [
    summary.total +
      (summary.total === 1
        ? " follow-up needs attention."
        : " follow-ups need attention."),
    "",
    summary.overdue + " overdue • " +
      summary.dueToday + " due today",
    ""
  ];

  summary.items.forEach(function (followUp) {
    lines.push(
      "• " +
        followUp.company +
        " — " +
        followUp.position
    );

    lines.push(
      "  " +
        followUp.dueLabel +
        " | " +
        followUp.status +
        " | " +
        followUp.applicationId
    );
  });

  if (summary.total > summary.items.length) {
    lines.push("");
    lines.push(
      "+" +
        (summary.total - summary.items.length) +
        " more on the Dashboard"
    );
  }

  lines.push("");
  lines.push(
    "Open the Dashboard or Search Applications to take action."
  );

  return lines.join("\n");
}
