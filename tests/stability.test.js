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
    "Applications.gs",
    "Dashboard.gs",
    "FollowUps.gs",
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
