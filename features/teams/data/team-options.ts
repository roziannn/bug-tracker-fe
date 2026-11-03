// Role anggota di sebuah team.
export const TEAM_ROLES = ["Admin", "Lead", "Engineer", "QA"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const DEFAULT_TEAM_ROLE: TeamRole = "Engineer";

// Tingkat akses anggota di team.
export const ACCESS_LEVELS = ["member", "lead", "observer"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export const DEFAULT_ACCESS_LEVEL: AccessLevel = "member";

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  member: "Member",
  lead: "Lead",
  observer: "Observer",
};
