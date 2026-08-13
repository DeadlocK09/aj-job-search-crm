/**
 * CareerFlow
 * Review-first Gmail Status Updates
 */

/**
 * Scans Gmail for assessment, interview, offer, and rejection messages that
 * can be matched conservatively to an existing application. Scanning never
 * changes Gmail or the Applications sheet.
 *
 * @returns {{query:string, scannedAt:string, candidates:Array<Object>,
 *   summary:Object}}
 */
function scanGmailForStatusUpdateCandidates() {
  const threads = GmailApp.search(
    CONFIG.GMAIL.STATUS_SEARCH_QUERY,
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

  const processedMessageIds =
    getProcessedGmailStatusMessageIds_();
  const applications = getApplicationsForGmailStatusReview_();
  const candidates = [];
  const summary = {
    threadsFound: threads.length,
    messagesReviewed: 0,
    candidatesFound: 0,
    alreadyProcessed: 0,
    notStatusUpdate: 0,
    unmatched: 0,
    ambiguous: 0,
    unchangedOrUnsafe: 0
  };

  messages
    .slice(0, CONFIG.GMAIL.MAX_MESSAGES)
    .forEach(function (message) {
      summary.messagesReviewed++;

      const messageId = String(message.getId() || "").trim();

      if (messageId && processedMessageIds[messageId]) {
        summary.alreadyProcessed++;
        return;
      }

      const email = {
        messageId: messageId,
        receivedAt: message.getDate(),
        subject: message.getSubject(),
        from: message.getFrom(),
        body: message.getPlainBody()
      };
      const parsed = parseGmailStatusUpdateEmail_(email);

      if (!parsed) {
        summary.notStatusUpdate++;
        return;
      }

      const matched = matchGmailStatusUpdateToApplication_(
        parsed,
        email,
        applications
      );

      if (matched.ambiguous) {
        summary.ambiguous++;
        return;
      }

      if (!matched.application) {
        summary.unmatched++;
        return;
      }

      if (!isSafeGmailStatusTransition_(
        matched.application.status,
        parsed.proposedStatus
      )) {
        summary.unchangedOrUnsafe++;
        return;
      }

      candidates.push({
        messageId: messageId,
        receivedAt: serializeGmailDate_(email.receivedAt),
        subject: parsed.subject,
        sender: parsed.sender,
        applicationId: matched.application.applicationId,
        company: matched.application.company,
        position: matched.application.position,
        currentStatus: matched.application.status,
        proposedStatus: parsed.proposedStatus,
        parserConfidence: parsed.confidence,
        matchConfidence: matched.score,
        evidence: parsed.evidence,
        needsReview: matched.score < 90 || parsed.confidence < 90
      });
    });

  summary.candidatesFound = candidates.length;

  return {
    query: CONFIG.GMAIL.STATUS_SEARCH_QUERY,
    scannedAt: serializeGmailDate_(new Date()),
    candidates: candidates,
    summary: summary
  };
}

/**
 * Applies only status changes explicitly selected and confirmed in the UI.
 * Each application is re-read so a stale review cannot overwrite a newer
 * manual change.
 *
 * @param {Array<Object>} candidates
 * @returns {{updated:Array<Object>, duplicates:Array<Object>,
 *   unchanged:Array<Object>, errors:Array<Object>, loggingWarnings:number}}
 */
function applyGmailStatusUpdateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Select at least one Gmail status update.");
  }

  if (candidates.length > 25) {
    throw new Error("Update no more than 25 applications at one time.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  const result = {
    updated: [],
    duplicates: [],
    unchanged: [],
    errors: [],
    loggingWarnings: 0
  };

  try {
    const sheet = getApplicationsSheet();
    const records = getApplicationsForGmailStatusReview_(sheet);
    const recordsById = {};
    const processedMessageIds =
      getProcessedGmailStatusMessageIds_();

    records.forEach(function (record) {
      recordsById[record.applicationId] = record;
    });

    candidates.forEach(function (candidate) {
      const input = candidate || {};
      const messageId = String(input.messageId || "").trim();
      const applicationId = String(input.applicationId || "").trim();
      const expectedCurrentStatus = String(
        input.currentStatus || ""
      ).trim();

      if (!messageId || !applicationId || !expectedCurrentStatus) {
        result.errors.push({
          messageId: messageId,
          applicationId: applicationId,
          reason: "Message ID, application ID, and current status are required."
        });
        return;
      }

      if (processedMessageIds[messageId]) {
        result.duplicates.push({
          messageId: messageId,
          applicationId: applicationId,
          reason: "This Gmail message was already used for a status update."
        });
        return;
      }

      const record = recordsById[applicationId];

      if (!record) {
        result.errors.push({
          messageId: messageId,
          applicationId: applicationId,
          reason: "Application not found: " + applicationId
        });
        return;
      }

      try {
        const proposedStatus = requireCanonicalChoice_(
          input.proposedStatus,
          CONFIG.GMAIL.STATUS_UPDATE_VALUES,
          "Proposed status"
        );
        const currentStatus = requireCanonicalChoice_(
          record.status,
          CONFIG.STATUS_VALUES,
          "Current status"
        );
        const expectedStatus = requireCanonicalChoice_(
          expectedCurrentStatus,
          CONFIG.STATUS_VALUES,
          "Expected current status"
        );

        if (currentStatus !== expectedStatus) {
          result.errors.push({
            messageId: messageId,
            applicationId: applicationId,
            reason:
              "Status changed after the Gmail scan. Review this application again."
          });
          return;
        }

        if (currentStatus === proposedStatus) {
          result.unchanged.push({
            messageId: messageId,
            applicationId: applicationId,
            status: currentStatus,
            reason: "The application already has this status."
          });
          return;
        }

        if (!isSafeGmailStatusTransition_(currentStatus, proposedStatus)) {
          result.errors.push({
            messageId: messageId,
            applicationId: applicationId,
            reason:
              "CareerFlow blocked a backward or closed-status change."
          });
          return;
        }

        sheet.getRange(record.rowNumber, 9).setValue(proposedStatus);
        sheet.getRange(record.rowNumber, 17).setValue(
          getCurrentTimestamp()
        );

        record.status = proposedStatus;
        processedMessageIds[messageId] = true;

        result.updated.push({
          messageId: messageId,
          applicationId: applicationId,
          company: record.company,
          position: record.position,
          oldStatus: currentStatus,
          newStatus: proposedStatus
        });

        try {
          logGmailEvent_({
            level: "INFO",
            action: "GMAIL_STATUS_UPDATED",
            messageId: messageId,
            applicationId: applicationId,
            company: record.company,
            position: record.position,
            details:
              "Status changed from " + currentStatus + " to " +
              proposedStatus + " after manual Gmail review."
          });
        } catch (loggingError) {
          result.loggingWarnings++;
          console.error(
            "CareerFlow could not write the Gmail status log.",
            loggingError
          );
        }
      } catch (error) {
        result.errors.push({
          messageId: messageId,
          applicationId: applicationId,
          reason: error.message || String(error)
        });
      }
    });
  } finally {
    lock.releaseLock();
  }

  if (result.updated.length > 0) {
    updateDashboard();
  }

  return result;
}

