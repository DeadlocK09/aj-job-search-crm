/**
 * CareerFlow
 * Review-first Gmail Application Import
 */

/**
 * Scans Gmail for likely application submission confirmations.
 * This function does not change Gmail or the Applications sheet.
 *
 * @returns {{query:string, scannedAt:string, candidates:Array<Object>,
 *   summary:Object}}
 */
function scanGmailForApplicationCandidates() {
  const threads = GmailApp.search(
    CONFIG.GMAIL.SEARCH_QUERY,
    0,
    CONFIG.GMAIL.MAX_THREADS
  );

  const messages = [];

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      messages.push(message);
    });
  });

  messages.sort(function (first, second) {
    return second.getDate().getTime() - first.getDate().getTime();
  });

  const importedMessageIds = getImportedGmailMessageIds_();
  const existingApplications =
    getExistingApplicationFingerprints_();
  const seenFingerprints = {};
  const candidates = [];

  const summary = {
    threadsFound: threads.length,
    messagesReviewed: 0,
    candidatesFound: 0,
    alreadyImported: 0,
    alreadyTracked: 0,
    notRecognized: 0
  };

  messages
    .slice(0, CONFIG.GMAIL.MAX_MESSAGES)
    .forEach(function (message) {
      summary.messagesReviewed++;

      const messageId = String(message.getId() || "").trim();

      if (messageId && importedMessageIds[messageId]) {
        summary.alreadyImported++;
        return;
      }

      const receivedAt = message.getDate();
      const parsed = parseApplicationEmail_({
        messageId: messageId,
        receivedAt: receivedAt,
        subject: message.getSubject(),
        from: message.getFrom(),
        body: message.getPlainBody()
      });

      if (
        !parsed ||
        parsed.confidence < CONFIG.GMAIL.MIN_CONFIDENCE
      ) {
        summary.notRecognized++;
        return;
      }

      const fingerprint = makeApplicationFingerprint_(
        parsed.company,
        parsed.position
      );

      if (
        fingerprint &&
        (
          existingApplications[fingerprint] ||
          seenFingerprints[fingerprint]
        )
      ) {
        summary.alreadyTracked++;
        return;
      }

      if (fingerprint) {
        seenFingerprints[fingerprint] = true;
      }

      parsed.receivedAt = serializeGmailDate_(receivedAt);
      candidates.push(parsed);
    });

  summary.candidatesFound = candidates.length;

  return {
    query: CONFIG.GMAIL.SEARCH_QUERY,
    scannedAt: serializeGmailDate_(new Date()),
    candidates: candidates,
    summary: summary
  };
}

/**
 * Imports only the candidates explicitly selected and confirmed in the UI.
 * Duplicate checks run again at import time.
 *
 * @param {Array<Object>} candidates
 * @returns {{imported:Array<Object>, duplicates:Array<Object>,
 *   errors:Array<Object>, loggingWarnings:number}}
 */
function importGmailApplicationCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Select at least one Gmail application to import.");
  }

  if (candidates.length > 25) {
    throw new Error("Import no more than 25 applications at one time.");
  }

  const sheet = getApplicationsSheet();
  const importedMessageIds = getImportedGmailMessageIds_();
  const existingApplications =
    getExistingApplicationFingerprints_();

  const result = {
    imported: [],
    duplicates: [],
    errors: [],
    loggingWarnings: 0
  };

  candidates.forEach(function (candidate) {
    const input = candidate || {};
    const messageId = String(input.messageId || "").trim();
    const company = String(input.company || "").trim();
    const position = String(input.position || "").trim();

    if (!messageId || !company || !position) {
      result.errors.push({
        messageId: messageId,
        reason: "Message ID, company, and position are required."
      });
      return;
    }

    const fingerprint = makeApplicationFingerprint_(company, position);

    if (importedMessageIds[messageId]) {
      result.duplicates.push({
        messageId: messageId,
        reason: "This Gmail message was already imported."
      });
      return;
    }

    if (fingerprint && existingApplications[fingerprint]) {
      result.duplicates.push({
        messageId: messageId,
        applicationId: existingApplications[fingerprint],
        reason: "The same company and position are already tracked."
      });
      return;
    }

    try {
      const platform = requireCanonicalChoice_(
        input.platform,
        CONFIG.PLATFORMS,
        "Platform"
      );

      const workType = requireCanonicalChoice_(
        input.workType,
        CONFIG.WORK_TYPES,
        "Work type"
      );

      const applicationId = getNextApplicationId_(sheet);
      const timestamp = getCurrentTimestamp();
      const receivedAt = parseGmailImportDate_(input.receivedAt);
      const safeCompany = sanitizeImportedText_(company);
      const safePosition = sanitizeImportedText_(position);
      const subject = sanitizeImportedText_(
        String(input.subject || "").trim().slice(0, 300)
      );
      const sender = sanitizeImportedText_(
        String(input.sender || "").trim().slice(0, 300)
      );

      const notes = [
        "Imported from Gmail review.",
        "Email subject: " + subject,
        "Email sender: " + sender,
        "Gmail message ID: " + messageId
      ].join("\n");

      sheet.appendRow([
        applicationId,
        receivedAt,
        safeCompany,
        safePosition,
        platform,
        "",
        workType,
        "",
        CONFIG.STATUS.APPLIED,
        "",
        "",
        "",
        "",
        "",
        "No",
        notes,
        timestamp
      ]);

      importedMessageIds[messageId] = true;

      if (fingerprint) {
        existingApplications[fingerprint] = applicationId;
      }

      result.imported.push({
        messageId: messageId,
        applicationId: applicationId,
        company: safeCompany,
        position: safePosition
      });

      try {
        logGmailEvent_({
          level: "INFO",
          action: "GMAIL_IMPORTED",
          messageId: messageId,
          applicationId: applicationId,
          company: safeCompany,
          position: safePosition,
          details: "Application confirmation imported after manual review."
        });
      } catch (loggingError) {
        result.loggingWarnings++;
        console.error("CareerFlow could not write the Gmail import log.", loggingError);
      }
    } catch (error) {
      result.errors.push({
        messageId: messageId,
        reason: error.message || String(error)
      });

      try {
        logGmailEvent_({
          level: "ERROR",
          action: "GMAIL_IMPORT_FAILED",
          messageId: messageId,
          company: company,
          position: position,
          details: error.message || String(error)
        });
      } catch (loggingError) {
        result.loggingWarnings++;
        console.error("CareerFlow could not write the Gmail error log.", loggingError);
      }
    }
  });

  if (result.imported.length > 0) {
    updateDashboard();
  }

  return result;
}

/**
 * Returns normalized company/position keys mapped to application IDs.
 *
 * @returns {Object<string, string>}
 */
function getExistingApplicationFingerprints_() {
  const sheet = getApplicationsSheet();
  const lastRow = sheet.getLastRow();
  const fingerprints = {};

  if (lastRow < 2) {
    return fingerprints;
  }

  const rows = sheet
    .getRange(2, 1, lastRow - 1, 4)
    .getValues();

  rows.forEach(function (row) {
    const fingerprint = makeApplicationFingerprint_(row[2], row[3]);

    if (fingerprint && !fingerprints[fingerprint]) {
      fingerprints[fingerprint] = String(row[0] || "");
    }
  });

  return fingerprints;
}

/**
 * Creates a duplicate-detection key from company and position.
 *
 * @param {*} company
 * @param {*} position
 * @returns {string}
 */
function makeApplicationFingerprint_(company, position) {
  const normalize = function (value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizedCompany = normalize(company);
  const normalizedPosition = normalize(position);

  if (!normalizedCompany || !normalizedPosition) {
    return "";
  }

  return normalizedCompany + "|" + normalizedPosition;
}

/**
 * Prevents imported email text from being interpreted as a spreadsheet
 * formula. appendRow treats leading formula characters specially.
 *
 * @param {*} value
 * @returns {string}
 */
function sanitizeImportedText_(value) {
  const text = String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();

  return /^[=+\-@]/.test(text)
    ? "'" + text
    : text;
}

/**
 * Converts a Gmail date into a client-safe ISO string.
 *
 * @param {*} value
 * @returns {string}
 */
function serializeGmailDate_(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toISOString();
}

/**
 * Converts a reviewed ISO date back to a Date for the Applications sheet.
 * Invalid client values fall back to the current timestamp.
 *
 * @param {*} value
 * @returns {Date}
 */
function parseGmailImportDate_(value) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return getCurrentTimestamp();
  }

  return parsedDate;
}
