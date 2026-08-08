const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repositoryRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(repositoryRoot, "src");

function loadServerContext(overrides = {}) {
  const context = vm.createContext({
    console,
    Date,
    Error,
    Math,
    Number,
    Object,
    String,
    Array,
    JSON,
    ...overrides
  });

  [
    "Config.gs",
    "Utils.gs",
    "Logger.gs",
    "Parser.gs",
    "Applications.gs",
    "Dashboard.gs",
    "FollowUps.gs",
    "Gmail.gs",
    "GmailScheduler.gs",
    "Main.gs",
    "Search.gs",
    "UI.gs"
  ].forEach((fileName) => {
    const source = fs.readFileSync(
      path.join(sourceRoot, fileName),
      "utf8"
    );

    vm.runInContext(source, context, {
      filename: fileName
    });
  });

  return context;
}

function getConfigValue(context, expression) {
  return vm.runInContext(expression, context);
}

test("all server-side Apps Script files parse together", () => {
  assert.doesNotThrow(() => loadServerContext());
});

test("the persistent ID counter never reuses a deleted highest ID", () => {
  const properties = new Map();
  let rows = [
    ["APP-000001"],
    ["APP-000004"]
  ];
  let lockDepth = 0;

  const context = loadServerContext({
    LockService: {
      getScriptLock() {
        return {
          waitLock() {
            lockDepth++;
          },
          releaseLock() {
            lockDepth--;
          }
        };
      }
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) {
            return properties.has(key)
              ? properties.get(key)
              : null;
          },
          setProperty(key, value) {
            properties.set(key, String(value));
          }
        };
      }
    }
  });

  const sheet = {
    getLastRow() {
      return rows.length + 1;
    },
    getRange() {
      return {
        getValues() {
          return rows;
        }
      };
    }
  };

  assert.equal(
    context.getNextApplicationId_(sheet),
    "APP-000005"
  );

  rows = [["APP-000001"]];

  assert.equal(
    context.getNextApplicationId_(sheet),
    "APP-000006"
  );
  assert.equal(lockDepth, 0);
});

test("choice normalization fixes whitespace and capitalization", () => {
  const context = loadServerContext();
  const statuses = getConfigValue(
    context,
    "CONFIG.STATUS_VALUES"
  );
  const platforms = getConfigValue(
    context,
    "CONFIG.PLATFORMS"
  );

  assert.equal(
    context.requireCanonicalChoice_(
      " technical interview ",
      statuses,
      "Status"
    ),
    "Technical Interview"
  );
  assert.equal(
    context.requireCanonicalChoice_(
      "LinkedIn ",
      platforms,
      "Platform"
    ),
    "LinkedIn"
  );
  assert.throws(
    () => context.requireCanonicalChoice_(
      "Unknown stage",
      statuses,
      "Status"
    ),
    /Status is invalid/
  );
});

test("deleting from an empty database fails before requesting a range", () => {
  let rangeRequested = false;
  const emptySheet = {
    getLastRow() {
      return 1;
    },
    getRange() {
      rangeRequested = true;
      throw new Error("A range should not be requested.");
    }
  };

  const context = loadServerContext();
  context.getApplicationsSheet = () => emptySheet;

  assert.throws(
    () => context.deleteApplication("APP-000001"),
    /No applications were found/
  );
  assert.equal(rangeRequested, false);
});

test("browser-side scripts parse and the Add form has a submit guard", () => {
  const htmlFiles = [
    "AddApplication.html",
    "EditApplicationSidebar.html",
    "GmailImportSidebar.html",
    "SearchSidebar.html"
  ];

  htmlFiles.forEach((fileName) => {
    const html = fs.readFileSync(
      path.join(sourceRoot, fileName),
      "utf8"
    );

    const scripts = Array.from(
      html.matchAll(/<script>([\s\S]*?)<\/script>/gi),
      (match) => match[1].replace(
        /<\?!=[\s\S]*?\?>/g,
        '"APP-TEST"'
      )
    );

    scripts.forEach((script) => {
      assert.doesNotThrow(
        () => new Function(script),
        fileName
      );
    });
  });

  const addForm = fs.readFileSync(
    path.join(sourceRoot, "AddApplication.html"),
    "utf8"
  );

  assert.match(addForm, /let isSaving = false/);
  assert.match(addForm, /if \(isSaving\)/);
  assert.match(addForm, /button\.disabled = true/);
  assert.doesNotMatch(
    addForm,
    /Save functionality will be added/
  );

  const gmailReview = fs.readFileSync(
    path.join(sourceRoot, "GmailImportSidebar.html"),
    "utf8"
  );

  assert.match(gmailReview, /checkbox\.checked = false/);
  assert.match(gmailReview, /window\.confirm/);
  assert.match(gmailReview, /Nothing is imported automatically/);
});

