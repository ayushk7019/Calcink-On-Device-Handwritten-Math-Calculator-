import type { Stroke } from "../canvas/types";
import { evaluate, type EvalResult } from "../math/evaluate";
import { segmentStrokes, type Rect } from "./segment";

export type Classification = {
  label: string;
  confidence: number;
  raw?: string;
};

export type Classifier = (
  strokes: Stroke[]
) => Promise<Classification>;

export type RecognizedSymbol = Classification & {
  rect: Rect;
};

export type ExpressionResult = {
  symbols: RecognizedSymbol[];
  text: string;
  result: EvalResult | null;
};

const DOT_RATIO = 0.2;

export async function recognizeExpression(
  strokes: readonly Stroke[],
  classify: Classifier
): Promise<ExpressionResult> {
  const groups = segmentStrokes(strokes);

  const refHeight = Math.max(
    0,
    ...groups.map(
      (group) => group.rect.bottom - group.rect.top
    )
  );

  const symbols: RecognizedSymbol[] = [];

  for (const group of groups) {
    const width =
      group.rect.right - group.rect.left;

    const height =
      group.rect.bottom - group.rect.top;

    const size = Math.max(width, height);

    const classification: Classification =
      refHeight > 0 &&
      size < DOT_RATIO * refHeight
        ? {
            label: ".",
            confidence: 1,
            raw: ".",
          }
        : await classify(group.strokes);

    symbols.push({
      ...classification,
      rect: group.rect,
    });
  }

  const text = symbols
    .map((symbol) => symbol.label)
    .join("");

  const result = text.endsWith("=")
    ? evaluate(text)
    : null;

  return {
    symbols,
    text,
    result,
  };
}