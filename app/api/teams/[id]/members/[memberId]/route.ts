import { NextRequest } from "next/server";
import { setTeamMemberActive, updateTeamMember } from "@/repositories/team.repository";
import { ok, fail, handleError, isGuid, parseId } from "@/lib/api";
import { memberErrorResponse } from "@/lib/team-api";
import { getSession } from "@/lib/auth";
import { teamActiveSchema, updateTeamMemberSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; memberId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id, memberId: rawMemberId } = await params;
    const memberId = parseId(rawMemberId);
    if (!isGuid(id)) return fail("Group team not found", 404);
    if (!memberId) return fail("Invalid id", 400);

    const parsed = updateTeamMemberSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateTeamMember(id, memberId, parsed.data, session?.email ?? "System");
    return typeof result === "string" ? memberErrorResponse(result) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}

// Dipakai untuk switch aktif / nonaktif.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id, memberId: rawMemberId } = await params;
    const memberId = parseId(rawMemberId);
    if (!isGuid(id)) return fail("Group team not found", 404);
    if (!memberId) return fail("Invalid id", 400);

    const parsed = teamActiveSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("isActive must be true or false", 400);

    const session = await getSession();
    const result = await setTeamMemberActive(id, memberId, parsed.data.isActive, session?.email ?? "System");
    return typeof result === "string" ? memberErrorResponse(result) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}
