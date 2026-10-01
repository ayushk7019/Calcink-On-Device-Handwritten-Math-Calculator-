import { describe, expect, test } from "vitest";
import { squareBox } from "../src/recognition/geometry";
import type { Stroke } from "../src/canvas/types";

const stroke = (
  points: [number, number][]
): Stroke => ({
  id: 1,
  width: 3,
  points: points.map(([x, y], i) => ({
    x,
    y,
    time: i,
  })),
});

describe("squareBox", () => {
  test("creates a square around the strokes", () => {
    const box = squareBox([
      stroke([
        [10, 20],
        [30, 40],
      ]),
    ]);

    expect(box).toEqual({
      x: 10,
      y: 20,
      size: 20,
    });
  });

  test("returns null for empty strokes", () => {
    expect(squareBox([])).toBeNull();
  });

  test("handles a single point", () => {
    const box = squareBox([
      stroke([[50, 60]]),
    ]);

    expect(box).toEqual({
    x: 49.5,
    y: 59.5,
    size: 1,
    });
  });
});