import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWebServerPath } from "../electron/resource-paths.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const build = packageJson.build;

assert.ok(!build.files.includes("web/**/*"), "The ESM web server must not be loaded from app.asar.");
assert.ok(
  build.extraResources?.some((entry) => entry.from === "web" && entry.to === "web"),
  "The complete web directory must be copied next to app.asar."
);

assert.equal(
  resolveWebServerPath({ isPackaged: true, resourcesPath: "/application/resources", appPath: "/application/resources/app.asar" }),
  join("/application/resources", "web", "server.js")
);
assert.equal(
  resolveWebServerPath({ isPackaged: false, resourcesPath: "/application/resources", appPath: root }),
  join(root, "web", "server.js")
);

console.log("FRAME_LAB_PACKAGING_LAYOUT_OK external-web-resource packaged-and-development-paths");
