import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, Menu, dialog, session } from "electron";
import { confirmWindowLeave } from "./window-guard.mjs";

app.setName("Frame Lab");

const isSmokeTest = process.argv.includes("--smoke-test");
const uiPreviewArgument = process.argv.find((argument) => argument === "--ui-preview" || argument.startsWith("--ui-preview=")) || "";
const isUiPreview = Boolean(uiPreviewArgument);
const uiPreviewMode = uiPreviewArgument.split("=")[1] || "activation";
const isIsolatedRun = isSmokeTest || isUiPreview;

if (isIsolatedRun) {
  app.setPath("userData", join(app.getPath("temp"), `frame-lab-smoke-${process.pid}`));
}

let frameLabServer = null;
let frameLabOrigin = "";
let mainWindow = null;
let quitRequested = false;

function ensureDesktopData() {
  const dataDirectory = join(app.getPath("userData"), "data");
  const databasePath = join(dataDirectory, "frame-lab-db.json");
  mkdirSync(dataDirectory, { recursive: true });

  if (!existsSync(databasePath) && !existsSync(join(dataDirectory, "frame-lab-db.last-good.json")) && !existsSync(join(dataDirectory, "backups"))) {
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
      (async () => {
        const startedAt = Date.now();
        const waitFor = async (predicate, message, timeout = 30000) => {
          while (!predicate()) {
            if (Date.now() - startedAt > timeout) throw new Error(message);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        };
        await waitFor(
          () => Boolean(window.frameLabBoot?.ready && document.querySelector("#desktopActivation")),
          "Frame Lab UI did not finish loading within 30 seconds."
        );

        const externalNetworkBlocked = await fetch("https://example.com/", { cache: "no-store" }).then(() => false, () => true);
        const activationInput = document.querySelector("#desktopActivationCode");
        activationInput.value = "3184-1815-3029";
        activationInput.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector("#desktopActivateButton").click();
        await waitFor(
          () => document.querySelector("#desktopActivation").hidden && !document.querySelector("#desktopHeader").hidden,
          "Local activation did not open the desktop workspace."
        );

        document.querySelector("#desktopHeroCreate").click();
        await waitFor(() => !document.querySelector("#designLab").hidden, "Creator did not open.");
        const nameInput = document.querySelector("#designName");
        nameInput.value = "Smoke test frame";
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector("#desktopSaveProject").click();
        await waitFor(
          () => document.querySelector("#desktopSaveState").textContent.includes("Saved"),
          "Project did not save locally."
        );

        document.querySelector("#desktopBackToProjects").click();
        await waitFor(
          () => !document.querySelector("#desktopDashboard").hidden && Boolean(document.querySelector(".desktop-project-card")),
          "Saved project did not appear on the dashboard."
        );

        const stateResponse = await fetch("/api/desktop/state", { cache: "no-store" });
        const localState = await stateResponse.json();
        const reuseResponse = await fetch("/api/desktop/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "3184-1815-3029" })
        });

        return {
          title: document.title,
          origin: window.location.origin,
          booted: Boolean(window.frameLabBoot?.ready),
          externalNetworkBlocked,
          googleLoginRemoved: !document.querySelector("#googleLogin"),
          activationScreenPresent: Boolean(document.querySelector("#desktopActivation")),
          desktopDashboardPresent: Boolean(document.querySelector("#desktopDashboard")),
          projectsNavigationPresent: Boolean(document.querySelector(".design-stage-chrome #desktopBackToProjects")) && !document.querySelector(".desktop-navigation"),
          dashboardActionsSimplified: [...document.querySelectorAll(".desktop-library-actions > button")].map(button => button.textContent.trim()).join("|") === "＋ New Project|Import Project" && !document.querySelector("#desktopBackups"),
          projectSavePresent: Boolean(document.querySelector("#desktopSaveProject")),
          brandIconLoaded: document.querySelector("#desktopBrandHome img")?.naturalWidth > 0,
          headerSimplified: !document.querySelector("#desktopHeader #desktopSaveState") && !document.querySelector("#desktopPlanBadge > span") && !document.querySelector(".design-stage-header"),
          ownerToolsHiddenForCustomer: document.querySelector("#desktopDeveloperTab").hidden && document.querySelector("#desktopDeveloperPanel").hidden,
          marketingHomeHidden: getComputedStyle(document.querySelector("#homePage")).display === "none",
          activationCompleted: localState.license?.plan === "basic",
          projectSaved: localState.projects?.some((project) => project.name === "Smoke test frame"),
          sameCodeRejected: reuseResponse.status === 409
        };
      })();
    `, true);
    if (
      !result.externalNetworkBlocked
      || !result.googleLoginRemoved
      || !result.activationScreenPresent
      || !result.desktopDashboardPresent
      || !result.projectsNavigationPresent
      || !result.dashboardActionsSimplified
      || !result.projectSavePresent
      || !result.brandIconLoaded
      || !result.headerSimplified
      || !result.ownerToolsHiddenForCustomer
      || !result.marketingHomeHidden
      || !result.activationCompleted
      || !result.projectSaved
      || !result.sameCodeRejected
    ) {
      throw new Error(`Offline desktop checks failed: ${JSON.stringify(result)}`);
    }
    console.log(`FRAME_LAB_SMOKE_OK ${JSON.stringify(result)}`);
    app.exit(0);
  } catch (error) {
    console.error(`FRAME_LAB_SMOKE_FAILED ${error?.stack || error}`);
    app.exit(1);
  }
}

async function prepareUiPreview(window) {
  if (!isUiPreview || uiPreviewMode === "activation") return;
  await window.webContents.executeJavaScript(`
    (async () => {
      const startedAt = Date.now();
      const waitFor = async (predicate) => {
        while (!predicate()) {
          if (Date.now() - startedAt > 30000) throw new Error("UI preview setup timed out.");
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      };
      await waitFor(() => Boolean(window.frameLabBoot?.ready));
      const activationInput = document.querySelector("#desktopActivationCode");
      activationInput.value = "1847-2294-6103";
      activationInput.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#desktopActivateButton").click();
      await waitFor(() => document.querySelector("#desktopActivation").hidden);
      document.querySelector("#desktopHeroCreate").click();
      await waitFor(() => !document.querySelector("#designLab").hidden);
      if (${JSON.stringify(uiPreviewMode)} === "dashboard") {
        const nameInput = document.querySelector("#designName");
        nameInput.value = "Classic amber frame";
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
        const description = document.querySelector("#designDescription");
        description.value = "Production concept · personal fit";
        description.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector("#desktopSaveProject").click();
        await waitFor(() => document.querySelector("#desktopSaveState").textContent.includes("Saved"));
        document.querySelector("#desktopBackToProjects").click();
        await waitFor(() => !document.querySelector("#desktopDashboard").hidden);
      }
    })();
  `, true);
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#202121",
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
  let allowClose = false;
  let closePending = false;
  window.on("close", (event) => {
    if (allowClose || isSmokeTest) return;
    event.preventDefault();
    if (closePending) return;
    closePending = true;
    void confirmWindowLeave(window).then((allowed) => {
      if (!allowed) { quitRequested = false; return; }
      allowClose = true;
      if (quitRequested) app.quit();
      else window.close();
    }).catch(() => { quitRequested = false; }).finally(() => { closePending = false; });
  });
  window.webContents.on("will-prevent-unload", (event) => {
    if (allowClose) { event.preventDefault(); return; }
    const choice = dialog.showMessageBoxSync(window, {
      type: "question", title: "Frame Lab", message: "Leave without saving your latest changes?",
      buttons: ["Stay", "Discard changes"], defaultId: 0, cancelId: 0, noLink: true
    });
    if (choice === 1) event.preventDefault();
  });
  window.once("ready-to-show", () => {
    if (!isSmokeTest) window.show();
  });
  window.webContents.on("did-fail-load", (_event, code, description) => {
    console.error(`Frame Lab failed to load (${code}): ${description}`);
  });
  window.webContents.once("did-finish-load", () => {
    if (isSmokeTest) void runSmokeCheck(window);
    else if (isUiPreview) void prepareUiPreview(window);
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
      submenu: [
        { label: "Restore from backup…", click: async () => {
          if (!mainWindow || mainWindow.isDestroyed()) return;
          try {
            await mainWindow.webContents.executeJavaScript("window.frameLabDesktopSession?.openBackups()", true);
          } catch (error) {
            await dialog.showMessageBox(mainWindow, { type: "error", title: "Frame Lab", message: "Could not open backups.", detail: error.message });
          }
        } },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" }
      ]
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
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: async () => {
          if (mainWindow && await confirmWindowLeave(mainWindow)) mainWindow.webContents.reload();
        } },
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

if (!isIsolatedRun && !app.requestSingleInstanceLock()) {
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
  quitRequested = true;
});

app.on("will-quit", () => {
  frameLabServer?.close();
});
