import type { MenuNode } from "@/features/settings/data/access-catalog";

export async function fetchMenus(): Promise<MenuNode[]> {
  const res = await fetch("/api/menus", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menus");
  return (await res.json()) as MenuNode[];
}

/** Each menu followed by its sub menus (any depth), with the nesting level as depth. */
export function orderMenus(menus: MenuNode[], parentId: string | null = null, depth = 0): { menu: MenuNode; depth: number }[] {
  return menus
    .filter((menu) => (menu.parentId ?? null) === parentId)
    .flatMap((menu) => [{ menu, depth }, ...orderMenus(menus, menu.id, depth + 1)]);
}

/** Ids of every sub menu below the given menu, at any depth. */
export function descendantIds(menus: MenuNode[], id: string): string[] {
  return menus.filter((menu) => menu.parentId === id).flatMap((menu) => [menu.id, ...descendantIds(menus, menu.id)]);
}

/** Readable trail such as "Settings › Kategori". */
export function menuTrail(menus: MenuNode[], id: string): string {
  const menu = menus.find((item) => item.id === id);
  if (!menu) return "";
  return menu.parentId ? `${menuTrail(menus, menu.parentId)} › ${menu.label}` : menu.label;
}

/**
 * Untuk menggambar garis pohon: satu nilai per tingkat (dari tingkat 1 sampai menu itu sendiri),
 * true kalau menu di tingkat itu adalah anak terakhir dari parent-nya.
 */
export function treeGuides(menus: MenuNode[], menu: MenuNode): boolean[] {
  const guides: boolean[] = [];
  let current: MenuNode | undefined = menu;

  while (current?.parentId) {
    const siblings = menus.filter((item) => item.parentId === current!.parentId);
    guides.unshift(siblings[siblings.length - 1]?.id === current.id);
    current = menus.find((item) => item.id === current!.parentId);
  }
  return guides;
}
