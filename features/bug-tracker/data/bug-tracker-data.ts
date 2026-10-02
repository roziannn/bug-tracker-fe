export type Priority = "Critical" | "High" | "Medium" | "Low";
export type IssueStatus = "Backlog" | "Ready" | "Investigating" | "In review" | "Done";

export type IssueRecord = {
  id: string;
  title: string;
  priority: Priority;
  status: IssueStatus;
  team: string;
  assignee: string;
  label: string | "None";
  createdAt: string;
  summary?: string;
  comments?: {
    id: string;
    author: string;
    avatar?: string;
    text: string;
    createdAt: string;
  }[];
};

export type OverviewCard = {
  label: string;
  value: string;
  change: string;
  note: string;
  icon: "circle-dot" | "shield-alert" | "git-branch" | "sparkles";
};

export type KanbanColumn = {
  id: IssueStatus;
  title: string;
  description: string;
};

export type IssueClassification = "UI Bug" | "Functional" | "Performance" | "Security" | "Data Integrity" | "Integration";

export type CriticalityTier = "Tier 1 - Critical" | "Tier 2 - Major" | "Tier 3 - Moderate" | "Tier 4 - Minor";

export type PicOption = {
  value: string;
  label: string;
  team: string;
};

export type ProjectOption = {
  value: string;
  label: string;
  squad: string;
};

export type TeamMetric = {
  id: string;
  name: string;
  lead: string;
  domain: string; 
  members: number;
  activeIssues: number;
  criticalOpen: number;
  sla: string;
};
export type ProjectMetric = {
  id: string;
  name: string;
  team: string;
  owner: string;
  status: "Healthy" | "At risk" | "Needs focus";
  openIssues: number;
  criticalIssues: number;
  nextMilestone: string;
  description: string;
  environment: string;
  repository: string;
  createdAt: string;
};

export type ChangelogEntry = {
  version: string;
  releasedOn: string;
  headline: string;
  summary: string;
  highlights: string[];
  category: "Feature" | "Improvement" | "Fix";
};

export type AuditTrailAction =
  | "Issue updated"
  | "Assignment changed"
  | "Status changed"
  | "Priority changed"
  | "Project updated"
  | "Role updated"
  | "Permission changed"
  | "Login attempt";

export type AuditTrailTarget =
  | "Issue"
  | "Project"
  | "Team"
  | "Workspace"
  | "Authentication";

export type AuditTrailOutcome = "Success" | "Warning" | "Blocked";

export type AuditTrailEntry = {
  id: string;
  actor: string;
  actorRole: string;
  action: AuditTrailAction;
  targetType: AuditTrailTarget;
  targetName: string;
  team: string;
  outcome: AuditTrailOutcome;
  ipAddress: string;
  createdAt: string;
  detail: string;
};

function newId(value: string) {
  return value;
}

export const overviewCards: OverviewCard[] = [
  { label: "Open bugs", value: "34", change: "+12.4%", note: "+5 since yesterday", icon: "circle-dot" },
  { label: "Critical issues", value: "7", change: "+2.0%", note: "2 need triage now", icon: "shield-alert" },
  { label: "In progress", value: "18", change: "+6.1%", note: "Across 4 active sprints", icon: "git-branch" },
  { label: "Resolved this week", value: "29", change: "+18.7%", note: "86% closed within SLA", icon: "sparkles" },
];

