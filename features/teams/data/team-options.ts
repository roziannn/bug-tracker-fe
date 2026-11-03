// Tingkat akses anggota di team.
export const ACCESS_LEVELS = ["member", "lead", "observer"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export const DEFAULT_ACCESS_LEVEL: AccessLevel = "member";

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  member: "Member",
  lead: "Lead",
  observer: "Observer",
};
