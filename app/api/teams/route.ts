import { NextRequest } from "next/server";
import { createTeam, getTeams } from "@/repositories/team.repository";
import { ok, fail, handleError } from "@/lib/api";
import { teamErrorResponse } from "@/lib/team-api";
import { getSession } from "@/lib/auth";
import { teamSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getTeams());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = teamSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await createTeam(parsed.data, session?.email ?? "System");
    return typeof result === "string" ? teamErrorResponse(result) : ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