export const issues: IssueRecord[] = [
  {
    id: "BUG-218",
    title: "Crash when uploading screenshots larger than 10 MB",
    priority: "Critical",
    status: "In review",
    team: "Frontend",
    assignee: "RA",
    label: "Upload",
    createdAt: "2026-04-10",
    summary: "Attachment upload path fails when preview generation exceeds memory threshold.",
    comments: [
      {
        id: "c1",
        author: "Mira Indah",
        text: "I've reproduced this on the staging environment. It seems to happen specifically with PNG files over 12MB.",
        createdAt: "2026-04-10",
      },
      {
        id: "c2",
        author: "Raka Aditya",
        text: "Thanks Mira. I'll check the memory limit in the cloud function configuration.",
        createdAt: "2026-04-11",
      },
      {
        id: "c3",
        author: "Alif Latif",
        text: "Added a PR to increase the memory allocation and added a client-side check for file size.",
        createdAt: "2026-04-12",
      },
    ],
  },
  {
    id: "BUG-214",
    title: "Duplicate comments created after reconnecting offline session",
    priority: "High",
    status: "Investigating",
    team: "Platform",
    assignee: "MI",
    label: "None",
    createdAt: "2026-04-09",
    summary: "Queued requests replay twice after websocket reconnect in unstable networks.",
  },
  {
    id: "BUG-209",
    title: "Filter state resets after navigating back from issue detail",
    priority: "Medium",
    status: "Ready",
    team: "Frontend",
    assignee: "AL",
    label: "Navigation",
    createdAt: "2026-04-08",
    summary: "Search params are dropped when returning from detail page in app router flow.",
  },
  {
    id: "BUG-201",
    title: "Notification badge count mismatches unread total",
    priority: "Low",
    status: "Backlog",
    team: "Core",
    assignee: "DN",
    label: "None",
    createdAt: "2026-04-07",
    summary: "Unread aggregate is cached longer than individual stream counters.",
  },
  {
    id: "BUG-196",
    title: "Session timeout banner overlaps editor toolbar",
    priority: "High",
    status: "Done",
    team: "Frontend",
    assignee: "NV",
    label: "Editor",
    createdAt: "2026-04-05",
    summary: "Banner layer ignores sticky top offset in editor route.",
  },
  {
    id: "BUG-188",
    title: "Webhook delivery retries show inconsistent timestamps",
    priority: "Medium",
    status: "Done",
    team: "Platform",
    assignee: "KT",
    label: "Timezones",
    createdAt: "2026-04-04",
    summary: "Retry timeline mixes UTC and user locale formatting.",
  },
  {
    id: "BUG-224",
    title: "Mentions autocomplete stops responding after paste event",
    priority: "High",
    status: "Backlog",
    team: "Frontend",
    assignee: "SW",
    label: "Editor",
    createdAt: "2026-04-11",
    summary: "Editor parser loses caret anchor after multiline paste in comments.",
  },
  {
    id: "BUG-226",
    title: "Sentry release tag missing on rollback deployments",
    priority: "Medium",
    status: "Done",
    team: "Platform",
    assignee: "KT",
    label: "None",
    createdAt: "2026-04-11",
    summary: "Rollback pipeline publishes artifacts without final release marker.",
  },
  {
    id: "BUG-229",
    title: "CSV export includes hidden columns in compact table mode",
    priority: "Low",
    status: "Ready",
    team: "Core",
    assignee: "PR",
    label: "Export",
    createdAt: "2026-04-11",
    summary: "Export serializer ignores user-selected visible columns.",
  },
  {
    id: "BUG-231",
    title: "Critical blocker badge not synced to sprint summary",
    priority: "Critical",
    status: "Investigating",
    team: "Core",
    assignee: "LM",
    label: "Reports",
    createdAt: "2026-04-11",
    summary: "Summary service caches old blocker totals after issue escalation.",
  },
  {
    id: "BUG-233",
    title: "Audit log drawer truncates multiline stack traces",
    priority: "Medium",
    status: "In review",
    team: "Platform",
    assignee: "CY",
    label: "Audit",
    createdAt: "2026-04-10",
    summary: "Overflow styles collapse line breaks in trace output blocks.",
  },
  {
    id: "BUG-235",
    title: "Cannot reopen closed bug after release rollback",
    priority: "High",
    status: "Backlog",
    team: "Core",
    assignee: "AR",
    label: "Workflow",
    createdAt: "2026-04-11",
    summary: "State machine does not allow rollback transition from released to open.",
  },
];

export const kanbanColumns: KanbanColumn[] = [
  { id: "Backlog", title: "Backlog", description: "Reported issues waiting for prioritization." },
  { id: "Ready", title: "Ready", description: "Clear scope and ready to be picked up." },
  { id: "Investigating", title: "Investigating", description: "Engineers are reproducing and narrowing root cause." },
  { id: "In review", title: "In review", description: "Fixes are under QA or peer review." },
  { id: "Done", title: "Done", description: "Resolved items ready for release notes." },
];