test("the Apps Script manifest uses the Manila timezone", () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(sourceRoot, "appsscript.json"),
      "utf8"
    )
  );

  const context = loadServerContext();
  const configuredTimeZone = getConfigValue(
    context,
    "CONFIG.TIME_ZONE"
  );

  assert.equal(manifest.timeZone, "Asia/Manila");
  assert.equal(configuredTimeZone, manifest.timeZone);
  assert.equal(manifest.runtimeVersion, "V8");
});

test("Gmail parser extracts a structured application confirmation", () => {
  const context = loadServerContext();
  const candidate = context.parseApplicationEmail_({
    messageId: "gmail-message-1",
    receivedAt: new Date("2026-08-08T01:00:00Z"),
    subject:
      "Thank you for applying for IT Support Specialist at Acme Corporation",
    from: "Acme Careers <jobs@acme.example>",
    body:
      "We received your application. Our recruitment team will review it."
  });

  assert.ok(candidate);
  assert.equal(candidate.company, "Acme Corporation");
  assert.equal(candidate.position, "IT Support Specialist");
  assert.equal(candidate.platform, "Company Website");
  assert.equal(candidate.status, "Applied");
  assert.equal(candidate.needsReview, false);
  assert.ok(candidate.confidence >= 90);
});

test("Gmail parser rejects job-alert newsletters", () => {
  const context = loadServerContext();
  const candidate = context.parseApplicationEmail_({
    messageId: "gmail-alert-1",
    subject: "Job alert: new IT Support jobs for you",
    from: "Job Board <alerts@example.com>",
    body:
      "Recommended jobs. Thank you for applying filters to your search."
  });

  assert.equal(candidate, null);
});

test("Gmail scan excludes processed and already-tracked applications", () => {
  const existingRows = [
    ["APP-000001", new Date(), "Acme Corporation", "IT Support Specialist"]
  ];

  const applicationsSheet = {
    getLastRow() {
      return existingRows.length + 1;
    },
    getRange() {
      return {
        getValues() {
          return existingRows;
        }
      };
    }
  };

  function createMessage(id, subject, sender, day) {
    return {
      getId() {
        return id;
      },
      getDate() {
        return new Date(2026, 7, day, 9, 0, 0);
      },
      getSubject() {
        return subject;
      },
      getFrom() {
        return sender;
      },
      getPlainBody() {
        return "We received your application.";
      }
    };
  }

  const messages = [
    createMessage(
      "existing-message",
      "Application received for IT Support Specialist at Acme Corporation",
      "Acme Careers <jobs@acme.example>",
      8
    ),
    createMessage(
      "new-message",
      "Application received for Service Desk Analyst at Beta Corp",
      "Beta Careers <jobs@beta.example>",
      7
    ),
    createMessage(
      "processed-message",
      "Application received for Systems Analyst at Gamma Ltd",
      "Gamma Careers <jobs@gamma.example>",
      6
    )
  ];

  const context = loadServerContext({
    GmailApp: {
      search() {
        return [{
          getMessages() {
            return messages;
          }
        }];
      }
    }
  });

  context.getApplicationsSheet = () => applicationsSheet;
  context.getImportedGmailMessageIds_ = () => ({
    "processed-message": true
  });

  const result = context.scanGmailForApplicationCandidates();

  assert.equal(result.summary.messagesReviewed, 3);
  assert.equal(result.summary.alreadyImported, 1);
  assert.equal(result.summary.alreadyTracked, 1);
  assert.equal(result.summary.candidatesFound, 1);
  assert.equal(result.candidates[0].messageId, "new-message");
  assert.equal(result.candidates[0].company, "Beta Corp");
});

