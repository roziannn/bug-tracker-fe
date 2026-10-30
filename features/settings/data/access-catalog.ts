export type MenuNode = {
  id: string;
  label: string;
  parentId: string | null;
  path: string;
  icon: string;
  visible: boolean;
  actions: { id: string; label: string }[];
  CreatedBy?: string | null;
  CreatedDate?: string;
};

const rootMenus = [
  { id: "overview", path: "/", icon: "Gauge", label: "Overview", actions: [] },
  {
    id: "issues", path: "/issues", icon: "CircleDot",
    label: "All Issues",
    actions: [
      { id: "issues.create", label: "Create issue" },
      { id: "issues.edit", label: "Edit issue" },
      { id: "issues.comment", label: "Comment" },
      { id: "issues.export", label: "Export" },
    ],
  },
  { id: "kanban", path: "/kanban", icon: "KanbanSquare", label: "Kanban", actions: [{ id: "kanban.move", label: "Move card" }] },
  {
    id: "teams", path: "/teams", icon: "Users",
    label: "Teams",
    actions: [
      { id: "teams.manage-groups", label: "Create / edit group" },
      { id: "teams.manage-members", label: "Add / edit member" },
    ],
  },
  {
    id: "projects", path: "/projects", icon: "FolderOpenDot",
    label: "Projects",
    actions: [
      { id: "projects.create", label: "Create project" },
      { id: "projects.export", label: "Export" },
    ],
  },
  { id: "audit-trail", path: "/audit-trail", icon: "FileSearch2", label: "Audit Trail", actions: [{ id: "audit-trail.export", label: "Export" }] },
  {
    id: "settings", path: "/settings/role", icon: "Settings",
    label: "Settings",
    actions: [
      { id: "settings.manage-roles", label: "Manage roles" },
      { id: "settings.manage-environment", label: "Manage environment" },
    ],
  },
] as const;

export const defaultMenus: MenuNode[] = rootMenus.map((menu) => ({
  ...menu,
  parentId: null,
  visible: true,
  actions: [...menu.actions],
}));
