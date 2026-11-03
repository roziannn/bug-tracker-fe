export const TIP_WIDTH = 320;
// Perkiraan tinggi kotak penjelasan, dipakai untuk memilih di atas atau di bawah target tanpa perlu mengukurnya.
export const TIP_HEIGHT = 210;
export const GAP = 14;
export const EDGE = 12;
export const SPOT_PADDING = 6;

type Box = { top: number; bottom: number; left: number; width: number; height: number };

export type TipPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  /** Segitiga penunjuk di sisi atas atau bawah kotak. Null kalau kotak tidak menempel ke target. */
  arrow: "top" | "bottom" | null;
  arrowLeft: number;
};

/**
 * Menentukan letak kotak penjelasan terhadap target yang disorot.
 * `rect` adalah posisi target di layar (null kalau targetnya tidak ditemukan).
 */
export function computeTipPosition(rect: Box | null, viewport: { width: number; height: number }): TipPosition {
  const width = Math.min(TIP_WIDTH, Math.max(0, viewport.width - EDGE * 2));

  if (!rect) {
    // Target tidak ditemukan: kotak di tengah layar tanpa sorotan.
    return {
      top: Math.max(EDGE, viewport.height / 2 - TIP_HEIGHT / 2),
      left: Math.max(EDGE, viewport.width / 2 - width / 2),
      width,
      arrow: null,
      arrowLeft: 0,
    };
  }

  const centerX = rect.left + rect.width / 2;
  // Kotak sejajar dengan tengah target, tapi tidak boleh keluar dari tepi layar.
  const left = Math.max(EDGE, Math.min(centerX - width / 2, viewport.width - width - EDGE));
  const arrowLeft = Math.min(Math.max(centerX - left - 6, 16), Math.max(16, width - 28));
  const spaceBelow = viewport.height - rect.bottom;
  const needed = TIP_HEIGHT + GAP + EDGE;

  if (spaceBelow >= needed) return { top: rect.bottom + SPOT_PADDING + GAP, left, width, arrow: "top", arrowLeft };
  if (rect.top >= needed) return { bottom: viewport.height - rect.top + SPOT_PADDING + GAP, left, width, arrow: "bottom", arrowLeft };

  // Target terlalu besar untuk ada ruang di atas atau bawahnya: kotak ditaruh di tepi bawah layar.
  return { top: Math.max(EDGE, viewport.height - TIP_HEIGHT - EDGE), left, width, arrow: null, arrowLeft };
}
