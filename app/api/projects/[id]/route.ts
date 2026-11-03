import { NextRequest } from "next/server";
import { getProjectDetail, updateProject } from "@/repositories/project.repository";
import { ok, fail, handleError } from "@/lib/api";
import { projectErrorResponse } from "@/lib/project-api";
import { getSession } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

// :id adalah NewId (GUID) project.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!GUID.test(id)) return fail("Project not found", 404);

    const project = await getProjectDetail(id);
    return project ? ok(project) : fail("Project not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

// Isi body sama dengan POST /api/projects. Phase, tag, repository, dan URL environment diganti sesuai kiriman.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!GUID.test(id)) return fail("Project not found", 404);

    const parsed = createProjectSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateProject(id, parsed.data, session?.email ?? "System");

    if ("error" in result) return projectErrorResponse(result.error, parsed.data.name);
    return ok(result.project);
  } catch (err) {
    return handleError(err);
  }
}
