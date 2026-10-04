import { describe, expect, test } from "vitest";
import { confidenceLevel, symbolOverlays } from "../src/recognition/overlayLayout";
import type { RecognizedSymbol } from "../src/recognition/pipeline";

const sym = (
  label: string,
  confidence: number,
  left = 10,
  top = 20,
  right = 50,
  bottom = 70
): RecognizedSymbol => ({
  label,
  confidence,
  rect: { left, top, right, bottom },
});

describe("confidenceLevel", () => {
  test.each([
    [1, "high"],
    [0.9, "high"],
    [0.89, "medium"],
    [0.6, "medium"],
    [0.59, "low"],
    [0, "low"],
  ])("%s -> %s", (c, level) => {
    expect(confidenceLevel(c)).toBe(level);
  });
});

describe("symbolOverlays", () => {
  test("pads the symbol rectangle by 4 px on each side", () => {
    const [o] = symbolOverlays([sym("7", 0.92)]);
    expect(o).toMatchObject({ x: 6, y: 16, w: 48, h: 58 });
  });

  test("formats the label and rounds the percentage", () => {
    expect(symbolOverlays([sym("7", 0.924)])[0].text).toBe("7 92%");
    expect(symbolOverlays([sym("÷", 0.995)])[0].text).toBe("÷ 100%");
  });

  test("a tiny group (a decimal point) still gets a visible box, centred on it", () => {
    const [o] = symbolOverlays([sym(".", 1, 100, 100, 101, 101)]);
    expect(o.w).toBe(14);
    expect(o.h).toBe(14);
    expect(o.x).toBeCloseTo(93.5);
    expect(o.y).toBeCloseTo(93.5);
  });

  test("keeps the symbol order and assigns a level to each", () => {
    const out = symbolOverlays([
      sym("1", 0.99),
      sym("+", 0.7),
      sym("2", 0.3),
    ]);
    expect(out.map((o) => o.level)).toEqual(["high", "medium", "low"]);
  });

  test("out-of-range confidence is clamped", () => {
    expect(symbolOverlays([sym("5", 1.4)])[0].text).toBe("5 100%");
    expect(symbolOverlays([sym("5", -0.2)])[0].text).toBe("5 0%");
  });

  test("no symbols gives no overlays", () => {
    expect(symbolOverlays([])).toEqual([]);
  });
});
