import { NextRequest } from "next/server";
import { fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getServiceRequestAttachment } from "@/repositories/service-request.repository";

type Params = { params: Promise<{ id: string; attachmentId: string }> };
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    if (!await getSession()) return fail("Unauthorized", 401);
    const { id, attachmentId } = await params;
    const fileId = Number(attachmentId);
    if (!GUID.test(id) || !Number.isInteger(fileId) || fileId < 1) return fail("Attachment not found", 404);
    const file = await getServiceRequestAttachment(id, fileId);
    if (!file?.Content) return fail("Attachment not found", 404);
    return new Response(new Blob([Uint8Array.from(file.Content)]), { headers: { "Content-Type": file.MimeType || "application/octet-stream", "Content-Length": String(file.Size), "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.Name)}`, "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return handleError(error); }
}