test("reviewed Gmail import sanitizes formulas and updates once", () => {
  const appendedRows = [];
  const logEvents = [];
  let dashboardUpdates = 0;

  const applicationsSheet = {
    getLastRow() {
      return 1;
    },
    appendRow(row) {
      appendedRows.push(row);
    }
  };

  const context = loadServerContext();

  context.getApplicationsSheet = () => applicationsSheet;
  context.getImportedGmailMessageIds_ = () => ({});
  context.getNextApplicationId_ = () => "APP-000007";
  context.getCurrentTimestamp = () =>
    new Date("2026-08-08T02:00:00Z");
  context.updateDashboard = () => {
    dashboardUpdates++;
  };
  context.logGmailEvent_ = (event) => {
    logEvents.push(event);
  };

  const result = context.importGmailApplicationCandidates([{
    messageId: "gmail-message-7",
    receivedAt: "2026-08-07T03:00:00.000Z",
    subject: "Application received",
    sender: "Example Careers <jobs@example.com>",
    company: "=Unsafe Formula",
    position: "Support Analyst",
    platform: "Company Website",
    workType: "Remote"
  }]);

  assert.equal(result.imported.length, 1);
  assert.equal(result.imported[0].applicationId, "APP-000007");
  assert.equal(appendedRows.length, 1);
  assert.equal(appendedRows[0][2], "'=Unsafe Formula");
  assert.equal(appendedRows[0][3], "Support Analyst");
  assert.equal(appendedRows[0][8], "Applied");
  assert.match(appendedRows[0][15], /Gmail message ID: gmail-message-7/);
  assert.equal(dashboardUpdates, 1);
  assert.equal(logEvents.length, 1);
  assert.equal(logEvents[0].action, "GMAIL_IMPORTED");
});

function getRelativeDate(dayOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

function getApplicationRow({
  applicationId,
  company,
  position,
  status,
  followUpDayOffset
}) {
  const row = Array(17).fill("");

  row[0] = applicationId;
  row[2] = company;
  row[3] = position;
  row[8] = status;
  row[12] = getRelativeDate(followUpDayOffset);

  return row;
}

function getApplicationsSheetMock(rows) {
  return {
    getLastRow() {
      return rows.length + 1;
    },
    getLastColumn() {
      return 17;
    },
    getRange() {
      return {
        getValues() {
          return rows;
        }
      };
    }
  };
}

test("follow-up notifications include only overdue and due-today work", () => {
  const rows = [
    getApplicationRow({
      applicationId: "APP-000001",
      company: "Overdue Company",
      position: "Support Specialist",
      status: "Applied",
      followUpDayOffset: -2
    }),
    getApplicationRow({
      applicationId: "APP-000002",
      company: "Today Company",
      position: "IT Administrator",
      status: "HR Interview",
      followUpDayOffset: 0
    }),
    getApplicationRow({
      applicationId: "APP-000003",
      company: "Future Company",
      position: "Help Desk Analyst",
      status: "Applied",
      followUpDayOffset: 1
    }),
    getApplicationRow({
      applicationId: "APP-000004",
      company: "Closed Company",
      position: "Systems Analyst",
      status: "Rejected",
      followUpDayOffset: -1
    })
  ];

  const context = loadServerContext();
  const summary = context.getFollowUpNotificationSummary_(
    getApplicationsSheetMock(rows),
    5
  );

  assert.equal(summary.total, 2);
  assert.equal(summary.overdue, 1);
  assert.equal(summary.dueToday, 1);
  assert.equal(summary.items.length, 2);
  assert.equal(summary.items[0].applicationId, "APP-000001");
  assert.equal(summary.items[1].applicationId, "APP-000002");

  const message = context.buildFollowUpNotificationMessage_(
    summary
  );

  assert.match(message, /2 follow-ups need attention/);
  assert.match(message, /Overdue Company/);
  assert.match(message, /Today Company/);
  assert.doesNotMatch(message, /Future Company/);
  assert.doesNotMatch(message, /Closed Company/);
});

test("opening the spreadsheet adds the due count and shows one toast", () => {
  const rows = [
    getApplicationRow({
      applicationId: "APP-000001",
      company: "Reminder Company",
      position: "IT Support",
      status: "Applied",
      followUpDayOffset: 0
    })
  ];

  const sheet = getApplicationsSheetMock(rows);
  const menuLabels = [];
  const toasts = [];

  const menu = {
    addItem(label) {
      menuLabels.push(label);
      return this;
    },
    addSeparator() {
      return this;
    },
    addToUi() {
      return this;
    }
  };

  const spreadsheet = {
    getSheetByName(name) {
      return name === "Applications" ? sheet : null;
    },
    toast(message, title, duration) {
      toasts.push({ message, title, duration });
    }
  };

  const context = loadServerContext({
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        return spreadsheet;
      },
      getUi() {
        return {
          createMenu() {
            return menu;
          }
        };
      }
    }
  });

  context.onOpen();

  assert.ok(menuLabels.includes("🔔 Follow-ups Due (1)"));
  assert.equal(toasts.length, 1);
  assert.match(toasts[0].message, /1 due today/);
  assert.equal(toasts[0].duration, 8);
});

