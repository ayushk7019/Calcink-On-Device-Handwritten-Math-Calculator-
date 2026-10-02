import { formatResult } from "../math/evaluate";
import type { ExpressionResult } from "./pipeline";

export type Annotation = {
  text: string;
  x: number;
  y: number;
  size: number;
  kind:
    | "answer"
    | "undefined"
    | "error";
};

const MIN_SIZE = 16;
const MAX_SIZE = 120;

function median(
  values: number[]
): number {
  const v = [...values].sort(
    (a, b) => a - b
  );

  return v.length
    ? v[Math.floor(v.length / 2)]
    : 0;
}

export function answerAnnotation(
  out: ExpressionResult
): Annotation | null {
  if (!out.result) {
    return null;
  }

  const eq =
    out.symbols[
      out.symbols.length - 1
    ];

  if (!eq) {
    return null;
  }

  const digitHeights =
    out.symbols
      .filter((s) =>
        /^[0-9]$/.test(s.label)
      )
      .map(
        (s) =>
          s.rect.bottom -
          s.rect.top
      );

  const ref = digitHeights.length
    ? median(digitHeights)
    : eq.rect.right - eq.rect.left;

  const size = Math.min(
    MAX_SIZE,
    Math.max(
      MIN_SIZE,
      ref * 0.9
    )
  );

  const r = out.result;

  const text = r.ok
    ? formatResult(r.value)
    : r.error === "undefined"
      ? "Undefined"
      : "Error";

  const kind = r.ok
    ? "answer"
    : r.error === "undefined"
      ? "undefined"
      : "error";

  return {
    text,
    x: eq.rect.right + size * 0.5,
    y:
      (eq.rect.top +
        eq.rect.bottom) /
      2,
    size,
    kind,
  };
}