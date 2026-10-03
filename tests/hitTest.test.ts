import {
  describe,
  expect,
  test,
} from "vitest";

import { strokeHit } from "../src/canvas/hitTest";
import type { Stroke } from "../src/canvas/types";

const stroke = (
  pts: [number, number][],
  width = 3
): Stroke => ({
  id: 1,
  width,
  points: pts.map(
    ([x, y], i) => ({
      x,
      y,
      time: i,
    })
  ),
});

describe("strokeHit", () => {
  const line = stroke([
    [0, 0],
    [100, 0],
  ]);

  test(
    "a point on the stroke hits",
    () => {
      expect(
        strokeHit(
          line,
          50,
          0,
          0
        )
      ).toBe(true);
    }
  );

  test(
    "the middle of a long segment hits",
    () => {
      expect(
        strokeHit(
          line,
          50,
          4,
          5
        )
      ).toBe(true);
    }
  );

  test(
    "a point beyond the radius misses",
    () => {
      expect(
        strokeHit(
          line,
          50,
          30,
          10
        )
      ).toBe(false);
    }
  );

  test(
    "beyond the end of the segment is measured to the endpoint",
    () => {
      expect(
        strokeHit(
          line,
          110,
          0,
          8
        )
      ).toBe(false);

      expect(
        strokeHit(
          line,
          106,
          0,
          8
        )
      ).toBe(true);
    }
  );

  test(
    "a single-point stroke is hit within its radius",
    () => {
      const dot = stroke([
        [20, 20],
      ]);

      expect(
        strokeHit(
          dot,
          24,
          20,
          5
        )
      ).toBe(true);

      expect(
        strokeHit(
          dot,
          40,
          20,
          5
        )
      ).toBe(false);
    }
  );

  test(
    "an empty stroke never hits",
    () => {
      expect(
        strokeHit(
          stroke([]),
          0,
          0,
          100
        )
      ).toBe(false);
    }
  );
});