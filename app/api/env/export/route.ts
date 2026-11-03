import { NextRequest } from "next/server";
import { exportEnv } from "@/repositories/env.repository";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Isi .env satu environment (termasuk secret). Dipakai tombol "Copy .env".
export async function GET(req: NextRequest) {
  try {
    const environment = req.nextUrl.searchParams.get("environment")?.trim();
    if (!environment) return fail("environment is required", 400);

    return ok({ text: await exportEnv(environment) });
  } catch (err) {
    return handleError(err);
  }
}
