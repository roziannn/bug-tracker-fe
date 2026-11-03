import { NextRequest } from "next/server";
import { createCategoryItem, getCategoryItems } from "@/repositories/category.repository";
import { getCategoryConfig } from "@/features/settings/data/category-store";
import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// ?category=<slug>, contoh: /api/categories?category=audit-trail-outcome
export async function GET(req: NextRequest) {
  try {
    const config = getCategoryConfig(req.nextUrl.searchParams.get("category") ?? "");
    if (!config) return fail("Unknown category", 400);

    return ok(await getCategoryItems(config.title));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const config = getCategoryConfig(typeof body?.category === "string" ? body.category : "");
    if (!config) return fail("Unknown category", 400);

    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await createCategoryItem(config.title, parsed.data, session?.email ?? "System");
    if (result === "name-taken") return fail(`"${parsed.data.name}" already exists in ${config.title}`, 409);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
