import type { RecognizedSymbol } from "./pipeline";

export type ConfidenceLevel = "high" | "medium" | "low";

export type SymbolOverlay = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  level: ConfidenceLevel;
};

const PAD = 4;
const MIN_SIDE = 14;

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c >= 0.9) return "high";
  if (c >= 0.6) return "medium";
  return "low";
}

export function symbolOverlays(
  symbols: readonly RecognizedSymbol[]
): SymbolOverlay[] {
  return symbols.map((s) => {
    const cx = (s.rect.left + s.rect.right) / 2;
    const cy = (s.rect.top + s.rect.bottom) / 2;

    const w = Math.max(
      s.rect.right - s.rect.left + 2 * PAD,
      MIN_SIDE
    );

    const h = Math.max(
      s.rect.bottom - s.rect.top + 2 * PAD,
      MIN_SIDE
    );

    const pct = Math.round(
      Math.min(1, Math.max(0, s.confidence)) * 100
    );

    return {
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      text: `${s.label} ${pct}%`,
      level: confidenceLevel(s.confidence),
    };
  });
}