/**
 * Parses a strong status signal without retaining the email body.
 *
 * @param {Object} email
 * @returns {Object|null}
 */
function parseGmailStatusUpdateEmail_(email) {
  const input = email || {};
  const subject = normalizeEmailSubject_(input.subject);
  const body = normalizeEmailBody_(input.body).slice(0, 12000);
  const sender = String(input.from || "").trim();
  const detected = detectGmailStatusSignal_(subject, body);

  if (!detected) {
    return null;
  }

  const company = cleanParsedValue_(
    extractStatusUpdateCompany_(subject, body) ||
      extractCompanyFromSender_(sender),
    "company"
  );
  const position = cleanParsedValue_(
    extractStatusUpdatePosition_(subject, body),
    "position"
  );
  let confidence = detected.confidence;

  if (company) {
    confidence += 5;
  }

  if (position) {
    confidence += 5;
  }

  return {
    messageId: String(input.messageId || "").trim(),
    receivedAt: input.receivedAt || "",
    subject: subject,
    sender: sender,
    companyHint: company,
    positionHint: position,
    proposedStatus: detected.status,
    evidence: detected.evidence,
    confidence: Math.min(confidence, 100)
  };
}

/**
 * Maps strong phrases to the CRM's canonical status values.
 *
 * @param {string} subject
 * @param {string} body
 * @returns {{status:string, evidence:string, confidence:number}|null}
 */
