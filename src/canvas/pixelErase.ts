import type { Point } from "./types";

const lerp = (
  a: Point,
  b: Point,
  t: number
): Point => ({
  x:
    a.x +
    (b.x - a.x) * t,
  y:
    a.y +
    (b.y - a.y) * t,
  time:
    a.time +
    (b.time - a.time) * t,
});

function pathLength(
  p: Point[]
): number {
  let n = 0;

  for (
    let i = 1;
    i < p.length;
    i++
  ) {
    n += Math.hypot(
      p[i].x -
        p[i - 1].x,
      p[i].y -
        p[i - 1].y
    );
  }

  return n;
}

/**
 * Removes the part of a polyline inside
 * the circle (cx, cy, r).
 *
 * Returns null if the circle does not
 * touch the polyline.
 *
 * Otherwise returns the remaining pieces,
 * possibly an empty list.
 */
export function erasePieces(
  points: Point[],
  cx: number,
  cy: number,
  r: number,
  minPieceLength = 2
): Point[][] | null {
  if (points.length === 0) {
    return null;
  }

  const r2 = r * r;

  const inside = (
    p: Point
  ) =>
    (p.x - cx) ** 2 +
      (p.y - cy) ** 2 <=
    r2;

  if (points.length === 1) {
    return inside(points[0])
      ? []
      : null;
  }

  const pieces: Point[][] = [];

  let current: Point[] =
    inside(points[0])
      ? []
      : [points[0]];

  let touched =
    inside(points[0]);

  const flush = () => {
    if (
      current.length >= 2 &&
      pathLength(current) >=
        minPieceLength
    ) {
      pieces.push(current);
    }

    current = [];
  };

  for (
    let i = 1;
    i < points.length;
    i++
  ) {
    const a =
      points[i - 1];

    const b =
      points[i];

    const dx =
      b.x - a.x;

    const dy =
      b.y - a.y;

    const fx =
      a.x - cx;

    const fy =
      a.y - cy;

    const A =
      dx * dx +
      dy * dy;

    let lo = 1;
    let hi = 0;

    if (A > 0) {
      const B =
        2 *
        (fx * dx +
          fy * dy);

      const C =
        fx * fx +
        fy * fy -
        r2;

      const disc =
        B * B -
        4 * A * C;

      if (disc > 0) {
        const s =
          Math.sqrt(disc);

        lo = Math.max(
          (-B - s) /
            (2 * A),
          0
        );

        hi = Math.min(
          (-B + s) /
            (2 * A),
          1
        );
      }
    } else if (
      inside(b)
    ) {
      lo = 0;
      hi = 1;
    }

    if (lo >= hi) {
      if (
        current.length === 0
      ) {
        current.push(a);
      }

      current.push(b);
      continue;
    }

    touched = true;

    if (lo > 0) {
      if (
        current.length === 0
      ) {
        current.push(a);
      }

      current.push(
        lerp(a, b, lo)
      );
    }

    flush();

    if (hi < 1) {
      current = [
        lerp(a, b, hi),
        b,
      ];
    }
  }

  if (!touched) {
    return null;
  }

  flush();

  return pieces;
}