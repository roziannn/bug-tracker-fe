import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { linkServiceRequestIssue } from "@/repositories/service-request.repository";

type Params = { params: Promise<{ id: string }> };
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!GUID.test(id)) return fail("Service request not found", 404);
    const body = await request.json().catch(() => null);
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    if (typeof body?.issueId !== "string") return fail("Issue is required", 400);
    const result = await linkServiceRequestIssue(id, body.issueId, session.name, session.email);
    if (result === "not-found") return fail("Service request or issue not found", 404);
    if (result === "exists") return fail("This issue is already linked", 409);
    return ok({ linked: true }, 201);
  } catch (error) { return handleError(error); }
}