function createPropertyStore(initialValues = {}) {
  const values = new Map(
    Object.entries(initialValues).map(([key, value]) => [
      key,
      String(value)
    ])
  );

  return {
    values,
    getProperty(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setProperty(key, value) {
      values.set(key, String(value));
      return this;
    },
    setProperties(properties) {
      Object.entries(properties).forEach(([key, value]) => {
        values.set(key, String(value));
      });
      return this;
    },
    deleteProperty(key) {
      values.delete(key);
      return this;
    }
  };
}

test("enabling the Gmail schedule replaces duplicate triggers", () => {
  const userProperties = createPropertyStore();
  const scriptProperties = createPropertyStore();
  const deletedHandlers = [];
  const createdSettings = {};
  const existingTriggers = [
    {
      getHandlerFunction() {
        return "runScheduledGmailScan";
      }
    },
    {
      getHandlerFunction() {
        return "unrelatedTrigger";
      }
    }
  ];

  const triggerBuilder = {
    timeBased() {
      return this;
    },
    everyDays(value) {
      createdSettings.everyDays = value;
      return this;
    },
    atHour(value) {
      createdSettings.atHour = value;
      return this;
    },
    inTimezone(value) {
      createdSettings.timeZone = value;
      return this;
    },
    create() {
      return {
        getUniqueId() {
          return "trigger-1";
        }
      };
    }
  };

  const spreadsheet = {
    getId() {
      return "spreadsheet-1";
    },
    getName() {
      return "AJ Job Search CRM";
    }
  };

  const context = loadServerContext({
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        return spreadsheet;
      }
    },
    PropertiesService: {
      getUserProperties() {
        return userProperties;
      },
      getScriptProperties() {
        return scriptProperties;
      }
    },
    ScriptApp: {
      getProjectTriggers() {
        return existingTriggers;
      },
      deleteTrigger(trigger) {
        deletedHandlers.push(trigger.getHandlerFunction());
      },
      newTrigger(handler) {
        createdSettings.handler = handler;
        return triggerBuilder;
      }
    }
  });

  context.getCurrentTimestamp = () =>
    new Date("2026-08-08T00:00:00.000Z");
  context.logGmailEvent_ = () => {};

  const result = context.enableScheduledGmailScan("AJ@Example.com");

  assert.deepEqual(deletedHandlers, ["runScheduledGmailScan"]);
  assert.equal(createdSettings.handler, "runScheduledGmailScan");
  assert.equal(createdSettings.everyDays, 1);
  assert.equal(createdSettings.atHour, 8);
  assert.equal(createdSettings.timeZone, "Asia/Manila");
  assert.equal(result.notificationEmail, "aj@example.com");
  assert.equal(
    userProperties.getProperty("GMAIL_SCHEDULE_TRIGGER_ID"),
    "trigger-1"
  );
  assert.equal(
    userProperties.getProperty("GMAIL_SCHEDULED_SINCE"),
    "2026-08-08T00:00:00.000Z"
  );
  assert.equal(
    scriptProperties.getProperty("CAREERFLOW_SPREADSHEET_ID"),
    "spreadsheet-1"
  );
});

