export type CategoryConfig = {
  slug: string;
  /** Disimpan di kolom CORE_Category.CategoryName. */
  title: string;
  description: string;
  /** Nilai awal untuk `pnpm seed-category`. */
  defaults: { name: string; description: string }[];
};

const item = (name: string, description = "") => ({ name, description });

// Daftar kategori. Nilai-nilainya (Success, Warning, dst.) ada di tabel CORE_Category.
export const categoryConfigs: CategoryConfig[] = [
  {
    slug: "teams-domain",
    title: "Teams Domain",
    description: "Expertise domains that can be assigned to a team.",
    defaults: [
      item("User Experience & UI"),
      item("Infrastructure & DevOps"),
      item("Backend & Architecture"),
    ],
  },
  {
    slug: "project-status",
    title: "Project Status",
    description: "Health statuses that can be assigned to a project.",
    defaults: [
      item("Healthy", "Running as planned."),
      item("At risk", "There are risks that need monitoring."),
      item("Needs focus", "Needs immediate attention."),
    ],
  },
  {
    slug: "issue-status",
    title: "Issue Status",
    description: "Statuses an issue can have.",
    defaults: [
      item("Backlog"),
      item("Ready", "Scope is clear and ready to work on."),
      item("Investigating", "Being reproduced and root-caused."),
      item("In review", "The fix is being tested or reviewed."),
      item("Done", "Finished and ready for the release notes."),
    ],
  },
  {
    slug: "issue-priority",
    title: "Issue Priority",
    description: "Priority levels an issue can have.",
    defaults: [item("Critical"), item("High"), item("Medium"), item("Low")],
  },
  {
    slug: "audit-trail-outcome",
    title: "Audit Trail Outcome",
    description: "The result of an activity recorded in the audit trail.",
    defaults: [
      item("Success", "The activity was carried out."),
      item("Warning", "Succeeded, but needs attention."),
      item("Blocked", "The activity was rejected or blocked."),
    ],
  },
];

export function getCategoryConfig(slug: string) {
  return categoryConfigs.find((config) => config.slug === slug) ?? null;
}
