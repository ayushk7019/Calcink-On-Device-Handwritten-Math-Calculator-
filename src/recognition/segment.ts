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

function isDotLike(
  rect: Rect,
  minWidth: number
): boolean {
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;

  return (
    Math.max(width, height) <=
    minWidth * 1.5
  );
}

function isHorizontalBar(
  rect: Rect,
  minWidth: number
): boolean {
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;

  return (
    width >= minWidth * 2 &&
    width >= 1.5 * Math.max(height, 1)
  );
}

function centerX(rect: Rect): number {
  return (
    rect.left + rect.right
  ) / 2;
}

function centerY(rect: Rect): number {
  return (
    rect.top + rect.bottom
  ) / 2;
}

function divisionDotMatchesBar(
  dot: Rect,
  bar: Rect,
  minWidth: number
): boolean {
  if (!isDotLike(dot, minWidth)) {
    return false;
  }

  if (!isHorizontalBar(bar, minWidth)) {
    return false;
  }

  const barWidth =
    bar.right - bar.left;

  const dx = Math.abs(
    centerX(dot) - centerX(bar)
  );

  const dotCenterY =
    centerY(dot);

  const barCenterY =
    centerY(bar);

  const gap =
    dotCenterY < barCenterY
      ? bar.top - dot.bottom
      : dot.top - bar.bottom;

  return (
    dx <= 0.35 * barWidth &&
    gap >= 0 &&
    gap <= barWidth
  );
}

function isTopDivisionDot(
  dot: Rect,
  bar: Rect,
  minWidth: number
): boolean {
  return (
    centerY(dot) < centerY(bar) &&
    divisionDotMatchesBar(
      dot,
      bar,
      minWidth
    )
  );
}

function isBottomDivisionDot(
  dot: Rect,
  bar: Rect,
  minWidth: number
): boolean {
  return (
    centerY(dot) > centerY(bar) &&
    divisionDotMatchesBar(
      dot,
      bar,
      minWidth
    )
  );
}

function findDivisionDots(
  groups: SymbolGroup[],
  barIndex: number,
  minWidth: number
): number[] {
  const bar =
    groups[barIndex].rect;

  if (
    !isHorizontalBar(
      bar,
      minWidth
    )
  ) {
    return [];
  }

  let topDot = -1;
  let bottomDot = -1;

  for (
    let i = 0;
    i < groups.length;
    i++
  ) {
    if (i === barIndex) {
      continue;
    }

    const rect =
      groups[i].rect;

    if (
      topDot === -1 &&
      isTopDivisionDot(
        rect,
        bar,
        minWidth
      )
    ) {
      topDot = i;
      continue;
    }

    if (
      bottomDot === -1 &&
      isBottomDivisionDot(
        rect,
        bar,
        minWidth
      )
    ) {
      bottomDot = i;
    }
  }

  if (
    topDot !== -1 &&
    bottomDot !== -1
  ) {
    return [
      topDot,
      bottomDot,
    ];
  }

  return [];
}

function mergeDivisionGroup(
  groups: SymbolGroup[],
  barIndex: number,
  dotIndices: number[]
) {
  const indices = [
    barIndex,
    ...dotIndices,
  ].sort((a, b) => a - b);

  let rect =
    groups[barIndex].rect;

  const strokes: Stroke[] = [];

  for (const index of indices) {
    rect = union(
      rect,
      groups[index].rect
    );

    strokes.push(
      ...groups[index].strokes
    );
  }

  groups[barIndex] = {
    strokes,
    rect,
  };

  for (
    let i = indices.length - 1;
    i >= 0;
    i--
  ) {
    const index = indices[i];

    if (index !== barIndex) {
      groups.splice(index, 1);
    }
  }
}

export function shouldMerge(
  a0: Rect,
  b0: Rect,
  options: SegmentOptions
): boolean {
  const aIsDot = isDotLike(
    a0,
    options.minWidth
  );

  const bIsDot = isDotLike(
    b0,
    options.minWidth
  );

  /*
   * Two tiny dots should never merge directly.
   */
  if (aIsDot && bIsDot) {
    return false;
  }

  /*
   * Dot grouping is handled by the dedicated
   * division detection phase.
   */
  if (aIsDot || bIsDot) {
    return false;
  }

  const a = widen(
    a0,
    options.minWidth
  );

  const b = widen(
    b0,
    options.minWidth
  );

  const widthA =
    a.right - a.left;

  const widthB =
    b.right - b.left;

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
    horizontalRatio >=
      options.overlapRatio &&
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

  const groups: SymbolGroup[] =
    strokes
      .filter(
        (stroke) =>
          stroke.points.length > 0
      )
      .map((stroke) => ({
        strokes: [stroke],
        rect: strokeRect(stroke),
      }));

  /*
   * Dedicated ÷ detection.
   *
   * Look for a horizontal bar with
   * one dot above it and one dot below it.
   */
  let divisionChanged = true;

  while (divisionChanged) {
    divisionChanged = false;

    for (
      let i = 0;
      i < groups.length;
      i++
    ) {
      if (
        !isHorizontalBar(
          groups[i].rect,
          segmentOptions.minWidth
        )
      ) {
        continue;
      }

      const dots = findDivisionDots(
        groups,
        i,
        segmentOptions.minWidth
      );

      if (dots.length === 2) {
        mergeDivisionGroup(
          groups,
          i,
          dots
        );

        divisionChanged = true;
        break;
      }
    }
  }

  /*
   * Generic repeated merging.
   */
  let changed = true;

  while (changed) {
    changed = false;

    outer:
    for (
      let i = 0;
      i < groups.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < groups.length;
        j++
      ) {
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

          changed = true;
          break outer;
        }
      }
    }
  }

  /*
   * Sort symbols from left to right.
   */
  groups.sort(
    (a, b) =>
      a.rect.left +
      a.rect.right -
      (b.rect.left +
        b.rect.right)
  );

  return groups;
}