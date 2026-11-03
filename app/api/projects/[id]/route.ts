import { NextRequest } from "next/server";
import { getProjectDetail } from "@/repositories/project.repository";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// :id adalah NewId (GUID) project.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    if (!GUID.test(id)) return fail("Project not found", 404);

    const project = await getProjectDetail(id);
    return project ? ok(project) : fail("Project not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
