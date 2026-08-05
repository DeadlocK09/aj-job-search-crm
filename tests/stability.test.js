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
