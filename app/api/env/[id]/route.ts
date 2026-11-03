import { NextRequest } from "next/server";
import { deleteEnvVar, getEnvVarById, updateEnvVar } from "@/repositories/env.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { updateEnvVarSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const item = await getEnvVarById(id);
    return item ? ok(item) : fail("Variable not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const parsed = updateEnvVarSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateEnvVar(id, parsed.data, session?.email ?? "System");
    if (result === "not-found") return fail("Variable not found", 404);
    if (result === "key-taken") return fail(`Key ${parsed.data.key} already exists in this environment`, 409);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    return (await deleteEnvVar(id)) ? ok({ ok: true }) : fail("Variable not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
