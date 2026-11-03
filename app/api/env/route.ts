import { NextRequest } from "next/server";
import { createEnvVar, getEnvVars } from "@/repositories/env.repository";
import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createEnvVarSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getEnvVars());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createEnvVarSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await createEnvVar(parsed.data, session?.email ?? "System");
    if (result === "key-taken") return fail(`Key ${parsed.data.key} already exists in ${parsed.data.environment}`, 409);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
