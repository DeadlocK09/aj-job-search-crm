/**
 * CareerFlow
 * Opt-in Scheduled Gmail Scan
 */

/**
 * Installs one daily Gmail scan for the current user.
 * Existing CareerFlow Gmail triggers owned by the user are replaced so a
 * duplicate schedule cannot be created.
 *
 * @param {*} notificationEmail
 * @returns {{enabled:boolean, notificationEmail:string,
 *   scheduleLabel:string, triggerId:string}}
 */
function enableScheduledGmailScan(notificationEmail) {
  const normalizedEmail = normalizeNotificationEmail_(
    notificationEmail
  );
  const spreadsheet = rememberCareerFlowSpreadsheet_();

  removeScheduledGmailTriggers_();

  const trigger = ScriptApp
    .newTrigger(CONFIG.GMAIL.SCHEDULE_HANDLER)
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.GMAIL.SCHEDULE_HOUR)
    .inTimezone(CONFIG.TIME_ZONE)
    .create();

  const enabledAt = getCurrentTimestamp();
  const triggerId = String(trigger.getUniqueId() || "");
  const userProperties = PropertiesService.getUserProperties();

  userProperties.setProperties({
    [CONFIG.PROPERTIES.GMAIL_NOTIFICATION_EMAIL]: normalizedEmail,
    [CONFIG.PROPERTIES.GMAIL_SCHEDULED_SINCE]: enabledAt.toISOString(),
    [CONFIG.PROPERTIES.GMAIL_SCHEDULE_TRIGGER_ID]: triggerId
  });

  userProperties.deleteProperty(
    CONFIG.PROPERTIES.GMAIL_LAST_SCHEDULED_RESULT
  );

  try {
    logGmailEvent_({
      level: "INFO",
      action: "GMAIL_SCHEDULE_ENABLED",
      details:
        "Daily notification-only Gmail scan enabled for " +
        getGmailScheduleLabel_() +
        ". Spreadsheet: " + spreadsheet.getName()
    });
  } catch (loggingError) {
    console.error(
      "CareerFlow could not log the Gmail schedule change.",
      loggingError
    );
  }

  return {
    enabled: true,
    notificationEmail: normalizedEmail,
    scheduleLabel: getGmailScheduleLabel_(),
    triggerId: triggerId
  };
}

/**
 * Removes all CareerFlow scheduled Gmail triggers owned by the current user.
 *
 * @returns {{enabled:boolean, removedTriggers:number}}
 */
function disableScheduledGmailScan() {
  const removedTriggers = removeScheduledGmailTriggers_();
  const userProperties = PropertiesService.getUserProperties();

  [
    CONFIG.PROPERTIES.GMAIL_NOTIFICATION_EMAIL,
    CONFIG.PROPERTIES.GMAIL_SCHEDULED_SINCE,
    CONFIG.PROPERTIES.GMAIL_SCHEDULE_TRIGGER_ID,
    CONFIG.PROPERTIES.GMAIL_LAST_SCHEDULED_RESULT
  ].forEach(function (propertyName) {
    userProperties.deleteProperty(propertyName);
  });

  try {
    logGmailEvent_({
      level: "INFO",
      action: "GMAIL_SCHEDULE_DISABLED",
      details:
        "Daily notification-only Gmail scan disabled. Removed triggers: " +
        removedTriggers
    });
  } catch (loggingError) {
    console.error(
      "CareerFlow could not log the Gmail schedule change.",
      loggingError
    );
  }

  return {
    enabled: false,
    removedTriggers: removedTriggers
  };
}

/**
 * Runs from the daily time-driven trigger or the manual check menu item.
 * It may send a summary email, but it never imports an application.
 *
 * @returns {{disabled?:boolean, skipped?:boolean, newCandidates:number,
 *   notificationSent:boolean, scannedAt:string}}
 */
