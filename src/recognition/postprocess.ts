import type { Stroke } from "../canvas/types";

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function getRect(stroke: Stroke): Rect | null {
  if (stroke.points.length === 0) {
    return null;
  }

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const point of stroke.points) {
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  }

  return {
    left,
    top,
    right,
    bottom,
  };
}

function isHorizontal(stroke: Stroke): boolean {
  const rect = getRect(stroke);

  if (!rect) {
    return false;
  }

  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;

  if (width <= 0) {
    return false;
  }

  const first = stroke.points[0];
  const last =
    stroke.points[stroke.points.length - 1];

  const dx = Math.abs(last.x - first.x);
  const dy = Math.abs(last.y - first.y);

  if (dx === 0) {
    return false;
  }

  return (
    dy / dx < 0.25 &&
    height / width < 0.5
  );
}

function isDivisionBar(
  stroke: Stroke
): boolean {
  const rect = getRect(stroke);

  if (!rect) {
    return false;
  }

  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;

  return (
    width >= 4 &&
    width >= 1.5 * height
  );
}

function isDotLike(
  stroke: Stroke
): boolean {
  const rect = getRect(stroke);

  if (!rect) {
    return false;
  }

  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;
  const size = Math.max(width, height);

  return size <= 12;
}

function centerY(stroke: Stroke): number {
  const rect = getRect(stroke);

  if (!rect) {
    return 0;
  }

  return (rect.top + rect.bottom) / 2;
}

function isDivisionSymbol(
  strokes: readonly Stroke[]
): boolean {
  const nonEmpty = strokes.filter(
    (stroke) => stroke.points.length > 0
  );

  if (nonEmpty.length !== 3) {
    return false;
  }

  const bars = nonEmpty.filter(
    (stroke) => isDivisionBar(stroke)
  );

  if (bars.length !== 1) {
    return false;
  }

  const dots = nonEmpty.filter(
    (stroke) => isDotLike(stroke)
  );

  if (dots.length !== 2) {
    return false;
  }

  const bar = bars[0];
  const barY = centerY(bar);

  const topDot = dots.find(
    (stroke) => centerY(stroke) < barY
  );

  const bottomDot = dots.find(
    (stroke) => centerY(stroke) > barY
  );

  if (!topDot || !bottomDot) {
    return false;
  }

  const barRect = getRect(bar);

  if (!barRect) {
    return false;
  }

  const barCenterX =
    (barRect.left + barRect.right) / 2;

  const maxXDistance =
    Math.max(
      4,
      (barRect.right - barRect.left) * 0.5
    );

  const topRect = getRect(topDot);
  const bottomRect = getRect(bottomDot);

  if (!topRect || !bottomRect) {
    return false;
  }

  const topCenterX =
    (topRect.left + topRect.right) / 2;

  const bottomCenterX =
    (bottomRect.left + bottomRect.right) / 2;

  if (
    Math.abs(topCenterX - barCenterX) >
      maxXDistance ||
    Math.abs(
      bottomCenterX - barCenterX
    ) > maxXDistance
  ) {
    return false;
  }

  return true;
}

export function postprocessLabel(
  strokes: readonly Stroke[],
  label: string
): string {
  const nonEmpty = strokes.filter(
    (stroke) => stroke.points.length > 0
  );

  if (isDivisionSymbol(nonEmpty)) {
    return "÷";
  }

  if (nonEmpty.length === 2) {
    const bothHorizontal =
      nonEmpty.every(isHorizontal);

    if (bothHorizontal) {
      return "=";
    }
  }

  if (
    nonEmpty.length === 1 &&
    isHorizontal(nonEmpty[0])
  ) {
    return "-";
  }

  return label;
}