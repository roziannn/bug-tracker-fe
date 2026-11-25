import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addServiceRequestComment } from "@/repositories/service-request.repository";
import { notifyServiceRequestDiscussion } from "@/lib/services/service-request-notification.service";

type Params = { params: Promise<{ id: string }> };
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!GUID.test(id)) return fail("Service request not found", 404);
    const body = await request.json().catch(() => null);
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    if (!body || typeof body.body !== "string" || !body.body.trim() || body.body.length > 5000) return fail("Comment is required and must be under 5000 characters", 400);
    const parentId = body.parentCommentId == null ? null : Number(body.parentCommentId);
    if (parentId !== null && !Number.isInteger(parentId)) return fail("Invalid reply target", 400);
    const result = await addServiceRequestComment(id, parentId, body.body.trim(), session.userId, session.name, session.email);
    if (result === "not-found") return fail("Service request not found", 404);
    if (result === "invalid-parent") return fail("Invalid comment to reply to", 400);
    await notifyServiceRequestDiscussion(id, session.userId, session.name, body.body.trim());
    return ok({ created: true }, 201);
  } catch (error) { return handleError(error); }
}
