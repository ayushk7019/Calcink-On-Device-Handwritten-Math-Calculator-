import type { Stroke } from "../canvas/types";

function isHorizontal(stroke: Stroke): boolean {
  if (stroke.points.length < 2) return false;

  const first = stroke.points[0];
  const last = stroke.points[stroke.points.length - 1];

  const dx = Math.abs(last.x - first.x);
  const dy = Math.abs(last.y - first.y);

  if (dx === 0) return false;

  return dy / dx < 0.25;
}

export function postprocessLabel(
  strokes: readonly Stroke[],
  label: string
): string {
  const nonEmpty = strokes.filter(
    (stroke) => stroke.points.length > 0
  );

  if (nonEmpty.length === 2) {
    const bothHorizontal = nonEmpty.every(isHorizontal);

    if (bothHorizontal) {
      return "=";
    }
  }

  if (nonEmpty.length === 1 && isHorizontal(nonEmpty[0])) {
    return "-";
  }

  return label;
}