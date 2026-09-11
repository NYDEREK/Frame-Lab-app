import { posix } from "node:path";

export function staticRequestRelativePath(pathname) {
  const decodedPath = decodeURIComponent(String(pathname || "/")).replaceAll("\\", "/");
  const normalizedPath = posix.normalize(`/${decodedPath}`).replace(/^\/+/, "");
  return normalizedPath && normalizedPath !== "." ? normalizedPath : "index.html";
}
