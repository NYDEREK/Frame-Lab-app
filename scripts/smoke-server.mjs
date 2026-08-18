import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const temporaryRoot = mkdtempSync(join(tmpdir(), "frame-lab-smoke-"));
const dataDirectory = join(temporaryRoot, "data");
mkdirSync(dataDirectory, { recursive: true });
copyFileSync(join(projectRoot, "seed", "frame-lab-db.json"), join(dataDirectory, "frame-lab-db.json"));
process.env.FRAME_LAB_DATA_DIR = dataDirectory;

let server;

async function postJson(origin, pathname, body) {
  const response = await fetch(`${origin}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { response, payload: await response.json() };
}

try {
  const serverModuleUrl = pathToFileURL(join(projectRoot, "web", "server.js")).href;
  const { startFrameLabServer } = await import(serverModuleUrl);
  const started = await startFrameLabServer({ listenPort: 0, listenHost: "127.0.0.1" });
  server = started.server;

  const [pageResponse, settingsResponse, collectionsResponse] = await Promise.all([
    fetch(`${started.origin}/`),
    fetch(`${started.origin}/api/public-settings`),
    fetch(`${started.origin}/api/collections`)
  ]);

  assert.equal(pageResponse.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /Frame Lab \| 3D Printed Eyewear/);
  assert.match(pageHtml, /id="accountRegistrationCode"/);
  assert.doesNotMatch(pageHtml, /googleLogin|Continue with Google/i);
  assert.equal(settingsResponse.status, 200);
  assert.equal(collectionsResponse.status, 200);

  const settings = await settingsResponse.json();
  const collections = await collectionsResponse.json();
  assert.ok(settings.settings);
  assert.ok(Array.isArray(collections.collections));
  assert.ok(collections.collections.length > 0, "The desktop seed should include at least one collection.");

  const registrationWithoutCode = await postJson(started.origin, "/api/auth/email", {
    mode: "register",
    email: "missing-code@example.test",
    password: "local-pass",
    firstName: "Missing",
    lastName: "Code"
  });
  assert.equal(registrationWithoutCode.response.status, 400);

  const registration = await postJson(started.origin, "/api/auth/email", {
    mode: "register",
    email: "year@example.test",
    password: "local-pass",
    firstName: "Year",
    lastName: "Account",
    code: "3184-1815-3029"
  });
  assert.equal(registration.response.status, 200);
  assert.equal(registration.payload.user.plan, "basic");
  assert.equal(registration.payload.user.subscriptionMode, "license_year");
  assert.equal(registration.payload.user.subscriptionStatus, "paid_once");
  const accessDays = (new Date(registration.payload.user.planEndsAt) - new Date()) / 86_400_000;
  assert.ok(accessDays > 364 && accessDays < 367, "A yearly code should grant approximately one year of access.");

  const reusedStaticCode = await postJson(started.origin, "/api/auth/email", {
    mode: "register",
    email: "reused@example.test",
    password: "local-pass",
    firstName: "Reused",
    lastName: "Code",
    code: "3184-1815-3029"
  });
  assert.equal(reusedStaticCode.response.status, 200);
  assert.equal(reusedStaticCode.payload.user.plan, "basic");

  const databasePath = join(dataDirectory, "frame-lab-db.json");
  const database = JSON.parse(readFileSync(databasePath, "utf8"));
  const expiringUser = database.users.find((user) => user.email === "year@example.test");
  expiringUser.planEndsAt = "2020-01-01T00:00:00.000Z";
  writeFileSync(databasePath, JSON.stringify(database, null, 2));

  const loginAfterExpiry = await postJson(started.origin, "/api/auth/email", {
    mode: "login",
    email: "year@example.test",
    password: "local-pass"
  });
  assert.equal(loginAfterExpiry.response.status, 200);
  assert.equal(loginAfterExpiry.payload.user.plan, "free");
  assert.equal(loginAfterExpiry.payload.user.subscriptionStatus, "expired");

  const oauthResponse = await fetch(`${started.origin}/api/auth/oauth/google`);
  assert.equal(oauthResponse.status, 404);

  console.log(`FRAME_LAB_SERVER_SMOKE_OK ${started.origin}`);
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(temporaryRoot, { recursive: true, force: true });
}