function detectGmailStatusSignal_(subject, body) {
  const subjectText = String(subject || "").toLowerCase();
  const bodyText = String(body || "").toLowerCase();
  const text = subjectText + "\n" + bodyText.slice(0, 6000);
  const jobAlertPhrases = [
    "job alert",
    "jobs for you",
    "recommended jobs",
    "job recommendations",
    "roles you may like"
  ];

  if (jobAlertPhrases.some(function (phrase) {
    return subjectText.indexOf(phrase) !== -1;
  })) {
    return null;
  }

  const signalGroups = [
    {
      status: CONFIG.STATUS.REJECTED,
      confidence: 90,
      phrases: [
        "not moving forward with your application",
        "decided not to move forward",
        "will not be progressing",
        "will not progress your application",
        "not selected for the position",
        "not selected for this position",
        "we have selected other candidates",
        "we've selected other candidates",
        "regret to inform you",
        "your application was unsuccessful",
        "your application has been unsuccessful"
      ]
    },
    {
      status: CONFIG.STATUS.OFFER,
      confidence: 95,
      phrases: [
        "pleased to offer you",
        "delighted to offer you",
        "offer of employment",
        "employment offer",
        "formal job offer",
        "extend an offer",
        "job offer for"
      ]
    },
    {
      status: CONFIG.STATUS.FINAL_INTERVIEW,
      confidence: 95,
      phrases: [
        "final interview",
        "final-round interview",
        "final round interview"
      ]
    },
    {
      status: CONFIG.STATUS.TECHNICAL_INTERVIEW,
      confidence: 95,
      phrases: [
        "technical interview",
        "technical round interview"
      ]
    },
    {
      status: CONFIG.STATUS.HR_INTERVIEW,
      confidence: 95,
      phrases: [
        "hr interview",
        "human resources interview",
        "recruiter interview"
      ]
    },
    {
      status: CONFIG.STATUS.ASSESSMENT,
      confidence: 90,
      phrases: [
        "assessment invitation",
        "invite you to complete an assessment",
        "invited to complete an assessment",
        "skills assessment",
        "skills test",
        "technical test",
        "coding challenge",
        "pre-employment test",
        "online assessment"
      ]
    },
    {
      status: CONFIG.STATUS.INTERVIEW,
      confidence: 90,
      phrases: [
        "interview invitation",
        "invite you to interview",
        "invited you to interview",
        "schedule an interview",
        "interview request",
        "interview availability",
        "interview with our"
      ]
    }
  ];

  for (let groupIndex = 0; groupIndex < signalGroups.length; groupIndex++) {
    const group = signalGroups[groupIndex];

    for (let phraseIndex = 0; phraseIndex < group.phrases.length; phraseIndex++) {
      const phrase = group.phrases[phraseIndex];

      if (text.indexOf(phrase) !== -1) {
        return {
          status: group.status,
          evidence: phrase,
          confidence: group.confidence
        };
      }
    }
  }

  return null;
}

/**
 * Extracts a position hint from common update-email formats.
 */
function extractStatusUpdatePosition_(subject, body) {
  const text = String(subject || "") + "\n" +
    String(body || "").slice(0, 5000);
  const patterns = [
    /(?:position|job title|role)\s*[:\-]\s*([^\n|.;]+)/i,
    /(?:regarding|about) your application for (?:the )?(.+?)(?: position| role)?(?: at | with |[.!?\n|]|$)/i,
    /(?:interview|assessment|job offer) for (?:the )?(.+?)(?: position| role)?(?: at | with |[.!?\n|]|$)/i,
    /application for (?:the )?(.+?)(?: position| role)?(?: at | with |[.!?\n|]|$)/i
  ];

  for (let index = 0; index < patterns.length; index++) {
    const match = text.match(patterns[index]);

    if (match) {
      return match[1] || "";
    }
  }

  return "";
}

/**
 * Extracts a company hint from labels and position-at-company phrases.
 */
function extractStatusUpdateCompany_(subject, body) {
  const text = String(subject || "") + "\n" +
    String(body || "").slice(0, 5000);
  const patterns = [
    /(?:company|employer|organization)\s*[:\-]\s*([^\n|.;]+)/i,
    /(?:position|role|application) (?:at|with) (.+?)(?:[.!?\n|]|$)/i,
    /(?:interview|assessment|job offer) for (?:the )?.+?(?: position| role)? (?:at|with) (.+?)(?:[.!?\n|]|$)/i
  ];

  for (let index = 0; index < patterns.length; index++) {
    const match = text.match(patterns[index]);

    if (match) {
      return match[1] || "";
    }
  }

  return "";
}

