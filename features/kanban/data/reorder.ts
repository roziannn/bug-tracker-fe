// Urutan kartu di sebuah kolom mengikuti urutan array: kartu di kolom yang sama muncul dalam urutan kemunculannya di array.

type Card = { id: string; status: string };

/**
 * Memindahkan kartu `cardId` ke kolom `status`, tepat di atas kartu `beforeId`.
 * Tanpa `beforeId` (atau kalau kartu itu tidak ada di kolom tujuan), kartu masuk di paling bawah kolom.
 * Mengembalikan array baru; array asli tidak diubah.
 */
export function moveCard<T extends Card>(cards: T[], cardId: string, status: string, beforeId: string | null): T[] {
  const moving = cards.find((card) => card.id === cardId);
  if (!moving) return cards;

  // Dilepas tepat di atas dirinya sendiri: tidak ada yang berubah.
  if (beforeId === cardId) return cards;

  const rest = cards.filter((card) => card.id !== cardId);
  let index = beforeId ? rest.findIndex((card) => card.id === beforeId && card.status === status) : -1;

  if (index === -1) {
    const lastInColumn = rest.reduce((last, card, position) => (card.status === status ? position : last), -1);
    index = lastInColumn + 1;
  }

  return [...rest.slice(0, index), { ...moving, status }, ...rest.slice(index)];
}
