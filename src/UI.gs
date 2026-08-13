/**
 * UI Functions
 */

function showDashboard() {

  SpreadsheetApp.getActiveSpreadsheet()
    .setActiveSheet(
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName("Dashboard")
    );

}

function addApplication() {

  const html = HtmlService
    .createHtmlOutputFromFile("AddApplication")
    .setTitle("Add Application");

  SpreadsheetApp
    .getUi()
    .showSidebar(html);

}

function scanGmail() {
  showGmailImportSidebar();
}

/**
 * Opens the review-first Gmail import sidebar.
 * Scanning does not modify Gmail or the Applications sheet.
 */
function showGmailImportSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile("GmailImportSidebar")
    .setTitle("Review Gmail Applications");

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Opens the review-first Gmail status update sidebar.
 * Scanning never changes Gmail or an application status.
 */
function showGmailStatusUpdateSidebar() {
  const html = HtmlService
    .createHtmlOutputFromFile("GmailStatusUpdateSidebar")
    .setTitle("Review Gmail Status Updates");

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Confirms and installs the optional daily Gmail scan.
 */
function enableScheduledGmailScanFromMenu() {
  const ui = SpreadsheetApp.getUi();
  let notificationEmail = String(
    Session.getEffectiveUser().getEmail() || ""
  ).trim();

  if (!notificationEmail) {
    const emailResponse = ui.prompt(
      "Enable daily Gmail scan",
      "Enter the email address that should receive CareerFlow alerts.",
      ui.ButtonSet.OK_CANCEL
    );

    if (emailResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    notificationEmail = emailResponse.getResponseText();
  }

  const confirmation = ui.alert(
    "Enable daily Gmail scan?",
    [
      "CareerFlow will check once per day between 8:00 and 9:00 AM",
      CONFIG.TIME_ZONE + " and email " + notificationEmail + ".",
      "",
      "Only new application confirmations will be reported.",
      "Nothing will be imported automatically."
    ].join("\n"),
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    return;
  }

  const result = enableScheduledGmailScan(notificationEmail);

  ui.alert(
    "Daily Gmail scan enabled",
    [
      "Notifications: " + result.notificationEmail,
      "Schedule: " + result.scheduleLabel,
      "",
      "The first scheduled check will look only for messages received",
      "after this schedule was enabled. Imports remain manual."
    ].join("\n"),
    ui.ButtonSet.OK
  );
}

/**
 * Runs the scheduled code path on demand and displays its safe summary.
 */
function runScheduledGmailScanNowFromMenu() {
  const ui = SpreadsheetApp.getUi();

  try {
    const result = runScheduledGmailScan();

    if (result.disabled) {
      ui.alert(
        "Daily Gmail scan is disabled. Enable it first from CareerFlow."
      );
      return;
    }

    if (result.skipped) {
      ui.alert(
        "A Gmail scan is already running. Please try again shortly."
      );
      return;
    }

    ui.alert(
      [
        "Gmail schedule check completed.",
        "",
        "New candidates: " + result.newCandidates,
        "Notification sent: " + (result.notificationSent ? "Yes" : "No"),
        "Imported automatically: 0"
      ].join("\n")
    );
  } catch (error) {
    ui.alert(
      "Gmail schedule check failed: " +
      (error.message || String(error))
    );
  }
}

/**
 * Shows whether the current user has an active Gmail scan trigger.
 */
function showGmailScanScheduleStatusFromMenu() {
  const status = getScheduledGmailScanStatus_();
  const lastResult = status.lastResult || {};
  const lines = [
    "Daily Gmail scan: " + (status.enabled ? "Enabled" : "Disabled"),
    "Schedule: " + status.scheduleLabel,
    "Notification email: " + (status.notificationEmail || "Not set")
  ];

  if (lastResult.scannedAt) {
    lines.push(
      "",
      "Last check: " + lastResult.scannedAt,
      "New candidates: " + (lastResult.newCandidates || 0),
      "Notification sent: " +
        (lastResult.notificationSent ? "Yes" : "No")
    );
  }

  SpreadsheetApp.getUi().alert(lines.join("\n"));
}

/**
 * Confirms and removes the current user's daily Gmail trigger.
 */
function disableScheduledGmailScanFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.alert(
    "Disable daily Gmail scan?",
    "Scheduled checks and notification emails will stop. " +
      "Manual Gmail Review will remain available.",
    ui.ButtonSet.YES_NO
  );

  if (confirmation !== ui.Button.YES) {
    return;
  }

  const result = disableScheduledGmailScan();

  ui.alert(
    "Daily Gmail scan disabled. Removed triggers: " +
      result.removedTriggers
  );
}


function showSettings() {

  SpreadsheetApp
    .getUi()
    .alert("Coming Soon!\n\nSettings");

}

function showEditApplicationSidebar(applicationId) {
  const template = HtmlService.createTemplateFromFile(
    "EditApplicationSidebar"
  );

  template.applicationId = String(applicationId);

  const html = template
    .evaluate()
    .setTitle("Edit Application");

  SpreadsheetApp.getUi().showSidebar(html);
}

function repairApplicationDataConsistencyFromMenu() {
  const result = repairApplicationDataConsistency();

  const message = [
    "CareerFlow stability repair completed.",
    "",
    "Normalized cells: " + result.normalizedCells,
    "Unrecognized cells: " + result.unrecognizedCells,
    "Current ID sequence: " + result.applicationSequence
  ].join("\n");

  SpreadsheetApp.getUi().alert(message);
}
