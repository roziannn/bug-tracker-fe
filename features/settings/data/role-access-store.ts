import { accessCatalog } from "@/features/settings/data/access-catalog";

export type RoleAccess = {
  name: string;
  menus: string[];
  actions: string[];
};

const STORAGE_KEY = "bug-tracker:role-access";

const allMenus = accessCatalog.map((menu) => menu.id);
const allActions = accessCatalog.flatMap((menu) => menu.actions.map((action) => action.id));

export const defaultRoles: RoleAccess[] = [
  { name: "Admin", menus: allMenus, actions: allActions },
  {
    name: "Lead",
    menus: allMenus.filter((id) => id !== "settings"),
    actions: allActions.filter((id) => !id.startsWith("settings.")),
  },
  {
    name: "Engineer",
    menus: ["overview", "issues", "kanban", "projects"],
    actions: ["issues.create", "issues.edit", "issues.comment", "kanban.move"],
  },
  { name: "QA", menus: ["overview", "issues", "kanban"], actions: ["issues.create", "issues.comment"] },
];

export function loadRoles(): RoleAccess[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RoleAccess[]) : defaultRoles;
  } catch {
    return defaultRoles;
  }
}

export function saveRoles(roles: RoleAccess[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // storage unavailable; changes stay in memory only
  }
}
