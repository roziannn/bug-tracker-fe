import { defaultMenus, type MenuNode } from "@/features/settings/data/access-catalog";

const STORAGE_KEY = "bug-tracker:menus";

export function loadMenus(): MenuNode[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw
      ? (JSON.parse(raw) as Partial<MenuNode>[]).map((menu) => ({
          ...menu,
          path: menu.path ?? "",
          icon: menu.icon ?? "Circle",
          visible: menu.visible ?? true,
        })) as MenuNode[]
      : defaultMenus;
  } catch {
    return defaultMenus;
  }
}

export function saveMenus(menus: MenuNode[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
  } catch {
    // storage unavailable; changes stay in memory only
  }
}

/** Parent menus first, each followed by its sub menus. */
export function orderMenus(menus: MenuNode[]) {
  const parents = menus.filter((menu) => !menu.parentId);
  return parents.flatMap((parent) => [
    { menu: parent, depth: 0 },
    ...menus.filter((menu) => menu.parentId === parent.id).map((menu) => ({ menu, depth: 1 })),
  ]);
}

export function slugify(label: string) {
  return `${label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
}
