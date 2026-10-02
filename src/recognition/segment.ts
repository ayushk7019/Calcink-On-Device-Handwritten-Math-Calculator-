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
  minWidth?: number;
  overlapRatio?: number;
  gapFactor?: number;
};

const DEFAULTS: Required<SegmentOptions> = {
  minWidth: 8,
  overlapRatio: 0.6,
  gapFactor: 0.8,
};

function getRect(strokes: readonly Stroke[]): Rect {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      left = Math.min(left, point.x);
      top = Math.min(top, point.y);
      right = Math.max(right, point.x);
      bottom = Math.max(bottom, point.y);
    }
  }

  return {
    left,
    top,
    right,
    bottom,
  };
}

function width(rect: Rect): number {
  return Math.max(0, rect.right - rect.left);
}

function height(rect: Rect): number {
  return Math.max(0, rect.bottom - rect.top);
}

function centerX(rect: Rect): number {
  return (rect.left + rect.right) / 2;
}

function centerY(rect: Rect): number {
  return (rect.top + rect.bottom) / 2;
}

function isDotLike(
  rect: Rect,
  minWidth: number
): boolean {
  const size = Math.max(
    width(rect),
    height(rect)
  );

  return size <= minWidth * 1.5;
}

function isHorizontalBar(
  rect: Rect,
  minWidth: number
): boolean {
  const w = width(rect);
  const h = height(rect);

  return (
    w >= minWidth * 2 &&
    w >= 1.5 * h
  );
}

function isDivisionBar(
  rect: Rect,
  minWidth: number
): boolean {
  const w = width(rect);
  const h = height(rect);

  return (
    w >= minWidth &&
    w >= 1.5 * h
  );
}

function isVerticalStroke(
  rect: Rect,
  minWidth: number
): boolean {
  const w = width(rect);
  const h = height(rect);

  return (
    h >= minWidth * 2 &&
    h >= 1.5 * w
  );
}

function horizontalOverlap(
  a: Rect,
  b: Rect
): number {
  return Math.max(
    0,
    Math.min(a.right, b.right) -
      Math.max(a.left, b.left)
  );
}

function horizontalOverlapRatio(
  a: Rect,
  b: Rect,
  minWidth: number
): number {
  const overlap = horizontalOverlap(a, b);

  const aw = Math.max(
    width(a),
    minWidth
  );

  const bw = Math.max(
    width(b),
    minWidth
  );

  return (
    overlap / Math.min(aw, bw)
  );
}

function verticalGap(
  a: Rect,
  b: Rect
): number {
  if (a.bottom < b.top) {
    return b.top - a.bottom;
  }

  if (b.bottom < a.top) {
    return a.top - b.bottom;
  }

  return 0;
}

function makeGroup(
  strokes: Stroke[]
): SymbolGroup {
  return {
    strokes,
    rect: getRect(strokes),
  };
}

function mergeStrokes(
  groups: SymbolGroup[]
): Stroke[] {
  return groups
    .flatMap(
      (group) => group.strokes
    )
    .sort(
      (a, b) => a.id - b.id
    );
}

function tryMergePlus(
  groups: SymbolGroup[],
  minWidth: number
): boolean {
  const tolerance = minWidth * 0.5;

  for (let i = 0; i < groups.length; i++) {
    for (
      let j = i + 1;
      j < groups.length;
      j++
    ) {
      const a = groups[i];
      const b = groups[j];

      if (
        a.strokes.length !== 1 ||
        b.strokes.length !== 1
      ) {
        continue;
      }

      let horizontal: SymbolGroup;
      let vertical: SymbolGroup;

      if (
        isHorizontalBar(
          a.rect,
          minWidth
        ) &&
        isVerticalStroke(
          b.rect,
          minWidth
        )
      ) {
        horizontal = a;
        vertical = b;
      } else if (
        isHorizontalBar(
          b.rect,
          minWidth
        ) &&
        isVerticalStroke(
          a.rect,
          minWidth
        )
      ) {
        horizontal = b;
        vertical = a;
      } else {
        continue;
      }

      const verticalCenterX =
        centerX(vertical.rect);

      const horizontalCenterY =
        centerY(horizontal.rect);

      const crossesHorizontally =
        verticalCenterX >=
          horizontal.rect.left -
            tolerance &&
        verticalCenterX <=
          horizontal.rect.right +
            tolerance;

      const crossesVertically =
        horizontalCenterY >=
          vertical.rect.top -
            tolerance &&
        horizontalCenterY <=
          vertical.rect.bottom +
            tolerance;

      if (
        !crossesHorizontally ||
        !crossesVertically
      ) {
        continue;
      }

      const merged = makeGroup(
        mergeStrokes([a, b])
      );

      groups.splice(j, 1);
      groups.splice(i, 1, merged);

      return true;
    }
  }

  return false;
}

