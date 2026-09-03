import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalDatabase } from "../web/local-database.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "frame-lab-data-tests-"));
const data = join(temporary, "data");
mkdirSync(data);
copyFileSync(join(root, "seed/frame-lab-db.json"), join(data, "frame-lab-db.json"));
process.env.FRAME_LAB_DATA_DIR = data;
let server;
try {
  const { startFrameLabServer } = await import("../web/server.js");
  const started = await startFrameLabServer({ listenPort: 0, listenHost: "127.0.0.1" });
  server = started.server;
  const call = async (path, body, method = body ? "POST" : "GET") => {
    const response = await fetch(`${started.origin}/api/desktop${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, ...(await response.json()) };
  };
  const activation = await call("/activate", { code: "1847-2294-6103" });
  assert.equal(activation.status, 200);
  const original = await call("/projects", { project: { name: "Original", draft: { name: "Original", params: { head_width: 150 }, sketch: { points: [[0, 0], [1, 0], [0, 1]] } } } });
  assert.equal(original.status, 201);
  const portable = { format: "frame-lab-project", version: 1, project: original.project };
  const imported = await call("/projects/import", portable);
  assert.equal(imported.status, 201);
  assert.notEqual(imported.project.id, original.project.id);
  assert.deepEqual(imported.project.draft, original.project.draft);
  assert.deepEqual((await call("/state")).license, activation.license);
  assert.equal((await call("/projects/import", { ...portable, version: 99 })).status, 400);
  assert.equal((await call("/projects/import", { format: "frame-lab-project", version: 1, project: {} })).status, 400);

  const concurrent = await Promise.all(Array.from({ length: 8 }, (_, index) => call("/projects", { project: { name: `Parallel ${index}`, draft: { params: { index } } } })));
  assert.ok(concurrent.every(result => result.status === 201));
  assert.equal((await call("/state")).projects.length, 10, "Concurrent saves must not overwrite other projects.");
  const deleted = await call(`/projects/${original.project.id}`, null, "DELETE");
  assert.equal(deleted.status, 200);
  const backups = (await call("/backups")).backups;
  const prior = backups.find(backup => backup.id !== "last-good" && backup.projectCount === 10);
  assert.ok(prior, "Deleting a project must create a restorable snapshot.");
  const restored = await call("/backups/restore", { id: prior.id });
  assert.equal(restored.restored, 1);
  assert.equal((await call("/state")).projects.length, 10);
  assert.deepEqual((await call("/state")).license, activation.license);
  assert.equal((await call("/backups/restore", { id: prior.id })).restored, 0);
  assert.equal((await call("/backups/restore", { id: "../../frame-lab-db.json" })).status, 404);

  const path = join(data, "frame-lab-db.json");
  const beforeCorruption = JSON.parse(readFileSync(path, "utf8"));
  writeFileSync(path, "{broken");
  const recovered = await call("/state");
  assert.equal(recovered.status, 200);
  assert.equal(recovered.projects.length, beforeCorruption.desktop.projects.length);
  assert.deepEqual(recovered.license, activation.license);
  assert.match(recovered.recoveryMessage, /recovered/);
  assert.ok(readdirSync(join(data, "recovery")).some(name => name.startsWith("unreadable-")));

  const limitDb = JSON.parse(readFileSync(path, "utf8"));
  limitDb.desktop.projects = Array.from({ length: 500 }, (_, index) => ({ id: `limit-${index}`, name: `Project ${index}`, draft: { params: { index } } }));
  writeFileSync(path, JSON.stringify(limitDb));
  assert.equal((await call("/projects", { project: { name: "501", draft: { params: {} } } })).status, 409);
  assert.equal((await call("/projects/import", portable)).status, 409);
  assert.equal(JSON.parse(readFileSync(path, "utf8")).desktop.projects.length, 500);
  assert.ok(JSON.parse(readFileSync(path, "utf8")).desktop.projects.some(project => project.id === "limit-499"));
  assert.equal((await call("/projects", { project: { id: "limit-499", name: "Updated at limit", draft: { params: {} } } })).status, 200);
  assert.equal((await call("/state")).projects.length, 500);

  const isolated = join(temporary, "unrecoverable");
  mkdirSync(isolated);
  writeFileSync(join(isolated, "frame-lab-db.json"), "not-json");
  const store = createLocalDatabase({ directory: isolated, createDefault: () => ({ desktop: { projects: [], activationHistory: [] } }), normalize: value => value });
  assert.throws(() => store.read(), /No data was overwritten/);
  assert.equal(readFileSync(join(isolated, "frame-lab-db.json"), "utf8"), "not-json");
  assert.ok(existsSync(join(data, "frame-lab-db.last-good.json")));
  console.log("FRAME_LAB_DATA_TESTS_OK import-roundtrip concurrent-saves restore-preserves-license corrupt-recovery no-silent-reset no-limit-deletion");
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  rmSync(temporary, { recursive: true, force: true });
}
