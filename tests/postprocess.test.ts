import { describe, expect, it } from "vitest";
import { postprocessLabel } from "../src/recognition/postprocess";
import type { Stroke } from "../src/canvas/types";

function stroke(
  points: { x: number; y: number }[]
): Stroke {
  return {
    id: 1,
    width: 3,
    points: points.map((p, i) => ({
      x: p.x,
      y: p.y,
      time: i,
    })),
  };
}

describe("postprocessLabel", () => {
  it("converts two horizontal strokes to =", () => {
    const strokes = [
      stroke([
        { x: 20, y: 30 },
        { x: 80, y: 30 },
      ]),
      stroke([
        { x: 20, y: 50 },
        { x: 80, y: 50 },
      ]),
    ];

    expect(postprocessLabel(strokes, "-")).toBe("=");
  });

  it("keeps one horizontal stroke as -", () => {
    const strokes = [
      stroke([
        { x: 20, y: 40 },
        { x: 80, y: 40 },
      ]),
    ];

    expect(postprocessLabel(strokes, "-")).toBe("-");
  });

  it("does not change non-horizontal symbols", () => {
    const strokes = [
      stroke([
        { x: 20, y: 20 },
        { x: 80, y: 80 },
      ]),
      stroke([
        { x: 80, y: 20 },
        { x: 20, y: 80 },
      ]),
    ];

    expect(postprocessLabel(strokes, "×")).toBe("×");
  });
});