function runScheduledGmailScan() {
  const lock = LockService.getUserLock();

  if (!lock.tryLock(10000)) {
    return {
      skipped: true,
      newCandidates: 0,
      notificationSent: false,
      scannedAt: ""
    };
  }

  try {
    const userProperties = PropertiesService.getUserProperties();
    const notificationEmail = String(
      userProperties.getProperty(
        CONFIG.PROPERTIES.GMAIL_NOTIFICATION_EMAIL
      ) || ""
    ).trim();

    if (!notificationEmail) {
      return {
        disabled: true,
        newCandidates: 0,
        notificationSent: false,
        scannedAt: ""
      };
    }

    const scanStartedAt = getCurrentTimestamp();
    const scheduledSince = parseScheduledScanDate_(
      userProperties.getProperty(
        CONFIG.PROPERTIES.GMAIL_SCHEDULED_SINCE
      ),
      scanStartedAt
    );

    const scanResult = scanGmailForApplicationCandidates();
    const newCandidates = getNewScheduledGmailCandidates_(
      scanResult.candidates,
      scheduledSince,
      scanStartedAt
    );

    let notificationSent = false;

    if (newCandidates.length > 0) {
      sendScheduledGmailNotification_(
        notificationEmail,
        newCandidates,
        scanStartedAt
      );
      notificationSent = true;
    }

    const result = {
      newCandidates: newCandidates.length,
      notificationSent: notificationSent,
      scannedAt: scanStartedAt.toISOString()
    };

    userProperties.setProperty(
      CONFIG.PROPERTIES.GMAIL_SCHEDULED_SINCE,
      scanStartedAt.toISOString()
    );
    userProperties.setProperty(
      CONFIG.PROPERTIES.GMAIL_LAST_SCHEDULED_RESULT,
      JSON.stringify(result)
    );

    try {
      logGmailEvent_({
        level: "INFO",
        action: "GMAIL_SCHEDULED_SCAN",
        details: [
          "New candidates: " + newCandidates.length,
          "Notification sent: " + (notificationSent ? "Yes" : "No"),
          "Automatic imports: 0"
        ].join(". ")
      });
    } catch (loggingError) {
      console.error(
        "CareerFlow could not log the scheduled Gmail scan.",
        loggingError
      );
    }

    return result;
  } catch (error) {
    try {
      logGmailEvent_({
        level: "ERROR",
        action: "GMAIL_SCHEDULED_SCAN_FAILED",
        details: error.message || String(error)
      });
    } catch (loggingError) {
      console.error(
        "CareerFlow could not log the scheduled Gmail error.",
        loggingError
      );
    }

    throw error;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Returns the current user's schedule state.
 *
 * @returns {{enabled:boolean, notificationEmail:string,
 *   scheduleLabel:string, triggerCount:number, lastResult:Object|null}}
 */
function getScheduledGmailScanStatus_() {
  const userProperties = PropertiesService.getUserProperties();
  const notificationEmail = String(
    userProperties.getProperty(
      CONFIG.PROPERTIES.GMAIL_NOTIFICATION_EMAIL
    ) || ""
  );
  const triggerCount = ScriptApp
    .getProjectTriggers()
    .filter(function (trigger) {
      return trigger.getHandlerFunction() ===
        CONFIG.GMAIL.SCHEDULE_HANDLER;
    })
    .length;
  const lastResultValue = userProperties.getProperty(
    CONFIG.PROPERTIES.GMAIL_LAST_SCHEDULED_RESULT
  );
  let lastResult = null;

  if (lastResultValue) {
    try {
      lastResult = JSON.parse(lastResultValue);
    } catch (error) {
      console.error("CareerFlow ignored an invalid last scan result.", error);
    }
  }

  return {
    enabled: triggerCount > 0 && Boolean(notificationEmail),
    notificationEmail: notificationEmail,
    scheduleLabel: getGmailScheduleLabel_(),
    triggerCount: triggerCount,
    lastResult: lastResult
  };
}

/**
 * Deletes current-user triggers for the CareerFlow Gmail handler.
 *
 * @returns {number}
 */
function removeScheduledGmailTriggers_() {
  let removed = 0;

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (
      trigger.getHandlerFunction() ===
      CONFIG.GMAIL.SCHEDULE_HANDLER
    ) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  return removed;
}

/**
 * Keeps only candidates received after the previous successful scan began.
 * The upper bound prevents a message arriving mid-scan from being skipped by
 * the next run.
 *
 * @param {Array<Object>} candidates
 * @param {Date} scheduledSince
 * @param {Date} scanStartedAt
 * @returns {Array<Object>}
 */
function getNewScheduledGmailCandidates_(
  candidates,
  scheduledSince,
  scanStartedAt
) {
  return (Array.isArray(candidates) ? candidates : [])
    .filter(function (candidate) {
      const receivedAt = new Date(candidate.receivedAt);

      if (Number.isNaN(receivedAt.getTime())) {
        return false;
      }

      return (
        receivedAt.getTime() > scheduledSince.getTime() &&
        receivedAt.getTime() <= scanStartedAt.getTime()
      );
    });
}

/**
 * Sends a plain-text notification containing no email bodies.
 *
 * @param {string} notificationEmail
 * @param {Array<Object>} candidates
 * @param {Date} scanStartedAt
 */
function sendScheduledGmailNotification_(
  notificationEmail,
  candidates,
  scanStartedAt
) {
  const spreadsheet = getCareerFlowSpreadsheet_();
  const maximumItems = CONFIG.GMAIL.NOTIFICATION_MAX_ITEMS;
  const visibleCandidates = candidates.slice(0, maximumItems);
  const lines = [
    "CareerFlow found " + candidates.length +
      " new application email" +
      (candidates.length === 1 ? "" : "s") +
      " ready for review.",
    ""
  ];

  visibleCandidates.forEach(function (candidate, index) {
    lines.push(
      (index + 1) + ". " +
      (candidate.company || "Company needs review") +
      " — " +
      (candidate.position || "Position needs review")
    );
  });

  if (candidates.length > visibleCandidates.length) {
    lines.push(
      "...and " +
      (candidates.length - visibleCandidates.length) +
      " more."
    );
  }

  lines.push(
    "",
    "Open the AJ Job Search CRM and choose:",
    "CareerFlow → Review Gmail Applications",
    spreadsheet.getUrl(),
    "",
    "Nothing has been imported automatically.",
    "Scheduled scan: " + scanStartedAt.toISOString()
  );

  MailApp.sendEmail({
    to: notificationEmail,
    subject:
      "[CareerFlow] " + candidates.length +
      " new application email" +
      (candidates.length === 1 ? "" : "s") +
      " ready to review",
    body: lines.join("\n"),
    name: "CareerFlow"
  });
}

/**
 * Validates the notification recipient.
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeNotificationEmail_(value) {
  const email = String(value || "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid notification email address.");
  }

  return email;
}

/**
 * Parses the last successful scan boundary. A missing or corrupt value uses
 * the current run time, avoiding a flood of old-email notifications.
 *
 * @param {*} value
 * @param {Date} fallback
 * @returns {Date}
 */
function parseScheduledScanDate_(value, fallback) {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? new Date(fallback.getTime())
    : parsed;
}

/**
 * Describes the Apps Script daily trigger window.
 *
 * @returns {string}
 */
function getGmailScheduleLabel_() {
  return "Daily between 8:00 and 9:00 AM (" + CONFIG.TIME_ZONE + ")";
}
