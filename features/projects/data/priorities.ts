// Prioritas project. Urut dari rendah ke tinggi.
export const PROJECT_PRIORITIES = ["Low", "Medium", "High"] as const;

export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const DEFAULT_PRIORITY: ProjectPriority = "Medium";
