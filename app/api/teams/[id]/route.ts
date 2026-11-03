import { NextRequest } from "next/server";
import { getTeamByNewId, setTeamActive, updateTeam } from "@/repositories/team.repository";
import { ok, fail, handleError, isGuid } from "@/lib/api";
import { teamErrorResponse } from "@/lib/team-api";
import { getSession } from "@/lib/auth";
import { teamActiveSchema, teamSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// :id adalah NewId (GUID) group team.
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!isGuid(id)) return fail("Group team not found", 404);

    const team = await getTeamByNewId(id);
    return team ? ok(team) : fail("Group team not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!isGuid(id)) return fail("Group team not found", 404);

    const parsed = teamSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateTeam(id, parsed.data, session?.email ?? "System");
    return typeof result === "string" ? teamErrorResponse(result) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}

// Dipakai untuk switch aktif / nonaktif.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!isGuid(id)) return fail("Group team not found", 404);

    const parsed = teamActiveSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("isActive must be true or false", 400);

    const session = await getSession();
    const result = await setTeamActive(id, parsed.data.isActive, session?.email ?? "System");
    return result === "not-found" ? teamErrorResponse(result) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}
