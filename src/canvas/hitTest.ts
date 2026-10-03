import type { Stroke } from "./types";

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;

  const t =
    len2 === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((px - ax) * dx + (py - ay) * dy) / len2
          )
        );

  return Math.hypot(
    px - (ax + t * dx),
    py - (ay + t * dy)
  );
}

export function strokeHit(
  stroke: Stroke,
  x: number,
  y: number,
  radius: number
): boolean {
  const p = stroke.points;

  if (p.length === 0) {
    return false;
  }

  const reach =
    radius + stroke.width / 2;

  if (p.length === 1) {
    return (
      Math.hypot(
        x - p[0].x,
        y - p[0].y
      ) <= reach
    );
  }

  for (let i = 1; i < p.length; i++) {
    if (
      distToSegment(
        x,
        y,
        p[i - 1].x,
        p[i - 1].y,
        p[i].x,
        p[i].y
      ) <= reach
    ) {
      return true;
    }
  }

  return false;
}
