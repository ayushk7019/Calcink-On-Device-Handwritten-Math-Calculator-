import { describe, expect, test } from "vitest";
import { screenToCanvas } from "../src/canvas/coordinates";

describe("screenToCanvas", () => {
  test("subtracts the canvas origin", () => {
    expect(screenToCanvas(150, 90, { left: 100, top: 50 })).toEqual({
      x: 50,
      y: 40,
    });
  });

  test("returns zero at the canvas origin", () => {
    expect(screenToCanvas(100, 50, { left: 100, top: 50 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});