import type { MenuNode } from "@/features/settings/data/access-catalog";

export async function fetchMenus(): Promise<MenuNode[]> {
  const res = await fetch("/api/menus", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load menus");
  return (await res.json()) as MenuNode[];
}

/** Parent menus first, each followed by its sub menus. */
export function orderMenus(menus: MenuNode[]) {
  const parents = menus.filter((menu) => !menu.parentId);
  return parents.flatMap((parent) => [
    { menu: parent, depth: 0 },
    ...menus.filter((menu) => menu.parentId === parent.id).map((menu) => ({ menu, depth: 1 })),
  ]);
}
