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
