import { getEnvironmentNames } from "@/repositories/env.repository";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Hanya nama environment, tanpa isi variable. Dipakai form yang butuh pilihan environment.
export async function GET() {
  try {
    return ok(await getEnvironmentNames());
  } catch (err) {
    return handleError(err);
  }
}
