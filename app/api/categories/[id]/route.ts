import { NextRequest } from "next/server";
import {
  deleteCategoryItem,
  getCategoryItemById,
  setCategoryItemActive,
  updateCategoryItem,
} from "@/repositories/category.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { categoryActiveSchema, categorySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const item = await getCategoryItemById(id);
    return item ? ok(item) : fail("Category item not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const parsed = categorySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateCategoryItem(id, parsed.data, session?.email ?? "System");
    if (result === "not-found") return fail("Category item not found", 404);
    if (result === "name-taken") return fail(`"${parsed.data.name}" already exists in this category`, 409);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

// Dipakai untuk switch aktif / nonaktif.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const parsed = categoryActiveSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("isActive must be true or false", 400);

    const session = await getSession();
    const result = await setCategoryItemActive(id, parsed.data.isActive, session?.email ?? "System");
    return result === "not-found" ? fail("Category item not found", 404) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    return (await deleteCategoryItem(id)) ? ok({ ok: true }) : fail("Category item not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
