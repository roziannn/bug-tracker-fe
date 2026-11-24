import { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addServiceRequestAttachments } from "@/repositories/service-request.repository";

export const dynamic = "force-dynamic";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const id = (await params).id;
    const body = await request.json().catch(() => null);
    if (!GUID.test(id) || !body || !Array.isArray(body.attachments) || body.attachments.length === 0 || body.attachments.length > 20) return fail("Invalid attachments", 400);
    const attachments: { name: string; size: number; mimeType?: string; contentBase64?: string }[] = [];
    for (const file of body.attachments) {
      if (!file || typeof file !== "object" || typeof file.name !== "string" || file.name.length > 255 || !Number.isInteger(file.size) || file.size < 0 || file.size > 5 * 1024 * 1024 || typeof file.contentBase64 !== "string") return fail("Attachments must be under 5 MB each and include their file data", 400);
      attachments.push({ name: file.name, size: file.size, mimeType: typeof file.mimeType === "string" ? file.mimeType.slice(0, 150) : "", contentBase64: file.contentBase64 });
    }
    if (attachments.reduce((sum, file) => sum + file.size, 0) > 15 * 1024 * 1024) return fail("Attachments must total 15 MB or less", 400);
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const result = await addServiceRequestAttachments(id, attachments, session.name, session.email);
    if (result === "not-found") return fail("Service request not found", 404);
    if (result === "attachment-limits") return fail("Requests can have up to 20 attachments and 15 MB total", 400);
    return ok({ uploaded: attachments.length }, 201);
  } catch (error) { return handleError(error); }
}
