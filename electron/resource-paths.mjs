import { join } from "node:path";

export function resolveWebServerPath({ isPackaged, resourcesPath, appPath }) {
  return isPackaged
    ? join(resourcesPath, "web", "server.js")
    : join(appPath, "web", "server.js");
}
