const assert = require('node:assert/strict');
const { app, BrowserWindow, session } = require('electron');
const { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { tmpdir } = require('node:os');
const { pathToFileURL } = require('node:url');
const root = dirname(__dirname);
const temporary = mkdtempSync(join(tmpdir(), 'frame-lab-workflow-test-'));
const data = join(temporary, 'data');
const downloads = join(temporary, 'downloads');
mkdirSync(data);
mkdirSync(downloads);
copyFileSync(join(root, 'seed/frame-lab-db.json'), join(data, 'frame-lab-db.json'));
process.env.FRAME_LAB_DATA_DIR = data;
process.env.FRAME_LAB_DESKTOP = '1';
app.setPath('userData', join(temporary, 'userData'));
let window;
let server;

async function evaluate(code) {
  return window.webContents.executeJavaScript(`(async () => {
    const waitFor = async (condition) => {
      const start = Date.now();
      while (!(await condition())) {
        if (Date.now() - start > 30000) throw new Error('UI condition timed out');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    };
    const nameProject = (name) => { const field = document.querySelector('#designName'); field.value = name; field.dispatchEvent(new Event('input', { bubbles: true })); };
    const localState = async () => (await fetch('/api/desktop/state')).json();
    ${code}
  })()`, true);
}

async function download(id) {
  const pending = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Export timed out: ${id}`)), 45000);
    session.defaultSession.once('will-download', (_event, item) => {
      const path = join(downloads, item.getFilename());
      item.setSavePath(path);
      item.once('done', (_event, state) => {
        clearTimeout(timer);
        state === 'completed' ? resolve(path) : reject(new Error(`Export ${state}`));
      });
    });
  });
  await evaluate(`document.getElementById(${JSON.stringify(id)}).click();`);
  return pending;
}

async function checkCreatorLayout() {
  for (const [width, height, zoom] of [[1440, 908, 1], [1280, 768, 1], [1024, 668, 1], [1024, 668, 1.25]]) {
    window.setContentSize(width, height);
    window.webContents.setZoomFactor(zoom);
    for (const mode of ['front', 'left-temple', 'assembly']) {
      const layout = await evaluate(`
        await waitFor(() => Math.abs(innerWidth - ${width / zoom}) < 2);
        document.querySelector('[data-design-tab="${mode}"]').click();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const box = selector => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const toolbar = document.querySelector('#designStageTools');
        const bounds = box('#designStageTools');
        const controls = [...toolbar.querySelectorAll('button, label, input')].filter(element => element.getClientRects().length);
        const canvas = document.querySelector('${mode === 'assembly' ? '#designScene' : '#designSketchCanvas'}');
        return {
          switch: box('.design-view-switch'), toolbar: bounds,
          appHeader: box('#desktopHeader'), back: box('#desktopBackToProjects'),
          workspaceHeadingRemoved: !document.querySelector('.design-stage-header'),
          saveStatusHidden: !document.querySelector('#desktopSaveState').getClientRects().length,
          planDotRemoved: !document.querySelector('#desktopPlanBadge > span'),
          brandIconLoaded: document.querySelector('#desktopBrandHome img')?.naturalWidth > 0,
          fitWarningsRemoved: !document.querySelector('#designWarnings') && !document.body.innerText.includes('Fit warnings'),
          stage: box('.design-stage'), viewport: box('.design-stage-viewport'),
          footerRemoved: !document.querySelector('.design-stage-footer'),
          overflow: toolbar.scrollWidth - toolbar.clientWidth,
          sidebarOverflow: document.querySelector('.design-sidebar').scrollWidth - document.querySelector('.design-sidebar').clientWidth,
          controlsFit: controls.every(element => { const rect = element.getBoundingClientRect(); return rect.left >= bounds.left && rect.right <= bounds.right + 1 && rect.top >= bounds.top && rect.bottom <= bounds.bottom + 1; }),
          canvasWidth: canvas.width, displayedCanvasWidth: canvas.getBoundingClientRect().width * devicePixelRatio
        };
      `);
      const context = `${width}×${height} at ${zoom * 100}% / ${mode}`;
      assert.ok(layout.toolbar.top >= layout.switch.bottom, `Toolbar overlaps the view switch: ${context}`);
      assert.ok(layout.toolbar.top - layout.appHeader.bottom <= 60 && Math.abs((layout.back.top + layout.back.bottom) / 2 - (layout.switch.top + layout.switch.bottom) / 2) <= 1, `Creator controls are too far from the app header: ${context}`);
      assert.ok(layout.workspaceHeadingRemoved && layout.saveStatusHidden && layout.planDotRemoved && layout.brandIconLoaded && layout.fitWarningsRemoved, `Interface cleanup is missing: ${context}`);
      assert.ok(layout.viewport.top >= layout.toolbar.bottom, `Controls overlap the canvas: ${context}`);
      assert.ok(layout.footerRemoved && Math.abs(layout.viewport.bottom - layout.stage.bottom) <= 1, `Removed status bar still occupies space: ${context}`);
      assert.ok(layout.toolbar.width >= layout.stage.width - 40, `Toolbar does not use the full stage width: ${context}`);
      assert.ok(layout.overflow <= 1 && layout.controlsFit, `Toolbar controls are clipped: ${context}`);
      assert.ok(layout.sidebarOverflow <= 1, `Sidebar controls are clipped: ${context}`);
      assert.ok(layout.viewport.height > 150, `Drawing viewport is too short: ${context}`);
      if (mode !== 'assembly') assert.ok(Math.abs(layout.canvasWidth - layout.displayedCanvasWidth) <= 2, `Sketch did not redraw after resizing: ${context}`);
      if (process.env.FRAME_LAB_QA_DIRECTORY) {
        await evaluate(`await new Promise(resolve => setTimeout(resolve, 220));`);
        mkdirSync(process.env.FRAME_LAB_QA_DIRECTORY, { recursive: true });
        writeFileSync(join(process.env.FRAME_LAB_QA_DIRECTORY, `creator-${width}-${zoom}-${mode}.png`), (await window.webContents.capturePage()).toPNG());
      }
    }
  }
  window.setContentSize(1440, 908);
  window.webContents.setZoomFactor(1);
  await evaluate(`document.querySelector('[data-design-tab="front"]').click(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));`);
}

app.whenReady().then(async () => {
  let failed = false;
  try {
    const { startFrameLabServer } = await import(pathToFileURL(join(root, 'web/server.js')).href);
    const { confirmWindowLeave } = await import(pathToFileURL(join(root, 'electron/window-guard.mjs')).href);
    const { unzipSync, strFromU8 } = await import(pathToFileURL(join(root, 'web/assets/vendor/fflate/browser.js')).href);
    const started = await startFrameLabServer({ listenPort: 0, listenHost: '127.0.0.1' });
    server = started.server;
    const iconResponse = await fetch(`${started.origin}/assets/frame-lab-icon.png`);
    assert.equal(iconResponse.status, 200);
    assert.deepEqual(Buffer.from(await iconResponse.arrayBuffer()), readFileSync(join(root, 'build/icon.png')), 'The interface must use the actual application icon.');
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => callback({ cancel: new URL(details.url).origin !== started.origin }));
    window = new BrowserWindow({ show: false, width: 1440, height: 940, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
    await window.loadURL(started.origin);
    await evaluate(`
      await waitFor(() => window.frameLabBoot?.ready);
      const field = document.querySelector('#desktopActivationCode'); field.value = '1847-2294-6103'; field.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#desktopActivateButton').click();
      await waitFor(() => document.querySelector('#desktopActivation').hidden);
      document.querySelector('#desktopHeroCreate').click();
      await waitFor(() => !document.querySelector('#designLab').hidden);
      nameProject('Workflow original');
      await window.frameLabDesktopSession.saveBeforeLeaving();
    `);
    const original = await evaluate(`return (await localState()).projects[0];`);
    const quickSwitch = await evaluate(`
      nameProject('Saved before quick switch');
      document.querySelector('#desktopBackToProjects').click();
      await waitFor(() => !document.querySelector('#desktopDashboard').hidden);
      document.querySelector('#desktopHeroCreate').click();
      await waitFor(() => document.querySelector('#designName').value.startsWith('Untitled'));
      return (await (await fetch('/api/desktop/projects/${original.id}')).json()).project.name;
    `);
    assert.equal(quickSwitch, 'Saved before quick switch');
    const inFlight = await evaluate(`
      const originalFetch = window.fetch;
      let firstSave = true;
      let releaseSave;
      const gate = new Promise(resolve => { releaseSave = resolve; });
      window.fetch = async (url, options) => {
        if (firstSave && String(url).endsWith('/api/desktop/projects') && options?.method === 'POST') {
          firstSave = false;
          await gate;
        }
        return originalFetch(url, options);
      };
      nameProject('First in-flight revision');
      const pending = window.frameLabDesktopSession.saveBeforeLeaving();
      await waitFor(() => !firstSave);
      nameProject('Edited during save');
      releaseSave();
      await pending;
      window.fetch = originalFetch;
      return { projects: (await localState()).projects, dirty: window.frameLabDesktopSession.hasUnsavedChanges() };
    `);
    assert.equal(inFlight.projects.length, 2, 'An in-flight first save must not create a duplicate.');
    assert.ok(inFlight.projects.some(project => project.name === 'Edited during save'));
    assert.equal(inFlight.dirty, false);
    await evaluate(`nameProject('Portable frame'); await window.frameLabDesktopSession.saveBeforeLeaving();`);
    const portablePath = await download('downloadDesignScad');
    assert.ok(portablePath.endsWith('.framelab'));
    const portable = JSON.parse(readFileSync(portablePath, 'utf8'));
    assert.equal(portable.format, 'frame-lab-project');
    assert.equal(portable.version, 1);
    assert.equal(portable.project.name, 'Portable frame');
    assert.ok(portable.project.draft.sketch.points.length);
    assert.equal(portable.license, undefined);
    const beforeImport = await evaluate(`return (await localState()).projects.length;`);
    await evaluate(`
      const transfer = new DataTransfer();
      transfer.items.add(new File([${JSON.stringify(JSON.stringify(portable))}], 'portable.framelab', { type: 'application/json' }));
      const input = document.querySelector('#desktopImportFile'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
      await waitFor(async () => (await localState()).projects.length === ${beforeImport + 1});
      await waitFor(() => document.querySelector('#desktopToast').textContent.includes('imported'));
    `);
    const imported = await evaluate(`const state = await localState(); return (await (await fetch('/api/desktop/projects/' + state.projects[0].id)).json()).project;`);
    assert.deepEqual(imported.draft, portable.project.draft);
    const exportedParts = unzipSync(readFileSync(await download('exportDesign3mf')));
    const modelFiles = Object.keys(exportedParts).filter(name => name.endsWith('.3mf'));
    assert.equal(modelFiles.length, 4);
    for (const file of modelFiles) {
      const contents = unzipSync(exportedParts[file]);
      const model = strFromU8(contents[Object.keys(contents).find(name => name.endsWith('.model'))]);
      assert.match(model, /<triangle\b/);
      assert.match(model, /unit="millimeter"/);
    }
    assert.ok(Object.keys(exportedParts).some(name => name.endsWith('.svg')));
    assert.equal(await evaluate(`return document.body.innerText.includes('OpenSCAD');`), false);

    // A failed save must not navigate away or clear the dirty state.
    await evaluate(`
      window.realFetch = window.fetch;
      window.fetch = (url, options) => String(url).endsWith('/api/desktop/projects') && options?.method === 'POST' ? Promise.resolve(new Response(JSON.stringify({ error: 'Simulated disk error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })) : window.realFetch(url, options);
      nameProject('Keep this unsaved work');
      document.querySelector('#desktopBackToProjects').click();
      await waitFor(() => document.querySelector('#desktopSaveState').textContent === 'Save failed');
    `);
    assert.equal(await evaluate(`return document.querySelector('#designLab').hidden;`), false);
    assert.equal(await evaluate(`return window.frameLabDesktopSession.hasUnsavedChanges();`), true);
    assert.match(await evaluate(`return document.querySelector('#desktopToast').textContent;`), /Simulated disk error/);
    const rescueCopy = JSON.parse(readFileSync(await download('downloadDesignScad'), 'utf8'));
    assert.equal(rescueCopy.project.name, 'Keep this unsaved work', 'A portable copy must work even when the library cannot save.');
    const cancelled = { showMessageBox: async () => ({ response: 2 }) };
    assert.equal(await confirmWindowLeave(window, cancelled), false);
    let errorDialogShown = false;
    const save = { showMessageBox: async (_window, options) => { if (options.type === 'error') errorDialogShown = true; return { response: 0 }; } };
    assert.equal(await confirmWindowLeave(window, save), false);
    assert.equal(errorDialogShown, true);
    await evaluate(`window.fetch = window.realFetch;`);
    assert.equal(await confirmWindowLeave(window, save), true);
    assert.equal(await evaluate(`return window.frameLabDesktopSession.hasUnsavedChanges();`), false);
    await evaluate(`nameProject('Discarded edit');`);
    assert.equal(await confirmWindowLeave(window, { showMessageBox: async () => ({ response: 1 }) }), true);

    // A new renderer reopens the saved project from disk, independently of its draft cache.
    await window.loadURL(started.origin);
    await evaluate(`
      await waitFor(() => window.frameLabBoot?.ready);
      if (document.querySelector('.desktop-local-pill').textContent.trim() !== 'Stored on this computer') throw new Error('Unexpected library status icon');
      if (document.querySelector('#desktopHeader').innerText.includes('Saved locally')) throw new Error('Save status is still visible in the header');
      const actions = [...document.querySelectorAll('.desktop-library-actions > button')].map(button => button.textContent.trim());
      if (JSON.stringify(actions) !== JSON.stringify(['＋ New Project', 'Import Project'])) throw new Error('Unexpected project actions: ' + actions.join(', '));
      if (document.querySelector('.desktop-navigation') || document.querySelector('#desktopBackups')) throw new Error('Old project navigation is still visible');
      const grid = document.querySelector('#desktopProjectsGrid');
      const originals = [...grid.children];
      for (let index = 0; index < 18; index += 1) grid.append(originals[index % originals.length].cloneNode(true));
      const dashboard = document.querySelector('#desktopDashboard');
      await new Promise(resolve => requestAnimationFrame(resolve));
      const beforeScroll = { clientHeight: dashboard.clientHeight, scrollHeight: dashboard.scrollHeight, bottom: dashboard.getBoundingClientRect().bottom };
      dashboard.scrollTop = dashboard.scrollHeight;
      await new Promise(resolve => requestAnimationFrame(resolve));
      const afterScroll = dashboard.scrollTop;
      [...grid.children].slice(originals.length).forEach(card => card.remove());
      dashboard.scrollTop = 0;
      if (!(beforeScroll.scrollHeight > beforeScroll.clientHeight && afterScroll > 0 && beforeScroll.bottom <= innerHeight + 1)) throw new Error('Project library does not scroll inside the window');
      const button = [...document.querySelectorAll('[data-desktop-project-action="open"]')].find(button => button.getAttribute('aria-label')?.includes('Keep this unsaved work'));
      if (!button) throw new Error('Saved project missing after restart');
      button.click();
      await waitFor(() => document.querySelector('#designName').value === 'Keep this unsaved work');
    `);
    assert.equal(await evaluate(`return window.frameLabDesktopSession.hasUnsavedChanges();`), false);
    await checkCreatorLayout();
    if (process.env.FRAME_LAB_QA_DIRECTORY) {
      const screenshots = process.env.FRAME_LAB_QA_DIRECTORY;
      mkdirSync(screenshots, { recursive: true });
      writeFileSync(join(screenshots, 'creator.png'), (await window.webContents.capturePage()).toPNG());
      await evaluate(`document.querySelector('#desktopBackToProjects').click(); await waitFor(() => !document.querySelector('#desktopDashboard').hidden);`);
      writeFileSync(join(screenshots, 'projects.png'), (await window.webContents.capturePage()).toPNG());
      await evaluate(`window.frameLabDesktopSession.openBackups(); await waitFor(() => document.querySelector('#desktopBackupsDialog').open);`);
      writeFileSync(join(screenshots, 'backups.png'), (await window.webContents.capturePage()).toPNG());
    }
    console.log('FRAME_LAB_PROJECT_WORKFLOW_OK quick-switch in-flight-edits import-export-roundtrip 3mf-export failed-save-stays-open close-save-discard-cancel reopen-from-disk scrolling-library two-project-actions creator-backup-nav responsive-toolbar clean-header app-icon no-fit-warning-card clean-canvas');
  } catch (error) {
    failed = true;
    console.error(error.stack || error);
  } finally {
    if (window) window.destroy();
    if (server) await new Promise(resolve => server.close(resolve));
    rmSync(temporary, { recursive: true, force: true });
    app.exit(failed ? 1 : 0);
  }
});
app.on('window-all-closed', () => {});
