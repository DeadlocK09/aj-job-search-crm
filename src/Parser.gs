/**
 * CareerFlow
 * Gmail Application Email Parser
 */

/**
 * Converts an email into an editable application candidate.
 * The parser is intentionally conservative and only handles application
 * submission confirmations in this release.
 *
 * @param {{subject:string, body:string, from:string,
 *   messageId:string, receivedAt:*}} email
 * @returns {Object|null}
 */
function parseApplicationEmail_(email) {
  const input = email || {};
  const subject = normalizeEmailSubject_(input.subject);
  const body = normalizeEmailBody_(input.body).slice(0, 12000);

  if (!isApplicationConfirmationEmail_(subject, body)) {
    return null;
  }

  const combined = extractPositionAndCompany_(subject, body);

  const position = cleanParsedValue_(
    combined.position || extractPosition_(subject, body),
    "position"
  );

  const company = cleanParsedValue_(
    combined.company ||
      extractCompany_(subject, body) ||
      extractCompanyFromSender_(input.from),
    "company"
  );

  if (!position && !company) {
    return null;
  }

  const platform = detectApplicationPlatform_(
    input.from,
    subject,
    body
  );

  let confidence = 50;

  if (position) {
    confidence += 25;
  }

  if (company) {
    confidence += 20;
  }

  if (platform !== "Company Website") {
    confidence += 5;
  }

  return {
    messageId: String(input.messageId || "").trim(),
    receivedAt: input.receivedAt || "",
    subject: subject,
    sender: String(input.from || "").trim(),
    company: company,
    position: position,
    platform: platform,
    status: CONFIG.STATUS.APPLIED,
    confidence: Math.min(confidence, 100),
    needsReview: !company || !position
  };
}

/**
 * Rejects job alerts and accepts strong application-confirmation phrases.
 *
 * @param {string} subject
 * @param {string} body
 * @returns {boolean}
 */
function isApplicationConfirmationEmail_(subject, body) {
  const subjectText = String(subject || "").toLowerCase();
  const bodyText = String(body || "").toLowerCase();

  const jobAlertPhrases = [
    "job alert",
    "jobs for you",
    "recommended jobs",
    "job recommendations",
    "new jobs matching",
    "roles you may like",
    "weekly jobs",
    "daily jobs"
  ];

  if (jobAlertPhrases.some(function (phrase) {
    return subjectText.indexOf(phrase) !== -1;
  })) {
    return false;
  }

  const combinedText = subjectText + "\n" + bodyText.slice(0, 4000);
  const confirmationPhrases = [
    "thank you for applying",
    "thanks for applying",
    "application received",
    "application submitted",
    "application confirmation",
    "received your application",
    "your application has been received",
    "your application was submitted",
    "successfully applied",
    "application was sent"
  ];

  return confirmationPhrases.some(function (phrase) {
    return combinedText.indexOf(phrase) !== -1;
  });
}

/**
 * Extracts paired position/company phrases from common confirmation formats.
 *
 * @param {string} subject
 * @param {string} body
 * @returns {{position:string, company:string}}
 */
function extractPositionAndCompany_(subject, body) {
  const sources = [subject, body.slice(0, 5000)];
  const patterns = [
    /(?:thank you|thanks) for applying for (?:the )?(.+?)(?: position| role)? (?:at|with) (.+?)(?:[.!?\n|]|$)/i,
    /(?:we(?:'ve| have)? )?received your application for (?:the )?(.+?)(?: position| role)? (?:at|with) (.+?)(?:[.!?\n|]|$)/i,
    /your application for (?:the )?(.+?)(?: position| role)? (?:at|with) (.+?)(?:[.!?\n|]|$)/i,
    /application (?:received|submitted)(?:\s*[:\-–—]\s*| for )(?:the )?(.+?)(?: position| role)? (?:at|with) (.+?)(?:[.!?\n|]|$)/i,
    /interest in (?:the )?(.+?)(?: position| role) (?:at|with) (.+?)(?:[.!?\n|]|$)/i,
    /(?:application|applying|applied) to (.+?) for (?:the )?(.+?)(?: position| role)?(?:[.!?\n|]|$)/i
  ];

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
    for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
      const match = String(sources[sourceIndex] || "").match(
        patterns[patternIndex]
      );

      if (!match) {
        continue;
      }

      if (patternIndex === patterns.length - 1) {
        return {
          position: match[2] || "",
          company: match[1] || ""
        };
      }

      return {
        position: match[1] || "",
        company: match[2] || ""
      };
    }
  }

  return {
    position: "",
    company: ""
  };
}

