import { parseDateOnly } from "@/lib/date";

type PhaseDates = { Name: string; StartDate: string; EndDate: string };

// Posisi project terhadap timeline-nya pada suatu hari.
export type CurrentStatus =
  | { kind: "active"; phases: string[] } // hari ini ada di dalam satu atau lebih phase
  | { kind: "not-started" } // sebelum phase pertama dimulai
  | { kind: "between" } // di antara dua phase (ada jeda)
  | { kind: "completed" } // setelah phase terakhir selesai
  | { kind: "none" }; // project belum punya phase

const KIND_LABELS = {
  "not-started": "Not started",
  between: "Between phases",
  completed: "Completed",
} as const;

// `today` dalam milidetik UTC (lihat todayDateOnly). Tanggal mulai dan selesai phase sama-sama dihitung sebagai hari yang masih berjalan.
export function getCurrentStatus(phases: PhaseDates[], today: number): CurrentStatus {
  const ranges = phases
    .map((phase) => ({ name: phase.Name, start: parseDateOnly(phase.StartDate), end: parseDateOnly(phase.EndDate) }))
    .filter((range): range is { name: string; start: number; end: number } => range.start !== null && range.end !== null);

  if (!ranges.length) return { kind: "none" };

  const active = ranges.filter((range) => range.start <= today && today <= range.end);
  if (active.length) return { kind: "active", phases: active.map((range) => range.name) };

  if (today < Math.min(...ranges.map((range) => range.start))) return { kind: "not-started" };
  if (today > Math.max(...ranges.map((range) => range.end))) return { kind: "completed" };
  return { kind: "between" };
}

// Teks yang dipakai untuk filter dan pencarian.
export function statusLabels(status: CurrentStatus): string[] {
  if (status.kind === "active") return status.phases;
  if (status.kind === "none") return [];
  return [KIND_LABELS[status.kind]];
}
