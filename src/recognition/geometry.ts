import type { Stroke } from "../canvas/types";

export type SquareBox = {
  x: number;
  y: number;
  size: number;
};

export function squareBox(
  strokes: readonly Stroke[]
): SquareBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  if (!Number.isFinite(minX)) {
    return null;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const size = Math.max(width, height, 1);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: centerX - size / 2,
    y: centerY - size / 2,
    size,
  };
}