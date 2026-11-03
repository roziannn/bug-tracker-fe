import { NextRequest } from "next/server";
import { createProject, getProjects } from "@/repositories/project.repository";
import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getProjects());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createProjectSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await createProject(parsed.data, session?.email ?? "System");

    if ("error" in result) {
      if (result.error === "name-taken") return fail(`A project named "${parsed.data.name}" already exists`, 409);
      if (result.error === "owner-not-found") return fail("Owner not found or inactive", 400);
      return fail("One or more tags are not valid Teams Domain values", 400);
    }
    return ok(result.project, 201);
  } catch (err) {
    return handleError(err);
  }
}
