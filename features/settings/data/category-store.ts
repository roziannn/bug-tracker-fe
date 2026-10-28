export type CategoryItem = {
  id: string;
  name: string;
  description: string;
  active: boolean;
};

export type CategoryConfig = {
  slug: string;
  title: string;
  description: string;
  defaults: Omit<CategoryItem, "id">[];
};

const item = (name: string, description = ""): Omit<CategoryItem, "id"> => ({ name, description, active: true });

export const categoryConfigs: CategoryConfig[] = [
  {
    slug: "teams-domain",
    title: "Teams Domain",
    description: "Domain keahlian yang bisa dipilih untuk sebuah team.",
    defaults: [
      item("User Experience & UI"),
      item("Infrastructure & DevOps"),
      item("Backend & Architecture"),
    ],
  },
  {
    slug: "project-status",
    title: "Project Status",
    description: "Status kesehatan yang bisa dipilih untuk sebuah project.",
    defaults: [
      item("Healthy", "Berjalan sesuai rencana."),
      item("At risk", "Ada risiko yang perlu dipantau."),
      item("Needs focus", "Butuh perhatian segera."),
    ],
  },
  {
    slug: "issue-status",
    title: "Issue Status",
    description: "Status yang bisa dipakai sebuah issue.",
    defaults: [
      item("Backlog"),
      item("Ready", "Scope jelas dan siap dikerjakan."),
      item("Investigating", "Sedang direproduksi dan dicari akar masalahnya."),
      item("In review", "Perbaikan sedang di-QA atau di-review."),
      item("Done", "Selesai dan siap masuk release notes."),
    ],
  },
  {
    slug: "issue-priority",
    title: "Issue Priority",
    description: "Tingkat prioritas yang bisa dipakai sebuah issue.",
    defaults: [item("Critical"), item("High"), item("Medium"), item("Low")],
  },
];

export function getCategoryConfig(slug: string) {
  return categoryConfigs.find((config) => config.slug === slug) ?? null;
}

const storageKey = (slug: string) => `bug-tracker:category:${slug}`;

export function defaultItems(config: CategoryConfig): CategoryItem[] {
  return config.defaults.map((entry, index) => ({ id: `${config.slug}-${index + 1}`, ...entry }));
}

export function loadCategoryItems(config: CategoryConfig): CategoryItem[] {
  try {
    const raw = window.localStorage.getItem(storageKey(config.slug));
    return raw ? (JSON.parse(raw) as CategoryItem[]) : defaultItems(config);
  } catch {
    return defaultItems(config);
  }
}

export function saveCategoryItems(slug: string, items: CategoryItem[]) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(items));
  } catch {
    // storage unavailable; changes stay in memory only
  }
}
