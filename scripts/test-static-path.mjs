import assert from "node:assert/strict";
import { posix, win32 } from "node:path";
import { staticRequestRelativePath } from "../web/static-path.js";

assert.equal(staticRequestRelativePath("/"), "index.html");
assert.equal(staticRequestRelativePath(""), "index.html");
assert.equal(staticRequestRelativePath("/styles.css"), "styles.css");
assert.equal(staticRequestRelativePath("/src/app.js?v=1".split("?")[0]), "src/app.js");
assert.equal(staticRequestRelativePath("/%5c..%5csecret.txt"), "secret.txt");
assert.equal(staticRequestRelativePath("/../../secret.txt"), "secret.txt");

assert.equal(
  win32.join("C:\\Program Files\\Frame Lab\\resources\\web", staticRequestRelativePath("/")),
  "C:\\Program Files\\Frame Lab\\resources\\web\\index.html"
);
assert.equal(
  posix.join("/Applications/Frame Lab.app/Contents/Resources/web", staticRequestRelativePath("/")),
  "/Applications/Frame Lab.app/Contents/Resources/web/index.html"
);

console.log("FRAME_LAB_STATIC_PATH_OK windows-and-posix-root-requests-serve-index");