export const issueClassifications: IssueClassification[] = ["UI Bug", "Functional", "Performance", "Security", "Data Integrity", "Integration"];

export const criticalityTiers: CriticalityTier[] = ["Tier 1 - Critical", "Tier 2 - Major", "Tier 3 - Moderate", "Tier 4 - Minor"];

export const picOptions: PicOption[] = [
  { value: "ra", label: "Raka Aditya", team: "Frontend" },
  { value: "mi", label: "Mira Indah", team: "Platform" },
  { value: "al", label: "Alif Latif", team: "Frontend" },
  { value: "dn", label: "Dina Nanda", team: "Core" },
  { value: "kt", label: "Kevin Tan", team: "Platform" },
  { value: "lm", label: "Laras Mahesa", team: "Core" },
];

const assigneeNameMap: Record<string, string> = {
  RA: "Raka Aditya",
  MI: "Mira Indah",
  AL: "Alif Latif",
  DN: "Dina Nanda",
  NV: "Nadia Valencia",
  KT: "Kevin Tan",
  SW: "Satria Wibowo",
  PR: "Putri Ramadhani",
  LM: "Laras Mahesa",
  CY: "Cahya Yusuf",
  AR: "Aulia Rahman",
};


export const teamMetrics: TeamMetric[] = [
  {
    id: "frontend",
    name: "Frontend",
    lead: "Raka Aditya",
    domain: "User Experience & UI", // Tambahkan domain
    members: 8,
    activeIssues: 4,
    criticalOpen: 1,
    sla: "92%",
  },
  {
    id: "platform",
    name: "Platform",
    lead: "Mira Indah",
    domain: "Infrastructure & DevOps", // Tambahkan domain
    members: 6,
    activeIssues: 4,
    criticalOpen: 0,
    sla: "95%",
  },
  {
    id: "core",
    name: "Core",
    lead: "Dina Nanda",
    domain: "Backend & Architecture", // Tambahkan domain
    members: 7,
    activeIssues: 4,
    criticalOpen: 1,
    sla: "88%",
  },
];

export function getTeamById(id: string) {
  return teamMetrics.find((team) => team.id === id);
}

export const projectMetrics: ProjectMetric[] = [
  {
    id: newId("3f2504e0-4f89-41d3-9a0c-0305e82c3301"),
    name: "Bug Tracker Web",
    team: "Frontend",
    owner: "Raka Aditya",
    status: "At risk",
    openIssues: 9,
    criticalIssues: 1,
    nextMilestone: "UI stabilization - Apr 18",
    description: "Frontend application for triage, issue reporting, and engineering quality workflows.",
    environment: "Production",
    repository: "github.com/company/bug-tracker-web",
    createdAt: "2026-03-14",
  },
  {
    id: newId("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
    name: "Triage Hub",
    team: "Core",
    owner: "Dina Nanda",
    status: "Healthy",
    openIssues: 6,
    criticalIssues: 0,
    nextMilestone: "Queue automation - Apr 21",
    description: "Internal orchestration service for triage queueing, routing rules, and assignment logic.",
    environment: "Staging",
    repository: "github.com/company/triage-hub",
    createdAt: "2026-02-28",
  },
  {
    id: newId("550e8400-e29b-41d4-a716-446655440000"),
    name: "Incident Center",
    team: "Platform",
    owner: "Mira Indah",
    status: "Needs focus",
    openIssues: 8,
    criticalIssues: 2,
    nextMilestone: "Alert routing revamp - Apr 16",
    description: "Platform console used to monitor incident escalation, alerting, and rollback coordination.",
    environment: "Production",
    repository: "github.com/company/incident-center",
    createdAt: "2026-01-22",
  },
  {
    id: newId("6ba7b814-9dad-11d1-80b4-00c04fd430c8"),
    name: "Release Ops",
    team: "Core",
    owner: "Laras Mahesa",
    status: "Healthy",
    openIssues: 5,
    criticalIssues: 0,
    nextMilestone: "Rollback policy review - Apr 24",
    description: "Operational workspace for release approvals, deployment visibility, and rollback governance.",
    environment: "Staging",
    repository: "github.com/company/release-ops",
    createdAt: "2026-02-10",
  },
];

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "v2.8.1",
    releasedOn: "2026-04-11",
    headline: "Management flows expanded across workspace",
    summary: "Projects, teams, settings, and issue creation now have dedicated management flows inside the bug tracker.",
    highlights: ["Added create and detail flows for projects.", "Added team group maintenance and per-team member management pages.", "Expanded settings pages for menu, permission, and environment configuration."],
    category: "Feature",
  },
  {
    version: "v2.8.0",
    releasedOn: "2026-04-09",
    headline: "Kanban workflow and navigation polish",
    summary: "The kanban board was cleaned up to focus on drag-and-drop flow while rules moved into a dialog.",
    highlights: ["Made the kanban board full-width.", "Moved board rules into a modal dialog trigger.", "Improved navigation consistency for major workspace sections."],
    category: "Improvement",
  },
  {
    version: "v2.7.9",
    releasedOn: "2026-04-04",
    headline: "Stability and release visibility updates",
    summary: "Recent fixes improved release summaries, timestamp consistency, and issue reporting clarity.",
    highlights: ["Improved webhook retry timestamp consistency.", "Refined release health summaries in the workspace.", "Improved issue data presentation across tracking screens."],
    category: "Fix",
  },
];

