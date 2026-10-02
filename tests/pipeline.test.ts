import { describe, expect, test } from "vitest";
import {
  recognizeExpression,
  type Classifier,
} from "../src/recognition/pipeline";
import type { Stroke } from "../src/canvas/types";

const stroke = (
  id: number,
  pts: [number, number][]
): Stroke => ({
  id,
  width: 3,
  points: pts.map(([x, y], i) => ({
    x,
    y,
    time: i,
  })),
});

const fake = (
  labels: Record<number, string>
): Classifier =>
  async (group) => ({
    label: labels[group[0].id] ?? "?",
    confidence: 1,
  });

const expression18 = [
  stroke(1, [
    [10, 10],
    [10, 60],
  ]),
  stroke(2, [
    [30, 10],
    [50, 10],
    [50, 60],
    [30, 60],
    [30, 10],
  ]),
  stroke(3, [
    [100, 10],
    [100, 70],
  ]),
  stroke(4, [
    [80, 40],
    [120, 40],
  ]),
  stroke(5, [
    [160, 10],
    [160, 60],
  ]),
  stroke(6, [
    [200, 10],
    [240, 50],
  ]),
  stroke(7, [
    [240, 10],
    [200, 50],
  ]),
  stroke(8, [
    [280, 10],
    [310, 10],
    [310, 60],
  ]),
  stroke(9, [
    [320, 30],
    [360, 30],
  ]),
  stroke(10, [
    [320, 50],
    [360, 50],
  ]),
];

const labels18 = {
  1: "1",
  2: "8",
  3: "+",
  5: "4",
  6: "×",
  8: "3",
  9: "=",
};

describe("recognizeExpression", () => {
  test(
    "a tiny group next to normal symbols is a decimal point, without asking the model",
    async () => {
      const strokes = [
        stroke(1, [
          [10, 10],
          [10, 60],
        ]),
        stroke(2, [
          [40, 58],
          [41, 59],
        ]),
        stroke(3, [
          [70, 10],
          [100, 10],
          [100, 60],
        ]),
        stroke(4, [
          [130, 30],
          [170, 30],
        ]),
        stroke(5, [
          [130, 50],
          [170, 50],
        ]),
      ];

      const out =
        await recognizeExpression(
          strokes,
          fake({
            1: "1",
            2: "×",
            3: "5",
            4: "=",
          })
        );

      expect(out.text).toBe("1.5=");

      expect(out.result).toEqual({
        ok: true,
        value: 1.5,
      });
    }
  );

  test(
    "18+4×3= is segmented, joined and evaluated",
    async () => {
      const out =
        await recognizeExpression(
          expression18,
          fake(labels18)
        );

      expect(out.text).toBe(
        "18+4×3="
      );

      expect(out.result).toEqual({
        ok: true,
        value: 30,
      });

      expect(out.symbols).toHaveLength(
        7
      );
    }
  );

  test(
    "drawing order does not matter, only position",
    async () => {
      const shuffled =
        [...expression18].reverse();

      const out =
        await recognizeExpression(
          shuffled,
          fake({
            1: "1",
            2: "8",
            3: "+",
            4: "+",
            5: "4",
            6: "×",
            7: "×",
            8: "3",
            9: "=",
            10: "=",
          })
        );

      expect(out.text).toBe(
        "18+4×3="
      );
    }
  );

  test(
    "expression without trailing = is not evaluated",
    async () => {
      const out =
        await recognizeExpression(
          expression18.slice(0, 8),
          fake(labels18)
        );

      expect(out.text).toBe(
        "18+4×3"
      );

      expect(out.result).toBeNull();
    }
  );

  test(
    "division by zero reports undefined",
    async () => {
      const strokes = [
        stroke(1, [
          [10, 10],
          [40, 10],
          [40, 60],
        ]),
        stroke(2, [
          [100, 30],
          [140, 30],
        ]),
        stroke(3, [
          [200, 10],
          [230, 10],
          [230, 60],
          [200, 60],
          [200, 10],
        ]),
        stroke(4, [
          [300, 30],
          [340, 30],
        ]),
        stroke(5, [
          [300, 50],
          [340, 50],
        ]),
      ];

      const out =
        await recognizeExpression(
          strokes,
          fake({
            1: "5",
            2: "÷",
            3: "0",
            4: "=",
          })
        );

      expect(out.result).toEqual({
        ok: false,
        error: "undefined",
      });
    }
  );

  test(
    "X produces syntax error instead of a wrong answer",
    async () => {
      const strokes = [
        stroke(1, [
          [10, 10],
          [40, 10],
          [40, 60],
        ]),
        stroke(2, [
          [100, 10],
          [130, 40],
        ]),
        stroke(3, [
          [200, 10],
          [230, 10],
          [230, 60],
        ]),
        stroke(4, [
          [300, 30],
          [340, 30],
        ]),
        stroke(5, [
          [300, 50],
          [340, 50],
        ]),
      ];

      const out =
        await recognizeExpression(
          strokes,
          fake({
            1: "2",
            2: "X",
            3: "3",
            4: "=",
          })
        );

      expect(out.result).toEqual({
        ok: false,
        error: "syntax",
      });
    }
  );

  test(
    "empty canvas gives no symbols and no result",
    async () => {
      const out =
        await recognizeExpression(
          [],
          fake({})
        );

      expect(out).toEqual({
        symbols: [],
        text: "",
        result: null,
      });
    }
  );
});