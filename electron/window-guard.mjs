import { dialog } from "electron";

function rendererCall(window, expression, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The project did not respond. Your window has been kept open.")), timeout);
    window.webContents.executeJavaScript(expression, true).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export async function confirmWindowLeave(window, dialogs = dialog) {
  let dirty = true;
  try {
    dirty = await rendererCall(window, "Boolean(window.frameLabDesktopSession?.hasUnsavedChanges())", 5000);
  } catch { /* Ask before closing an unresponsive window. */ }
  if (!dirty) return true;
  const { response } = await dialogs.showMessageBox(window, {
    type: "question",
    title: "Frame Lab",
    message: "Save your project before leaving?",
    detail: "Your latest changes have not finished saving.",
    buttons: ["Save changes", "Discard changes", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  });
  if (response === 2) return false;
  if (response === 1) {
    try { await rendererCall(window, "window.frameLabDesktopSession?.discardPendingChanges()", 1000); } catch { /* Explicit discard permits closing. */ }
    return true;
  }
  try {
    const saved = await rendererCall(window, "window.frameLabDesktopSession?.saveBeforeLeaving() ?? false");
    if (saved) return true;
  } catch { /* Display a clear failure instead of losing work. */ }
  await dialogs.showMessageBox(window, {
    type: "error", title: "Frame Lab", message: "The project could not be saved.",
    detail: "Your project is still open. Please retry saving before closing Frame Lab."
  });
  return false;
}
