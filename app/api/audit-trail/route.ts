import { handleError, ok } from "@/lib/api";
import { getAuditTrailEvents } from "@/repositories/audit-trail.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getAuditTrailEvents());
  } catch (err) {
    return handleError(err);
  }
}
