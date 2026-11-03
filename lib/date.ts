const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Format tanggal standar aplikasi: 26 Okt 2026
export function formatDate(value: string | Date): string {
  if (typeof value === "string") {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) return `${Number(dateOnly[3])} ${MONTHS[Number(dateOnly[2]) - 1]} ${dateOnly[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Tanggal + jam, untuk log yang butuh waktu: 26 Okt 2026 14.30
export function formatDateTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const time = `${String(date.getHours()).padStart(2, "0")}.${String(date.getMinutes()).padStart(2, "0")}`;
  return `${formatDate(date)} ${time}`;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-10-26" menjadi milidetik (UTC, tengah malam). Null kalau bukan tanggal yang valid, misalnya "2026-02-30".
export function parseDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? ms : null;
}

// Kebalikan parseDateOnly: milidetik (UTC) menjadi "2026-10-26".
export function toDateOnly(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Hari ini (tanggal di zona waktu browser) dalam bentuk milidetik UTC, supaya bisa dibandingkan dengan parseDateOnly.
export function todayDateOnly(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

// Nama bulan singkat + tahun untuk header chart: "Okt 2026".
export function formatMonthYear(ms: number): string {
  const date = new Date(ms);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
