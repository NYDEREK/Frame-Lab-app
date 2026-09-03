import { closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// The primary file is replaced atomically. Backups never include a partly written file.
export function createLocalDatabase({ directory, createDefault, normalize }) {
  const primary = join(directory, "frame-lab-db.json");
  const previous = join(directory, "frame-lab-db.last-good.json");
  const backupDirectory = join(directory, "backups");
  const snapshotPattern = /^snapshot-\d{13}-[a-f0-9]{8}\.json$/;
  let recoveryMessage = "";

  function decode(path) {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid library file.");
    if (value.desktop === undefined && !Array.isArray(value.collections)) throw new Error("Incomplete library file.");
    for (const field of ["users", "collections", "components"]) {
      if (value[field] !== undefined && !Array.isArray(value[field])) throw new Error("Invalid library data.");
    }
    if (value.desktop !== undefined) {
      if (!value.desktop || !Array.isArray(value.desktop.projects) || !Array.isArray(value.desktop.activationHistory)) throw new Error("Invalid local library.");
      if (value.desktop.projects.some(project => !project || typeof project.id !== "string" || !project.draft || typeof project.draft !== "object" || Array.isArray(project.draft))) throw new Error("Invalid project data.");
      if (new Set(value.desktop.projects.map(project => project.id)).size !== value.desktop.projects.length) throw new Error("Duplicate project identifiers.");
    }
    return normalize(value);
  }

  function atomicWrite(path, text) {
    const temporary = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    const descriptor = openSync(temporary, "wx", 0o600);
    try {
      writeFileSync(descriptor, text, "utf8");
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
    renameSync(temporary, path);
  }

  function snapshotNames() {
    if (!existsSync(backupDirectory)) return [];
    return readdirSync(backupDirectory).filter(name => snapshotPattern.test(name)).sort().reverse();
  }

  function backupPaths() {
    return [previous, ...snapshotNames().map(name => join(backupDirectory, name))].filter(existsSync);
  }

  function read() {
    mkdirSync(directory, { recursive: true });
    if (existsSync(primary)) {
      try { return decode(primary); } catch { /* Recover from a validated copy below. */ }
    } else if (!backupPaths().length) {
      const initial = createDefault();
      atomicWrite(primary, JSON.stringify(initial, null, 2));
      return initial;
    }
    for (const candidate of backupPaths()) {
      let recovered;
      try { recovered = decode(candidate); } catch { continue; }
      if (existsSync(primary)) {
        const recoveryDirectory = join(directory, "recovery");
        mkdirSync(recoveryDirectory, { recursive: true });
        copyFileSync(primary, join(recoveryDirectory, `unreadable-${Date.now()}-${randomBytes(4).toString("hex")}.json`));
      }
      atomicWrite(primary, JSON.stringify(recovered, null, 2));
      recoveryMessage = "Your library was recovered from an automatic backup. The original file was kept for support.";
      return recovered;
    }
    throw new Error("Your local library could not be read. No data was overwritten. Please contact support before resetting the application.");
  }

  function write(value, { snapshot = false } = {}) {
    mkdirSync(directory, { recursive: true });
    const text = JSON.stringify(normalize(value), null, 2);
    if (existsSync(primary)) {
      // Refuse to overwrite unreadable data; read() must recover it first.
      decode(primary);
      const oldText = readFileSync(primary, "utf8");
      if (oldText === text) return;
      const snapshots = snapshotNames();
      const latestTime = snapshots[0] ? Number(snapshots[0].split("-")[1]) : 0;
      if (snapshot || Date.now() - latestTime >= 30 * 60 * 1000) {
        mkdirSync(backupDirectory, { recursive: true });
        atomicWrite(join(backupDirectory, `snapshot-${Date.now()}-${randomBytes(4).toString("hex")}.json`), oldText);
        // Only this module's own generated snapshots are rotated.
        for (const name of snapshotNames().slice(12)) unlinkSync(join(backupDirectory, name));
      }
    }
    atomicWrite(primary, text);
    atomicWrite(previous, text);
  }

  function getBackup(id) {
    const path = id === "last-good" ? previous : snapshotPattern.test(String(id)) ? join(backupDirectory, id) : "";
    if (!path || !existsSync(path)) throw new Error("Backup not found.");
    return decode(path);
  }

  function listBackups() {
    return ["last-good", ...snapshotNames()].flatMap(id => {
      try {
        const backup = getBackup(id);
        const path = id === "last-good" ? previous : join(backupDirectory, id);
        return [{ id, savedAt: statSync(path).mtime.toISOString(), projectCount: backup.desktop.projects.length }];
      } catch { return []; }
    });
  }

  return { read, write, getBackup, listBackups, recoveryMessage: () => recoveryMessage };
}
