import { NextRequest } from "next/server";

import { fail, handleError, ok, parseId } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { parseDateOnly } from "@/lib/date";
import { updateProjectPhaseDates } from "@/repositories/project.repository";

export const dynamic = "force-dynamic";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const { id: projectId, phaseId: rawPhaseId } = await params;
    const phaseId = parseId(rawPhaseId);
    if (!GUID.test(projectId) || phaseId === null) return fail("Project phase not found", 404);

    const body = (await req.json().catch(() => null)) as { start?: unknown; end?: unknown } | null;
    const start = typeof body?.start === "string" ? body.start : "";
    const end = typeof body?.end === "string" ? body.end : "";
    const startDate = parseDateOnly(start);
    const endDate = parseDateOnly(end);
    if (startDate === null || endDate === null || endDate < startDate) {
      return fail("A phase end date must be on or after its start date", 400);
    }

    const session = await getSession();
    const updated = await updateProjectPhaseDates(projectId, phaseId, start, end, session?.email ?? "System");
    return updated ? ok({ id: phaseId, start, end }) : fail("Project phase not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
