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

  const [pageResponse, settingsResponse, collectionsResponse, desktopStateResponse] = await Promise.all([
    fetch(`${started.origin}/`),
    fetch(`${started.origin}/api/public-settings`),
    fetch(`${started.origin}/api/collections`),
    fetch(`${started.origin}/api/desktop/state`)
  ]);

  assert.equal(pageResponse.status, 200);
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /<title>Frame Lab<\/title>/);
  assert.match(pageHtml, /id="desktopActivation"/);
  assert.match(pageHtml, /id="desktopDashboard"/);
  assert.match(pageHtml, /id="desktopSaveProject"/);
  assert.doesNotMatch(pageHtml, /Fit warnings|id="designWarnings"/i);
  assert.doesNotMatch(pageHtml, /design-stage-footer|Internal lens channel|id="designDimensions"|id="designViewHint"|id="designMeasureReadout"/i);
  assert.doesNotMatch(pageHtml, /googleLogin|Continue with Google/i);
  assert.equal(settingsResponse.status, 200);
  assert.equal(collectionsResponse.status, 200);
  assert.equal(desktopStateResponse.status, 200);

  const settings = await settingsResponse.json();
  const collections = await collectionsResponse.json();
  assert.ok(settings.settings);
  assert.ok(Array.isArray(collections.collections));
  assert.ok(collections.collections.length > 0, "The desktop seed should include at least one collection.");
  const initialDesktopState = await desktopStateResponse.json();
  assert.equal(initialDesktopState.license, null);
  assert.deepEqual(initialDesktopState.projects, []);

  const invalidActivation = await postJson(started.origin, "/api/desktop/activate", { code: "0000-0000-0000" });
  assert.equal(invalidActivation.response.status, 404);

  const activation = await postJson(started.origin, "/api/desktop/activate", { code: "3184-1815-3029" });
  assert.equal(activation.response.status, 200);
  assert.equal(activation.payload.license.plan, "basic");
  assert.equal(activation.payload.license.status, "active");
  const accessDays = (new Date(activation.payload.license.expiresAt) - new Date()) / 86_400_000;
  assert.ok(accessDays > 364 && accessDays < 367, "A yearly code should grant approximately one year of access.");

  const reusedStaticCode = await postJson(started.origin, "/api/desktop/activate", { code: "3184-1815-3029" });
  assert.equal(reusedStaticCode.response.status, 409);

  const createdProject = await postJson(started.origin, "/api/desktop/projects", {
    project: {
      name: "Smoke frame",
      description: "Local smoke project",
      draft: { name: "Smoke frame", params: { head_width: 148 }, style: { frameColor: "#c96b34" } }
    }
  });
  assert.equal(createdProject.response.status, 201);
  assert.equal(createdProject.payload.project.name, "Smoke frame");
  const projectId = createdProject.payload.project.id;

  const projectResponse = await fetch(`${started.origin}/api/desktop/projects/${projectId}`);
  assert.equal(projectResponse.status, 200);
  const storedProject = await projectResponse.json();
  assert.equal(storedProject.project.draft.params.head_width, 148);

  const projectsResponse = await fetch(`${started.origin}/api/desktop/projects`);
  assert.equal(projectsResponse.status, 200);
  const projects = await projectsResponse.json();
  assert.equal(projects.projects.length, 1);

  const databasePath = join(dataDirectory, "frame-lab-db.json");
  const database = JSON.parse(readFileSync(databasePath, "utf8"));
  database.desktop.license.expiresAt = "2020-01-01T00:00:00.000Z";
  writeFileSync(databasePath, JSON.stringify(database, null, 2));

  const expiredStateResponse = await fetch(`${started.origin}/api/desktop/state`);
  const expiredState = await expiredStateResponse.json();
  assert.equal(expiredState.license.status, "expired");

  const projectAfterExpiry = await fetch(`${started.origin}/api/desktop/projects/${projectId}`);
  assert.equal(projectAfterExpiry.status, 403);

  const oauthResponse = await fetch(`${started.origin}/api/auth/oauth/google`);
  assert.equal(oauthResponse.status, 404);

  console.log(`FRAME_LAB_SERVER_SMOKE_OK ${started.origin}`);
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(temporaryRoot, { recursive: true, force: true });
}
