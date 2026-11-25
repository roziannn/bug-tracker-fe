import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { parseDateOnly } from "@/lib/date";
import { notifyServiceRequestPic } from "@/lib/services/service-request-notification.service";
import { listServiceRequests, createServiceRequest, SERVICE_REQUEST_PRIORITIES, SERVICE_REQUEST_TYPES } from "@/repositories/service-request.repository";

export const dynamic = "force-dynamic";

function hasText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim().length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    return ok(await listServiceRequests({ status: params.get("status") ?? undefined, priority: params.get("priority") ?? undefined, projectId: params.get("projectId") ?? undefined }));
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !["Draft", "Submitted"].includes(body.status)) return fail("Invalid service request status", 400);
    if (!SERVICE_REQUEST_TYPES.includes(body.type) || !SERVICE_REQUEST_PRIORITIES.includes(body.priority)) return fail("Invalid request type or priority", 400);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const businessJustification = typeof body.businessJustification === "string" ? body.businessJustification.trim() : "";
    if (title.length > 255 || description.length > 10000 || businessJustification.length > 5000) return fail("One or more fields exceed the allowed length", 400);
    if (body.status === "Submitted" && (!title || !hasText(description) || !hasText(businessJustification) || !body.projectId)) return fail("Complete the required fields before submitting", 400);
    if (body.requestedTargetDate && (typeof body.requestedTargetDate !== "string" || parseDateOnly(body.requestedTargetDate) === null)) return fail("Requested target date is invalid", 400);
    const attachments: { name: string; size: number; mimeType?: string; contentBase64?: string }[] = [];
    if (Array.isArray(body.attachments)) {
      for (const file of body.attachments.slice(0, 20)) {
        if (typeof file !== "object" || file === null || typeof file.name !== "string" || file.name.length > 255 || !Number.isInteger(file.size) || file.size < 0 || file.size > 5 * 1024 * 1024 || typeof file.contentBase64 !== "string") return fail("Attachments must be under 5 MB each and include their file data", 400);
        attachments.push({ name: file.name, size: file.size, mimeType: typeof file.mimeType === "string" ? file.mimeType.slice(0, 150) : "", contentBase64: file.contentBase64 });
      }
    }
    if (attachments.reduce((total, file) => total + file.size, 0) > 15 * 1024 * 1024) return fail("Attachments must total 15 MB or less", 400);
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const picId = Number.isInteger(body.picId) ? body.picId : null;
    const result = await createServiceRequest({
      title, description, type: body.type, priority: body.priority,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      picId,
      businessJustification,
      requestedTargetDate: typeof body.requestedTargetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.requestedTargetDate) ? body.requestedTargetDate : null,
      estimatedEffort: typeof body.estimatedEffort === "string" ? body.estimatedEffort.slice(0, 100) : "",
      status: body.status, attachments,
    }, session.userId, session.name, session.email);
    if ("error" in result) return fail(result.error ?? "Unable to create request", 400);
    if (body.status === "Submitted" && picId) await notifyServiceRequestPic(result.id, picId, session.name);
    return ok(result, 201);
  } catch (error) { return handleError(error); }
}