/**
 * Reads the minimum application fields required for safe matching and update.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet=} sheet
 * @returns {Array<Object>}
 */
function getApplicationsForGmailStatusReview_(sheet) {
  const applicationsSheet = sheet || getApplicationsSheet();
  const lastRow = applicationsSheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return applicationsSheet
    .getRange(2, 1, lastRow - 1, 9)
    .getValues()
    .map(function (row, index) {
      return {
        rowNumber: index + 2,
        applicationId: String(row[0] || "").trim(),
        company: String(row[2] || "").trim(),
        position: String(row[3] || "").trim(),
        status: canonicalizeExistingChoice_(
          row[8],
          CONFIG.STATUS_VALUES
        )
      };
    })
    .filter(function (application) {
      return application.applicationId &&
        application.company &&
        application.position &&
        application.status;
    });
}

/**
 * Chooses one existing application only when the evidence is strong and the
 * best score is unambiguous.
 */
function matchGmailStatusUpdateToApplication_(parsed, email, applications) {
  const input = parsed || {};
  const emailInput = email || {};
  const records = applications || [];
  const matchingText = normalizeGmailMatchingText_([
    emailInput.subject,
    emailInput.from,
    String(emailInput.body || "").slice(0, 8000)
  ].join(" "));
  const companyHint = normalizeGmailMatchingText_(input.companyHint);
  const positionHint = normalizeGmailMatchingText_(input.positionHint);
  const companyCounts = {};
  const positionCounts = {};

  records.forEach(function (record) {
    const company = normalizeGmailMatchingText_(record.company);
    const position = normalizeGmailMatchingText_(record.position);
    companyCounts[company] = (companyCounts[company] || 0) + 1;
    positionCounts[position] = (positionCounts[position] || 0) + 1;
  });

  const scored = records.map(function (record) {
    const company = normalizeGmailMatchingText_(record.company);
    const position = normalizeGmailMatchingText_(record.position);
    const companySignal = Boolean(company) && (
      companyHint === company || containsGmailMatchingPhrase_(matchingText, company)
    );
    const positionSignal = Boolean(position) && (
      positionHint === position || containsGmailMatchingPhrase_(matchingText, position)
    );
    let score = 0;

    if (companySignal && positionSignal) {
      score = 100;
    } else if (companySignal && companyCounts[company] === 1) {
      score = 75;
    } else if (positionSignal && positionCounts[position] === 1) {
      score = 75;
    } else if (companySignal || positionSignal) {
      score = 50;
    }

    return {
      application: record,
      score: score
    };
  }).sort(function (first, second) {
    return second.score - first.score;
  });

  const best = scored[0];

  if (!best || best.score < CONFIG.GMAIL.STATUS_MIN_MATCH_SCORE) {
    return {
      application: null,
      score: best ? best.score : 0,
      ambiguous: false
    };
  }

  if (scored[1] && scored[1].score === best.score) {
    return {
      application: null,
      score: best.score,
      ambiguous: true
    };
  }

  return {
    application: best.application,
    score: best.score,
    ambiguous: false
  };
}

/**
 * Prevents Gmail review from reopening closed applications or moving an
 * active application backward through the pipeline.
 */
function isSafeGmailStatusTransition_(currentStatus, proposedStatus) {
  const current = canonicalizeExistingChoice_(
    currentStatus,
    CONFIG.STATUS_VALUES
  );
  const proposed = canonicalizeExistingChoice_(
    proposedStatus,
    CONFIG.GMAIL.STATUS_UPDATE_VALUES
  );

  if (!current || !proposed || current === proposed) {
    return false;
  }

  if (CONFIG.CLOSED_STATUSES.indexOf(current) !== -1) {
    return false;
  }

  if (proposed === CONFIG.STATUS.REJECTED) {
    return true;
  }

  return getGmailStatusRank_(proposed) > getGmailStatusRank_(current);
}

function getGmailStatusRank_(status) {
  const ranks = {
    Applied: 0,
    Assessment: 1,
    Interview: 2,
    "HR Interview": 3,
    "Technical Interview": 4,
    "Final Interview": 5,
    Offer: 6
  };

  return Object.prototype.hasOwnProperty.call(ranks, status)
    ? ranks[status]
    : -1;
}

function normalizeGmailMatchingText_(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsGmailMatchingPhrase_(text, phrase) {
  if (!text || !phrase) {
    return false;
  }

  return (" " + text + " ").indexOf(" " + phrase + " ") !== -1;
}
