import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getServiceRequest, SERVICE_REQUEST_STATUSES, updateServiceRequestDraft, updateServiceRequestStatus, SERVICE_REQUEST_PRIORITIES, SERVICE_REQUEST_TYPES } from "@/repositories/service-request.repository";
import { parseDateOnly } from "@/lib/date";

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
    if (!GUID.test(id) || !body) return fail("Invalid service request update", 400);
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    if (body.draftAction === "save" || body.draftAction === "submit") {
      if (!SERVICE_REQUEST_TYPES.includes(body.type) || !SERVICE_REQUEST_PRIORITIES.includes(body.priority)) return fail("Invalid request type or priority", 400);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const businessJustification = typeof body.businessJustification === "string" ? body.businessJustification.trim() : "";
      if (title.length > 255 || description.length > 10000 || businessJustification.length > 5000) return fail("One or more fields exceed the allowed length", 400);
      if (body.requestedTargetDate && (typeof body.requestedTargetDate !== "string" || parseDateOnly(body.requestedTargetDate) === null)) return fail("Requested target date is invalid", 400);
      const attachments: { name: string; size: number; mimeType?: string; contentBase64?: string }[] = [];
      if (!Array.isArray(body.attachments) || body.attachments.length > 20) return fail("Invalid attachments", 400);
      for (const file of body.attachments) {
        if (!file || typeof file !== "object" || typeof file.name !== "string" || file.name.length > 255 || !Number.isInteger(file.size) || file.size < 0 || file.size > 5 * 1024 * 1024 || typeof file.contentBase64 !== "string") return fail("Attachments must be under 5 MB each and include their file data", 400);
        attachments.push({ name: file.name, size: file.size, mimeType: typeof file.mimeType === "string" ? file.mimeType.slice(0, 150) : "", contentBase64: file.contentBase64 });
      }
      const keptAttachmentIds = Array.isArray(body.keptAttachmentIds) && body.keptAttachmentIds.every(Number.isInteger) ? body.keptAttachmentIds : [];
      if (attachments.reduce((total, file) => total + file.size, 0) > 15 * 1024 * 1024) return fail("Attachments must total 15 MB or less", 400);
      const result = await updateServiceRequestDraft(id, session.userId, {
        title, description, type: body.type, priority: body.priority,
        projectId: typeof body.projectId === "string" ? body.projectId : null,
        picId: Number.isInteger(body.picId) ? body.picId : null,
        businessJustification,
        requestedTargetDate: typeof body.requestedTargetDate === "string" ? body.requestedTargetDate : null,
        estimatedEffort: typeof body.estimatedEffort === "string" ? body.estimatedEffort.slice(0, 100) : "",
        status: "Draft", attachments,
      }, keptAttachmentIds, body.draftAction === "submit", session.name, session.email);
      if (result === "not-found") return fail("Service request not found", 404);
      if (result === "not-editable") return fail("Only your own draft requests can be edited", 403);
      if (result === "project-not-found") return fail("Project not found", 400);
      if (result === "pic-not-found") return fail("PIC not found", 400);
      if (result === "missing-fields") return fail("Complete the required fields before submitting", 400);
      return ok({ updated: true });
    }
    if (!SERVICE_REQUEST_STATUSES.includes(body.status)) return fail("Invalid service request update", 400);
    if (body.status === "Returned" && (typeof body.reviewComment !== "string" || !body.reviewComment.trim())) return fail("A reason is required when returning a service request", 400);
    const result = await updateServiceRequestStatus(id, body.status, typeof body.reviewComment === "string" ? body.reviewComment.slice(0, 5000) : "", session.name, session.email);
    if (result === "not-found") return fail("Service request not found", 404);
    if (result === "invalid-transition") return fail("This status transition is not allowed", 400);
    if (result === "missing-fields") return fail("Complete the required fields before submitting", 400);
    return ok({ updated: true });
  } catch (error) { return handleError(error); }
}
