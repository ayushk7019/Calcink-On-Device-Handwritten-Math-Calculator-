import { describe, expect, test } from "vitest";
import { segmentStrokes } from "../src/recognition/segment";
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

const ids = (strokes: Stroke[]) =>
  segmentStrokes(strokes).map((g) =>
    g.strokes.map((s) => s.id)
  );

describe(
  "segmentStrokes: multi-stroke symbols stay together",
  () => {
    test("= : two stacked bars", () => {
      expect(
        ids([
          stroke(1, [
            [20, 40],
            [80, 40],
          ]),
          stroke(2, [
            [25, 60],
            [75, 60],
          ]),
        ])
      ).toEqual([[1, 2]]);
    });

    test(
      "+ : vertical bar crossing a horizontal bar",
      () => {
        expect(
          ids([
            stroke(1, [
              [50, 10],
              [50, 70],
            ]),
            stroke(2, [
              [20, 40],
              [80, 40],
            ]),
          ])
        ).toEqual([[1, 2]]);
      }
    );

    test("× : two crossing diagonals", () => {
      expect(
        ids([
          stroke(1, [
            [20, 10],
            [60, 50],
          ]),
          stroke(2, [
            [60, 10],
            [20, 50],
          ]),
        ])
      ).toEqual([[1, 2]]);
    });

    test("÷ : dot, bar, dot", () => {
      expect(
        ids([
          stroke(1, [
            [50, 20],
            [50, 21],
          ]),
          stroke(2, [
            [20, 40],
            [80, 40],
          ]),
          stroke(3, [
            [50, 60],
            [50, 61],
          ]),
        ])
      ).toEqual([[1, 2, 3]]);
    });

    test(
      "÷ drawn dot, dot, bar (needs repeated merging)",
      () => {
        expect(
          ids([
            stroke(1, [
              [50, 20],
              [50, 21],
            ]),
            stroke(2, [
              [50, 60],
              [50, 61],
            ]),
            stroke(3, [
              [20, 40],
              [80, 40],
            ]),
          ]).map((g) => g.length)
        ).toEqual([3]);
      }
    );

    test(
      "5 with a separate top bar",
      () => {
        expect(
          ids([
            stroke(1, [
              [22, 18],
              [22, 35],
              [45, 35],
              [45, 58],
              [22, 58],
            ]),
            stroke(2, [
              [20, 10],
              [48, 10],
            ]),
          ])
        ).toEqual([[1, 2]]);
      }
    );
  }
);

describe(
  "segmentStrokes: separate symbols stay apart",
  () => {
    test(
      "two minus signs side by side",
      () => {
        expect(
          ids([
            stroke(1, [
              [20, 40],
              [60, 40],
            ]),
            stroke(2, [
              [100, 40],
              [140, 40],
            ]),
          ])
        ).toEqual([[1], [2]]);
      }
    );

    test("1 and 8", () => {
      expect(
        ids([
          stroke(1, [
            [12, 10],
            [12, 60],
          ]),
          stroke(2, [
            [30, 10],
            [50, 10],
            [50, 35],
            [30, 35],
            [30, 60],
            [50, 60],
            [50, 35],
          ]),
        ])
      ).toEqual([[1], [2]]);
    });

    test(
      "slightly overlapping neighbours (slanted 1 next to 2)",
      () => {
        expect(
          ids([
            stroke(1, [
              [10, 10],
              [20, 60],
            ]),
            stroke(2, [
              [18, 15],
              [40, 15],
              [40, 35],
              [18, 60],
              [40, 60],
            ]),
          ])
        ).toEqual([[1], [2]]);
      }
    );
  }
);

describe(
  "segmentStrokes: ordering and edge cases",
  () => {
    test(
      "groups are sorted left to right, not by drawing order",
      () => {
        expect(
          ids([
            stroke(1, [
              [30, 10],
              [50, 10],
              [50, 60],
            ]),
            stroke(2, [
              [10, 10],
              [10, 60],
            ]),
          ])
        ).toEqual([[2], [1]]);
      }
    );

    test(
      "no strokes gives no groups",
      () => {
        expect(segmentStrokes([])).toEqual([]);
      }
    );

    test(
      "strokes with no points are ignored",
      () => {
        expect(
          segmentStrokes([
            stroke(1, []),
          ])
        ).toEqual([]);
      }
    );
  }
);

describe(
  "segmentStrokes: decimal points stay separate",
  () => {
    test(
      "decimal point stays separate from a digit",
      () => {
        expect(
          ids([
            stroke(1, [
              [20, 10],
              [60, 10],
              [60, 35],
              [20, 60],
              [60, 60],
            ]),
            stroke(2, [
              [48, 68],
              [49, 69],
            ]),
          ])
        ).toEqual([
          [1],
          [2],
        ]);
      }
    );

    test(
      "decimal point stays separate from another digit",
      () => {
        expect(
          ids([
            stroke(1, [
              [20, 10],
              [60, 10],
              [60, 60],
              [20, 60],
            ]),
            stroke(2, [
              [70, 10],
              [70, 60],
            ]),
            stroke(3, [
              [78, 68],
              [79, 69],
            ]),
          ])
        ).toEqual([
          [1],
          [2],
          [3],
        ]);
      }
    );

    test(
      "division dots still merge through the bar",
      () => {
        expect(
          ids([
            stroke(1, [
              [50, 20],
              [51, 21],
            ]),
            stroke(2, [
              [20, 40],
              [80, 40],
            ]),
            stroke(3, [
              [50, 60],
              [51, 61],
            ]),
          ])
        ).toEqual([
          [1, 2, 3],
        ]);
      }
    );

    test(
      "thick handwritten division bar merges with dots",
      () => {
        expect(
          ids([
            stroke(1, [
              [299, 177],
              [300, 178],
            ]),
            stroke(2, [
              [275, 201],
              [317, 222],
            ]),
            stroke(3, [
              [299, 248],
              [300, 249],
            ]),
          ])
        ).toEqual([
          [1, 2, 3],
        ]);
      }
    );
  }
);