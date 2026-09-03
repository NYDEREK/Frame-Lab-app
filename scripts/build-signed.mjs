import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import builder from "electron-builder";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const platform = process.argv[2];
const env = process.env;
const present = (...names) => names.every(name => Boolean(env[name]));
const fail = message => { throw new Error(message); };

try {
  if (!["mac", "win"].includes(platform)) fail("Choose mac or win.");
  if (platform === "mac") {
    if (!present("CSC_LINK", "CSC_KEY_PASSWORD")) fail("Signing is not configured. Add a Developer ID Application certificate using CSC_LINK and CSC_KEY_PASSWORD. No release was built.");
    if (!present("APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID") && !present("APPLE_API_KEY", "APPLE_API_KEY_ID", "APPLE_API_ISSUER")) fail("Apple notarization credentials are missing. No release was built.");
    if (process.platform !== "darwin") fail("Build and verify the signed macOS release on macOS.");
  } else {
    const certificate = present("WIN_CSC_LINK", "WIN_CSC_KEY_PASSWORD");
    const service = present("FRAME_LAB_SIGNING_ENDPOINT", "FRAME_LAB_SIGNING_ACCOUNT", "FRAME_LAB_SIGNING_PROFILE", "FRAME_LAB_SIGNING_PUBLISHER", "AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET");
    if (!certificate && !service) fail("Windows signing is not configured. Supply a trusted certificate or Artifact Signing credentials. No release was built.");
    if (process.platform !== "win32") fail("Build and verify the signed Windows release on Windows.");
  }
  const { build, Platform, Arch } = builder;
  const configuration = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).build;
  configuration.forceCodeSigning = true;
  configuration.directories.output = "dist-signed";
  if (platform === "mac") {
    configuration.mac = { ...configuration.mac, hardenedRuntime: true, notarize: true, entitlements: "build/entitlements.mac.plist", entitlementsInherit: "build/entitlements.mac.plist" };
  } else if (env.FRAME_LAB_SIGNING_ENDPOINT) {
    configuration.win.azureSignOptions = {
      publisherName: env.FRAME_LAB_SIGNING_PUBLISHER,
      endpoint: env.FRAME_LAB_SIGNING_ENDPOINT,
      codeSigningAccountName: env.FRAME_LAB_SIGNING_ACCOUNT,
      certificateProfileName: env.FRAME_LAB_SIGNING_PROFILE
    };
  }
  const artifacts = await build({
    projectDir: root,
    targets: platform === "mac" ? Platform.MAC.createTarget(["dmg", "zip"], Arch.universal) : Platform.WINDOWS.createTarget(["nsis"], Arch.x64),
    config: configuration,
    publish: "never"
  });
  if (platform === "mac") {
    const bundle = join(root, "dist-signed/mac-universal/Frame Lab.app");
    execFileSync("codesign", ["--verify", "--deep", "--strict", bundle], { stdio: "inherit" });
    execFileSync("xcrun", ["stapler", "validate", bundle], { stdio: "inherit" });
    execFileSync("spctl", ["--assess", "--type", "execute", "--verbose", bundle], { stdio: "inherit" });
  } else {
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference = 'Stop'; $files = Get-ChildItem -LiteralPath 'dist-signed' -Recurse -Filter '*.exe'; if ($files.Count -eq 0) { throw 'No executables to verify' }; foreach ($file in $files) { $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName; if ($signature.Status -ne 'Valid') { throw ('Invalid signature: ' + $file.Name) } }; Write-Output 'All executable signatures are valid.'"], { cwd: root, stdio: "inherit" });
  }
  console.log(`Signed release verified: ${artifacts.length} artifacts. Nothing was uploaded or published.`);
} catch (error) {
  console.error(`RELEASE_BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