test("scheduled Gmail scan emails only candidates newer than its baseline", () => {
  const userProperties = createPropertyStore({
    GMAIL_NOTIFICATION_EMAIL: "aj@example.com",
    GMAIL_SCHEDULED_SINCE: "2026-08-08T00:00:00.000Z"
  });
  const sentEmails = [];
  let lockDepth = 0;

  const context = loadServerContext({
    PropertiesService: {
      getUserProperties() {
        return userProperties;
      }
    },
    LockService: {
      getUserLock() {
        return {
          tryLock() {
            lockDepth++;
            return true;
          },
          releaseLock() {
            lockDepth--;
          }
        };
      }
    },
    MailApp: {
      sendEmail(message) {
        sentEmails.push(message);
      }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        return {
          getUrl() {
            return "https://docs.google.com/spreadsheets/d/example";
          }
        };
      }
    }
  });

  context.getCurrentTimestamp = () =>
    new Date("2026-08-08T02:00:00.000Z");
  context.logGmailEvent_ = () => {};
  context.scanGmailForApplicationCandidates = () => ({
    candidates: [
      {
        messageId: "old-message",
        receivedAt: "2026-08-07T23:59:00.000Z",
        company: "Old Company",
        position: "Old Role"
      },
      {
        messageId: "new-message",
        receivedAt: "2026-08-08T01:00:00.000Z",
        company: "New Company",
        position: "Support Analyst"
      },
      {
        messageId: "mid-scan-message",
        receivedAt: "2026-08-08T02:01:00.000Z",
        company: "Later Company",
        position: "IT Support"
      }
    ]
  });

  const result = context.runScheduledGmailScan();

  assert.equal(result.newCandidates, 1);
  assert.equal(result.notificationSent, true);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, "aj@example.com");
  assert.match(sentEmails[0].subject, /1 new application email/);
  assert.match(sentEmails[0].body, /New Company/);
  assert.doesNotMatch(sentEmails[0].body, /Old Company/);
  assert.doesNotMatch(sentEmails[0].body, /Later Company/);
  assert.match(sentEmails[0].body, /Nothing has been imported automatically/);
  assert.equal(
    userProperties.getProperty("GMAIL_SCHEDULED_SINCE"),
    "2026-08-08T02:00:00.000Z"
  );
  assert.equal(lockDepth, 0);
});

test("scheduled Gmail scan does nothing while disabled", () => {
  const userProperties = createPropertyStore();
  let scanned = false;
  let lockReleased = false;

  const context = loadServerContext({
    PropertiesService: {
      getUserProperties() {
        return userProperties;
      }
    },
    LockService: {
      getUserLock() {
        return {
          tryLock() {
            return true;
          },
          releaseLock() {
            lockReleased = true;
          }
        };
      }
    }
  });

  context.scanGmailForApplicationCandidates = () => {
    scanned = true;
    return { candidates: [] };
  };

  const result = context.runScheduledGmailScan();

  assert.equal(result.disabled, true);
  assert.equal(scanned, false);
  assert.equal(lockReleased, true);
});

test("scheduled execution reopens the remembered spreadsheet", () => {
  const scriptProperties = createPropertyStore({
    CAREERFLOW_SPREADSHEET_ID: "spreadsheet-remembered"
  });
  let openedSpreadsheetId = "";
  const rememberedSpreadsheet = {
    getId() {
      return "spreadsheet-remembered";
    }
  };

  const context = loadServerContext({
    PropertiesService: {
      getScriptProperties() {
        return scriptProperties;
      }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        return null;
      },
      openById(spreadsheetId) {
        openedSpreadsheetId = spreadsheetId;
        return rememberedSpreadsheet;
      }
    }
  });

  assert.equal(
    context.getCareerFlowSpreadsheet_(),
    rememberedSpreadsheet
  );
  assert.equal(openedSpreadsheetId, "spreadsheet-remembered");
});
