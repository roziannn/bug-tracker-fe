export type AccessMenu = {
  id: string;
  label: string;
  actions: { id: string; label: string }[];
};

export const accessCatalog: AccessMenu[] = [
  { id: "overview", label: "Overview", actions: [] },
  {
    id: "issues",
    label: "All Issues",
    actions: [
      { id: "issues.create", label: "Create issue" },
      { id: "issues.edit", label: "Edit issue" },
      { id: "issues.comment", label: "Comment" },
      { id: "issues.export", label: "Export" },
    ],
  },
  { id: "kanban", label: "Kanban", actions: [{ id: "kanban.move", label: "Move card" }] },
  {
    id: "teams",
    label: "Teams",
    actions: [
      { id: "teams.manage-groups", label: "Create / edit group" },
      { id: "teams.manage-members", label: "Add / edit member" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    actions: [
      { id: "projects.create", label: "Create project" },
      { id: "projects.export", label: "Export" },
    ],
  },
  { id: "audit-trail", label: "Audit Trail", actions: [{ id: "audit-trail.export", label: "Export" }] },
  {
    id: "settings",
    label: "Settings",
    actions: [
      { id: "settings.manage-roles", label: "Manage roles" },
      { id: "settings.manage-environment", label: "Manage environment" },
    ],
  },
];
