import { NextRequest } from "next/server";
import { addTeamMember, getTeamMembers } from "@/repositories/team.repository";
import { ok, fail, handleError, isGuid } from "@/lib/api";
import { memberErrorResponse } from "@/lib/team-api";
import { getSession } from "@/lib/auth";
import { createTeamMemberSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!isGuid(id)) return fail("Group team not found", 404);

    const result = await getTeamMembers(id);
    return typeof result === "string" ? memberErrorResponse(result) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!isGuid(id)) return fail("Group team not found", 404);

    const parsed = createTeamMemberSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await addTeamMember(id, parsed.data, session?.email ?? "System");
    return typeof result === "string" ? memberErrorResponse(result) : ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