/**
 * Extracts a position when no paired phrase was found.
 *
 * @param {string} subject
 * @param {string} body
 * @returns {string}
 */
function extractPosition_(subject, body) {
  const text = subject + "\n" + body.slice(0, 5000);
  const patterns = [
    /(?:position|job title|role)\s*:\s*([^\n|]+)/i,
    /(?:application|applying|applied) for (?:the )?(.+?)(?: position| role)?(?:[.!?\n|]|$)/i,
    /application (?:received|submitted|confirmation)\s*[:\-–—]\s*(.+?)(?:[.!?\n|]|$)/i
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
 * Extracts a company when no paired phrase was found.
 *
 * @param {string} subject
 * @param {string} body
 * @returns {string}
 */
function extractCompany_(subject, body) {
  const text = subject + "\n" + body.slice(0, 5000);
  const patterns = [
    /(?:company|employer|organization)\s*:\s*([^\n|]+)/i,
    /(?:application|applying|applied) to (.+?)(?: for |[.!?\n|]|$)/i,
    /(?:thank you for|thanks for) your interest in (.+?)(?:[.!?\n|]|$)/i
  ];

  for (let index = 0; index < patterns.length; index++) {
    const match = text.match(patterns[index]);

    if (!match) {
      continue;
    }

    const value = String(match[1] || "");

    if (!/^(?:the )?(?:position|role|opportunity)$/i.test(value.trim())) {
      return value;
    }
  }

  return "";
}

/**
 * Uses a sender display name or domain as a last-resort company hint.
 * Known job platforms and applicant tracking systems are excluded.
 *
 * @param {*} sender
 * @returns {string}
 */
function extractCompanyFromSender_(sender) {
  const senderText = String(sender || "").trim();
  const emailMatch = senderText.match(/<([^>]+)>/);
  const emailAddress = (
    emailMatch ? emailMatch[1] : senderText
  ).toLowerCase();

  const excludedProviders = [
    "greenhouse",
    "lever",
    "workday",
    "smartrecruiters",
    "workable",
    "jobvite",
    "linkedin",
    "indeed",
    "jobstreet"
  ];

  let displayName = emailMatch
    ? senderText.slice(0, emailMatch.index)
    : "";

  displayName = displayName
    .replace(/["']/g, "")
    .replace(
      /\b(?:careers?|recruiting|recruitment|talent(?: acquisition)?|jobs?|human resources|hr|notifications?|no[ -]?reply|team)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  const normalizedDisplay = displayName.toLowerCase();

  if (
    displayName.length >= 2 &&
    !excludedProviders.some(function (provider) {
      return normalizedDisplay.indexOf(provider) !== -1;
    })
  ) {
    return displayName;
  }

  const domainMatch = emailAddress.match(/@([^>\s]+)/);

  if (!domainMatch) {
    return "";
  }

  const domainParts = domainMatch[1].split(".");
  const domainName = domainParts.length >= 2
    ? domainParts[domainParts.length - 2]
    : domainParts[0];

  if (excludedProviders.indexOf(domainName) !== -1) {
    return "";
  }

  return domainName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
}

/**
 * Maps known recruitment platforms to the existing CRM dropdown values.
 *
 * @param {*} sender
 * @param {string} subject
 * @param {string} body
 * @returns {string}
 */
function detectApplicationPlatform_(sender, subject, body) {
  const text = [sender, subject, body.slice(0, 2000)]
    .join(" ")
    .toLowerCase();

  if (text.indexOf("linkedin") !== -1) {
    return "LinkedIn";
  }

  if (text.indexOf("jobstreet") !== -1) {
    return "JobStreet";
  }

  if (text.indexOf("indeed") !== -1) {
    return "Indeed";
  }

  return "Company Website";
}

/**
 * Cleans a parsed label without allowing multi-line boilerplate through.
 *
 * @param {*} value
 * @param {string} kind
 * @returns {string}
 */
function cleanParsedValue_(value, kind) {
  let cleaned = String(value || "")
    .split(/\n|\|/)[0]
    .replace(/^[\s:;,.\-–—]+/, "")
    .replace(/[\s:;,.\-–—]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (kind === "position") {
    cleaned = cleaned.replace(/\s+(?:position|role)$/i, "");
  }

  return cleaned.slice(0, 160).trim();
}

/**
 * Normalizes an email subject for display and parsing.
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeEmailSubject_(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/**
 * Normalizes plain-text email content while preserving line boundaries.
 *
 * @param {*} value
 * @returns {string}
 */
function normalizeEmailBody_(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