export const auditTrailEntries: AuditTrailEntry[] = [
  {
    id: "AUD-301",
    actor: "Raka Aditya",
    actorRole: "Engineering Lead",
    action: "Assignment changed",
    targetType: "Issue",
    targetName: "BUG-218",
    team: "Frontend",
    outcome: "Success",
    ipAddress: "10.10.24.18",
    createdAt: "2026-04-12T09:15:00+07:00",
    detail: "PIC issue dipindahkan dari Mira Indah ke Alif Latif untuk percepatan review upload fix.",
  },
  {
    id: "AUD-302",
    actor: "Mira Indah",
    actorRole: "Platform Lead",
    action: "Status changed",
    targetType: "Issue",
    targetName: "BUG-214",
    team: "Platform",
    outcome: "Success",
    ipAddress: "10.10.18.42",
    createdAt: "2026-04-12T10:05:00+07:00",
    detail: "Status issue berubah dari Ready ke Investigating setelah reproduksi koneksi offline berhasil.",
  },
  {
    id: "AUD-303",
    actor: "Dina Nanda",
    actorRole: "Core Lead",
    action: "Priority changed",
    targetType: "Issue",
    targetName: "BUG-231",
    team: "Core",
    outcome: "Warning",
    ipAddress: "10.10.31.11",
    createdAt: "2026-04-12T10:24:00+07:00",
    detail: "Prioritas dinaikkan menjadi Critical setelah blocker count pada sprint summary tidak sinkron.",
  },
  {
    id: "AUD-304",
    actor: "Laras Mahesa",
    actorRole: "Release Manager",
    action: "Project updated",
    targetType: "Project",
    targetName: "Release Ops",
    team: "Core",
    outcome: "Success",
    ipAddress: "10.10.31.28",
    createdAt: "2026-04-12T11:40:00+07:00",
    detail: "Milestone rollback policy review diperbarui untuk penyesuaian jadwal release approval.",
  },
  {
    id: "AUD-305",
    actor: "Cahya Yusuf",
    actorRole: "Platform Engineer",
    action: "Issue updated",
    targetType: "Issue",
    targetName: "BUG-233",
    team: "Platform",
    outcome: "Success",
    ipAddress: "10.10.18.57",
    createdAt: "2026-04-12T13:10:00+07:00",
    detail: "Catatan audit log drawer diperbarui untuk menyimpan stack trace multiline tanpa truncation.",
  },
  {
    id: "AUD-306",
    actor: "Putri Ramadhani",
    actorRole: "QA Analyst",
    action: "Login attempt",
    targetType: "Authentication",
    targetName: "Workspace Admin",
    team: "Core",
    outcome: "Blocked",
    ipAddress: "10.10.40.9",
    createdAt: "2026-04-12T13:38:00+07:00",
    detail: "Percobaan akses ke area admin diblokir karena role tidak memiliki permission elevated settings.",
  },
  {
    id: "AUD-307",
    actor: "Aulia Rahman",
    actorRole: "Product Owner",
    action: "Permission changed",
    targetType: "Workspace",
    targetName: "Bug Tracker Web",
    team: "Core",
    outcome: "Success",
    ipAddress: "10.10.40.19",
    createdAt: "2026-04-12T14:22:00+07:00",
    detail: "Hak akses export issue report ditambahkan untuk role Product Owner di workspace utama.",
  },
  {
    id: "AUD-308",
    actor: "Raka Aditya",
    actorRole: "Engineering Lead",
    action: "Role updated",
    targetType: "Team",
    targetName: "Frontend",
    team: "Frontend",
    outcome: "Success",
    ipAddress: "10.10.24.18",
    createdAt: "2026-04-12T15:04:00+07:00",
    detail: "Role reviewer default pada squad Frontend diperbarui untuk alur approval bugfix kritikal.",
  },
  {
    id: "AUD-309",
    actor: "Kevin Tan",
    actorRole: "SRE",
    action: "Issue updated",
    targetType: "Issue",
    targetName: "BUG-226",
    team: "Platform",
    outcome: "Success",
    ipAddress: "10.10.18.66",
    createdAt: "2026-04-12T16:17:00+07:00",
    detail: "Rollback deployment notes ditambahkan agar release tag tetap tersimpan saat release dibatalkan.",
  },
  {
    id: "AUD-310",
    actor: "Nadia Valencia",
    actorRole: "Frontend Engineer",
    action: "Status changed",
    targetType: "Issue",
    targetName: "BUG-196",
    team: "Frontend",
    outcome: "Success",
    ipAddress: "10.10.24.44",
    createdAt: "2026-04-12T17:03:00+07:00",
    detail: "Issue overlap banner dipindahkan ke status Done setelah verifikasi layout pada editor selesai.",
  },
  {
    id: "AUD-311",
    actor: "Satria Wibowo",
    actorRole: "Frontend Engineer",
    action: "Assignment changed",
    targetType: "Issue",
    targetName: "BUG-224",
    team: "Frontend",
    outcome: "Warning",
    ipAddress: "10.10.24.51",
    createdAt: "2026-04-12T17:46:00+07:00",
    detail: "Issue mention autocomplete diambil alih sementara karena assignee sebelumnya sedang on leave.",
  },
  {
    id: "AUD-312",
    actor: "Firda Rosiana Tanj",
    actorRole: "Workspace Admin",
    action: "Permission changed",
    targetType: "Workspace",
    targetName: "Incident Center",
    team: "Platform",
    outcome: "Success",
    ipAddress: "10.10.8.12",
    createdAt: "2026-04-12T18:12:00+07:00",
    detail: "Permission audit export diaktifkan untuk kebutuhan compliance review bulanan.",
  },
];

export const projectOptions: ProjectOption[] = projectMetrics.map((project) => ({
  value: project.name,
  label: project.name,
  squad: project.team,
}));

export function getProjectById(id: string) {
  return projectMetrics.find((project) => project.id === id);
}

export function getIssueById(id: string) {
  return issues.find((issue) => issue.id === id);
}

export function getAssigneeName(assignee: string) {
  return assigneeNameMap[assignee] ?? assignee;
}

export function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "today";
  if (diffInDays === 1) return "yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
}

export function priorityVariant(priority: Priority): "default" | "secondary" | "destructive" | "outline" {
  if (priority === "Critical") return "destructive";
  if (priority === "High") return "default";
  if (priority === "Medium") return "secondary";
  return "outline";
}

export function statusVariant(status: IssueStatus): "default" | "secondary" | "outline" | "ghost" {
  if (status === "Ready") return "default";
  if (status === "In review") return "secondary";
  if (status === "Investigating") return "outline";
  return "ghost";
}

export function projectStatusVariant(status: ProjectMetric["status"]): "default" | "secondary" | "destructive" {
  if (status === "Healthy") return "secondary";
  if (status === "At risk") return "default";
  return "destructive";
}
