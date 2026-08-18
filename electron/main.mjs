import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, Menu, dialog, session } from "electron";

app.setName("Frame Lab");

const isSmokeTest = process.argv.includes("--smoke-test");

let frameLabServer = null;
let frameLabOrigin = "";
let mainWindow = null;

function ensureDesktopData() {
  const dataDirectory = join(app.getPath("userData"), "data");
  const databasePath = join(dataDirectory, "frame-lab-db.json");
  mkdirSync(dataDirectory, { recursive: true });

  if (!existsSync(databasePath)) {
    const seedPath = join(app.getAppPath(), "seed", "frame-lab-db.json");
    copyFileSync(seedPath, databasePath);
  }

  return dataDirectory;
}

async function startLocalServer() {
  process.env.FRAME_LAB_DATA_DIR = ensureDesktopData();
  process.env.FRAME_LAB_DESKTOP = "1";

  const serverModuleUrl = pathToFileURL(join(app.getAppPath(), "web", "server.js")).href;
  const { startFrameLabServer } = await import(serverModuleUrl);
  const started = await startFrameLabServer({ listenPort: 0, listenHost: "127.0.0.1" });

  frameLabServer = started.server;
  frameLabOrigin = started.origin;
}

function isAllowedInAppNavigation(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.origin === frameLabOrigin;
  } catch {
    return false;
  }
}

function installNavigationPolicy(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  window.webContents.on("will-navigate", (event, url) => {
    if (isAllowedInAppNavigation(url)) return;
    event.preventDefault();
  });
}

function installOfflineNetworkPolicy() {
  const allowedOrigin = frameLabOrigin;
  session.defaultSession.setSpellCheckerEnabled(false);
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
    (details, callback) => {
      try {
        const requestUrl = new URL(details.url);
        callback({ cancel: requestUrl.origin !== allowedOrigin });
      } catch {
        callback({ cancel: true });
      }
    }
  );
}

async function runSmokeCheck(window) {
  try {
    const result = await window.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const check = () => {
          const booted = Boolean(window.frameLabBoot?.ready);
          const heading = document.querySelector("#heroTitle")?.textContent?.trim() || "";
          if (booted && heading) {
            fetch("https://example.com/", { cache: "no-store" })
              .then(() => false, () => true)
              .then((externalNetworkBlocked) => resolve({
                title: document.title,
                heading,
                origin: window.location.origin,
                booted,
                externalNetworkBlocked,
                googleLoginRemoved: !document.querySelector("#googleLogin"),
                registrationCodePresent: Boolean(document.querySelector("#accountRegistrationCode"))
              }));
            return;
          }
          if (Date.now() - startedAt > 30000) {
            reject(new Error("Frame Lab UI did not finish loading within 30 seconds."));
            return;
          }
          setTimeout(check, 100);
        };
        check();
      });
    `, true);
    if (!result.externalNetworkBlocked || !result.googleLoginRemoved || !result.registrationCodePresent) {
      throw new Error(`Offline desktop checks failed: ${JSON.stringify(result)}`);
    }
    console.log(`FRAME_LAB_SMOKE_OK ${JSON.stringify(result)}`);
    app.exit(0);
  } catch (error) {
    console.error(`FRAME_LAB_SMOKE_FAILED ${error?.stack || error}`);
    app.exit(1);
  }
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#0c0d0d",
    title: "Frame Lab",
    icon: join(app.getAppPath(), "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });

  installNavigationPolicy(window);
  window.once("ready-to-show", () => {
    if (!isSmokeTest) window.show();
  });
  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`Frame Lab failed to load (${code}): ${description}`);
  });
  window.webContents.once("did-finish-load", () => {
    if (isSmokeTest) void runSmokeCheck(window);
  });
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  void window.loadURL(`${frameLabOrigin}/`);
  return window;
}

function installApplicationMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [{
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" }
          ]
        }]
      : []),
    {
      label: "File",
      submenu: [process.platform === "darwin" ? { role: "close" } : { role: "quit" }]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    installApplicationMenu();

    try {
      await startLocalServer();
      installOfflineNetworkPolicy();
      mainWindow = createMainWindow();
    } catch (error) {
      console.error(error);
      if (!isSmokeTest) {
        await dialog.showMessageBox({
          type: "error",
          title: "Frame Lab",
          message: "Frame Lab could not start.",
          detail: error?.message || String(error)
        });
      }
      app.exit(1);
    }

    app.on("activate", () => {
      if (!mainWindow && frameLabOrigin) mainWindow = createMainWindow();
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || isSmokeTest) app.quit();
});

app.on("before-quit", () => {
  frameLabServer?.close();
});
