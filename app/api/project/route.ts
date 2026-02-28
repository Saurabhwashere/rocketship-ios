/**
 * /api/project — REST endpoint for reading and writing project state.
 *
 * GET  /api/project?projectId=<id>
 *   Returns the stored ProjectState for the given ID, or 404 if not found.
 *
 * POST /api/project
 *   Body: { projectId?: string; files: Record<string, string> }
 *   Saves the provided files under the given projectId (or a newly generated
 *   one if omitted).  Returns the saved ProjectState including the projectId.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  loadProject,
  saveProject,
  generateProjectId,
  type ProjectState,
} from '@/lib/projectState';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId query parameter is required' },
      { status: 400 },
    );
  }

  const project = loadProject(projectId);

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 },
    );
  }

  return NextResponse.json({ project });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

type SaveProjectBody = {
  /** Existing project ID to update.  If omitted, a new UUID is generated. */
  projectId?: string;
  /** Map of filename → source code to persist. */
  files: Record<string, string>;
};

export async function POST(request: NextRequest) {
  let body: SaveProjectBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { files } = body;

  // Validate that files is present and is a plain object.
  if (!files || typeof files !== 'object' || Array.isArray(files)) {
    return NextResponse.json(
      { error: 'Request body must include a "files" object' },
      { status: 400 },
    );
  }

  // Use the provided projectId or generate a fresh one.
  const projectId: string = body.projectId?.trim() || generateProjectId();

  const project: ProjectState = saveProject(projectId, files);

  return NextResponse.json({ project }, { status: 200 });
}
