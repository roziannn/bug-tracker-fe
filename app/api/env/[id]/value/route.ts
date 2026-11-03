import { NextRequest } from "next/server";
import { getEnvValue } from "@/repositories/env.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";

export const dynamic = "force-dynamic";

// Nilai asli satu variabel (termasuk secret). Dipakai tombol mata di tabel.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const value = await getEnvValue(id);
    return value === null ? fail("Variable not found", 404) : ok({ value });
  } catch (err) {
    return handleError(err);
  }
}
