/**
 * ProjectState service — persistent storage for generated app files.
 *
 * Files are stored as JSON on the local file system under data/projects/.
 * Each project is a single JSON file named <projectId>.json.
 *
 * This module is only imported by server-side code (API routes).
 * It must never be imported by client components.
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectState = {
  /** Unique identifier for this project (UUID v4). */
  projectId: string;
  /** Map of filename → source code, e.g. { "App.js": "import React..." }. */
  files: Record<string, string>;
  /** ISO-8601 timestamp of the last save. */
  updatedAt: string;
};

// ─── Storage path ─────────────────────────────────────────────────────────────

/** Absolute path to the directory that holds project JSON files. */
const DATA_DIR = path.join(process.cwd(), 'data', 'projects');

/** Ensure the storage directory exists (creates it recursively if needed). */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Sanitize a projectId so it is safe to use as a file name.
 * Only alphanumerics, hyphens, and underscores are kept — this prevents
 * path-traversal attacks (e.g. "../../etc/passwd").
 */
function sanitizeId(projectId: string): string {
  return projectId.replace(/[^a-zA-Z0-9\-_]/g, '');
}

/** Return the full path for a project's JSON file. */
function projectFilePath(projectId: string): string {
  const safe = sanitizeId(projectId);
  if (!safe) throw new Error('Invalid projectId');
  return path.join(DATA_DIR, `${safe}.json`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load a project from disk.
 *
 * @returns The stored ProjectState, or `null` if the project does not exist
 *          or if the stored data is corrupt / unreadable.
 */
export function loadProject(projectId: string): ProjectState | null {
  try {
    ensureDataDir();
    const filePath = projectFilePath(projectId);

    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as ProjectState;

    // Basic sanity check — reject malformed data rather than crashing callers.
    if (!parsed.projectId || !parsed.files || typeof parsed.files !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    // Any I/O or parse error → treat as "project not found".
    return null;
  }
}

/**
 * Persist a project's files to disk, creating a new project if one does not
 * already exist.
 *
 * @param projectId - The project's unique identifier.
 * @param files     - Map of filename → source code to store.
 * @returns The saved ProjectState (including the updated timestamp).
 */
export function saveProject(
  projectId: string,
  files: Record<string, string>,
): ProjectState {
  ensureDataDir();

  const state: ProjectState = {
    projectId,
    files,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(projectFilePath(projectId), JSON.stringify(state, null, 2), 'utf-8');
  return state;
}

/**
 * Update (or create) a single file within an existing project.
 *
 * If the project does not yet exist on disk, it is created with just this
 * one file.  Existing files that are not mentioned are preserved.
 *
 * @param projectId - The project's unique identifier.
 * @param filePath  - The filename key, e.g. "App.js".
 * @param content   - The new file content.
 * @returns The updated ProjectState.
 */
export function updateFile(
  projectId: string,
  filePath: string,
  content: string,
): ProjectState {
  // Load existing files so we don't overwrite other files in the project.
  const existing = loadProject(projectId);
  const files: Record<string, string> = { ...(existing?.files ?? {}) };
  files[filePath] = content;
  return saveProject(projectId, files);
}

/**
 * Generate a new, unique project ID.
 * Exported so callers (API routes) can create IDs without importing `crypto`.
 */
export function generateProjectId(): string {
  return randomUUID();
}
