import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getServiceRequest, SERVICE_REQUEST_STATUSES, updateServiceRequestStatus } from "@/repositories/service-request.repository";

export const dynamic = "force-dynamic";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    if (!GUID.test(id)) return fail("Service request not found", 404);
    const item = await getServiceRequest(id);
    return item ? ok(item) : fail("Service request not found", 404);
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    const body = await request.json().catch(() => null);
    if (!GUID.test(id) || !body || !SERVICE_REQUEST_STATUSES.includes(body.status)) return fail("Invalid service request update", 400);
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const result = await updateServiceRequestStatus(id, body.status, typeof body.reviewComment === "string" ? body.reviewComment.slice(0, 5000) : "", session.name, session.email);
    if (result === "not-found") return fail("Service request not found", 404);
    if (result === "invalid-transition") return fail("This status transition is not allowed", 400);
    if (result === "missing-fields") return fail("Complete the required fields before submitting", 400);
    return ok({ updated: true });
  } catch (error) { return handleError(error); }
}
