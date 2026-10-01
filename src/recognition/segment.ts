import type { Stroke } from "../canvas/types";

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type SymbolGroup = {
  strokes: Stroke[];
  rect: Rect;
};

export type SegmentOptions = {
  minWidth: number;
  overlapRatio: number;
  gapFactor: number;
};

const DEFAULTS: SegmentOptions = {
  minWidth: 8,
  overlapRatio: 0.6,
  gapFactor: 0.8,
};

function strokeRect(stroke: Stroke): Rect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const point of stroke.points) {
    left = Math.min(left, point.x);
    right = Math.max(right, point.x);
    top = Math.min(top, point.y);
    bottom = Math.max(bottom, point.y);
  }

  return {
    left,
    top,
    right,
    bottom,
  };
}

function union(a: Rect, b: Rect): Rect {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function widen(
  rect: Rect,
  minWidth: number
): Rect {
  const width = rect.right - rect.left;

  if (width >= minWidth) {
    return rect;
  }

  const pad = (minWidth - width) / 2;

  return {
    ...rect,
    left: rect.left - pad,
    right: rect.right + pad,
  };
}

export function shouldMerge(
  a0: Rect,
  b0: Rect,
  options: SegmentOptions
): boolean {
  const a = widen(a0, options.minWidth);
  const b = widen(b0, options.minWidth);

  const widthA = a.right - a.left;
  const widthB = b.right - b.left;

  const overlap =
    Math.min(a.right, b.right) -
    Math.max(a.left, b.left);

  const horizontalRatio =
    Math.max(0, overlap) /
    Math.min(widthA, widthB);

  const verticalGap = Math.max(
    0,
    Math.max(a.top, b.top) -
      Math.min(a.bottom, b.bottom)
  );

  return (
    horizontalRatio >= options.overlapRatio &&
    verticalGap <=
      options.gapFactor *
        Math.max(widthA, widthB)
  );
}

export function segmentStrokes(
  strokes: readonly Stroke[],
  options: Partial<SegmentOptions> = {}
): SymbolGroup[] {
  const segmentOptions = {
    ...DEFAULTS,
    ...options,
  };

  const groups: SymbolGroup[] = strokes
    .filter((stroke) => stroke.points.length > 0)
    .map((stroke) => ({
      strokes: [stroke],
      rect: strokeRect(stroke),
    }));

  let merged = true;

  while (merged) {
    merged = false;

    outer:
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (
          shouldMerge(
            groups[i].rect,
            groups[j].rect,
            segmentOptions
          )
        ) {
          groups[i] = {
            strokes: [
              ...groups[i].strokes,
              ...groups[j].strokes,
            ],
            rect: union(
              groups[i].rect,
              groups[j].rect
            ),
          };

          groups.splice(j, 1);

          merged = true;
          break outer;
        }
      }
    }
  }

  groups.sort(
    (a, b) =>
      a.rect.left +
      a.rect.right -
      (b.rect.left + b.rect.right)
  );

  return groups;
}