function tryMergeDivision(
  groups: SymbolGroup[],
  minWidth: number
): boolean {
  for (
    let barIndex = 0;
    barIndex < groups.length;
    barIndex++
  ) {
    const bar = groups[barIndex];

    if (
      bar.strokes.length !== 1 ||
      !isDivisionBar(
        bar.rect,
        minWidth
      )
    ) {
      continue;
    }

    const barCenterX =
      centerX(bar.rect);

    const barCenterY =
      centerY(bar.rect);

    const barWidth = Math.max(
      width(bar.rect),
      minWidth
    );

    const maxGap = barWidth;

    let topDotIndex = -1;
    let bottomDotIndex = -1;

    let bestTopDistance = Infinity;
    let bestBottomDistance = Infinity;

    for (
      let i = 0;
      i < groups.length;
      i++
    ) {
      if (i === barIndex) {
        continue;
      }

      const candidate = groups[i];

      if (
        candidate.strokes.length !== 1 ||
        !isDotLike(
          candidate.rect,
          minWidth
        )
      ) {
        continue;
      }

      const dx = Math.abs(
        centerX(candidate.rect) -
          barCenterX
      );

      if (
        dx >
        barWidth * 0.35
      ) {
        continue;
      }

      const candidateCenterY =
        centerY(candidate.rect);

      if (
        candidateCenterY <
        barCenterY
      ) {
        const gap =
          barCenterY -
          candidateCenterY;

        if (
          gap <= maxGap &&
          gap < bestTopDistance
        ) {
          bestTopDistance = gap;
          topDotIndex = i;
        }
      } else if (
        candidateCenterY >
        barCenterY
      ) {
        const gap =
          candidateCenterY -
          barCenterY;

        if (
          gap <= maxGap &&
          gap < bestBottomDistance
        ) {
          bestBottomDistance = gap;
          bottomDotIndex = i;
        }
      }
    }

    if (
      topDotIndex !== -1 &&
      bottomDotIndex !== -1
    ) {
      const merged = makeGroup(
        mergeStrokes([
          bar,
          groups[topDotIndex],
          groups[bottomDotIndex],
        ])
      );

      const remove = new Set([
        barIndex,
        topDotIndex,
        bottomDotIndex,
      ]);

      const next: SymbolGroup[] = [];

      for (
        let i = 0;
        i < groups.length;
        i++
      ) {
        if (!remove.has(i)) {
          next.push(groups[i]);
        }
      }

      next.push(merged);

      groups.splice(
        0,
        groups.length,
        ...next
      );

      return true;
    }
  }

  return false;
}

function tryMergeGeneric(
  groups: SymbolGroup[],
  overlapRatio: number,
  gapFactor: number,
  minWidth: number
): boolean {
  for (
    let i = 0;
    i < groups.length;
    i++
  ) {
    if (
      isDotLike(
        groups[i].rect,
        minWidth
      )
    ) {
      continue;
    }

    for (
      let j = i + 1;
      j < groups.length;
      j++
    ) {
      if (
        isDotLike(
          groups[j].rect,
          minWidth
        )
      ) {
        continue;
      }

      const rawOverlap =
        horizontalOverlap(
          groups[i].rect,
          groups[j].rect
        );

      if (rawOverlap <= 0) {
        continue;
      }

      const overlap =
        horizontalOverlapRatio(
          groups[i].rect,
          groups[j].rect,
          minWidth
        );

      if (overlap < overlapRatio) {
        continue;
      }

      const widerWidth =
        Math.max(
          width(groups[i].rect),
          width(groups[j].rect),
          minWidth
        );

      const gap =
        verticalGap(
          groups[i].rect,
          groups[j].rect
        );

      if (
        gap <=
        gapFactor * widerWidth
      ) {
        groups[i] = makeGroup(
          mergeStrokes([
            groups[i],
            groups[j],
          ])
        );

        groups.splice(j, 1);

        return true;
      }
    }
  }

  return false;
}

export function segmentStrokes(
  strokes: readonly Stroke[],
  options: SegmentOptions = {}
): SymbolGroup[] {
  const {
    minWidth,
    overlapRatio,
    gapFactor,
  } = {
    ...DEFAULTS,
    ...options,
  };

  const groups = strokes
    .filter(
      (stroke) =>
        stroke.points.length > 0
    )
    .map((stroke) =>
      makeGroup([stroke])
    );

  while (
    tryMergePlus(
      groups,
      minWidth
    )
  ) {}

  while (
    tryMergeDivision(
      groups,
      minWidth
    )
  ) {}

  while (
    tryMergeGeneric(
      groups,
      overlapRatio,
      gapFactor,
      minWidth
    )
  ) {}

  groups.sort(
    (a, b) =>
      centerX(a.rect) -
      centerX(b.rect)
  );

  return groups;
}