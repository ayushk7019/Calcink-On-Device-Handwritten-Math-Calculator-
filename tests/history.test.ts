import {
  describe,
  expect,
  test,
} from "vitest";

import { StrokeHistory } from "../src/canvas/history";
import type { Stroke } from "../src/canvas/types";

const stroke = (
  id: number
): Stroke => ({
  id,
  width: 3,
  points: [
    {
      x: id,
      y: 0,
      time: 0,
    },
    {
      x: id,
      y: 10,
      time: 1,
    },
  ],
});

describe("StrokeHistory", () => {
  test("commit stores strokes", () => {
    const h =
      new StrokeHistory();

    h.commit(stroke(1));
    h.commit(stroke(2));

    expect(
      h.all.map((s) => s.id)
    ).toEqual([1, 2]);
  });

  test("undo removes the latest committed stroke", () => {
    const h =
      new StrokeHistory();

    h.commit(stroke(1));
    h.commit(stroke(2));

    expect(h.undo()).toBe(true);

    expect(
      h.all.map((s) => s.id)
    ).toEqual([1]);
  });

  test("redo restores the latest undone stroke", () => {
    const h =
      new StrokeHistory();

    h.commit(stroke(1));
    h.commit(stroke(2));

    h.undo();

    expect(h.redo()).toBe(true);

    expect(
      h.all.map((s) => s.id)
    ).toEqual([1, 2]);
  });

  test("empty undo and redo return false", () => {
    const h =
      new StrokeHistory();

    expect(h.undo()).toBe(false);
    expect(h.redo()).toBe(false);
  });
});

describe("StrokeHistory erase", () => {
  const ids = (
    h: StrokeHistory
  ) =>
    h.all.map((s) => s.id);

  test(
    "erase removes strokes and undo restores them at their original positions",
    () => {
      const h =
        new StrokeHistory();

      [1, 2, 3, 4].forEach(
        (i) => h.commit(stroke(i))
      );

      expect(
        h.erase([2, 4])
      ).toBe(true);

      expect(ids(h)).toEqual([
        1,
        3,
      ]);

      expect(h.undo()).toBe(true);

      expect(ids(h)).toEqual([
        1,
        2,
        3,
        4,
      ]);
    }
  );

  test("redo erases again", () => {
    const h =
      new StrokeHistory();

    [1, 2, 3].forEach(
      (i) => h.commit(stroke(i))
    );

    h.erase([2]);
    h.undo();

    expect(h.redo()).toBe(true);

    expect(ids(h)).toEqual([
      1,
      3,
    ]);
  });

  test("one erase action is one undo step", () => {
    const h =
      new StrokeHistory();

    [1, 2, 3].forEach(
      (i) => h.commit(stroke(i))
    );

    h.erase([1, 3]);

    expect(h.undo()).toBe(true);

    expect(ids(h)).toEqual([
      1,
      2,
      3,
    ]);
  });

  test(
    "erasing unknown ids does nothing and leaves redo intact",
    () => {
      const h =
        new StrokeHistory();

      h.commit(stroke(1));
      h.undo();

      expect(
        h.erase([99])
      ).toBe(false);

      expect(h.redo()).toBe(true);

      expect(ids(h)).toEqual([
        1,
      ]);
    }
  );

  test("a new erase clears the redo branch", () => {
    const h =
      new StrokeHistory();

    [1, 2].forEach(
      (i) => h.commit(stroke(i))
    );

    h.undo();

    h.erase([1]);

    expect(h.redo()).toBe(false);
  });

  test("undo works through add and erase actions in order", () => {
    const h =
      new StrokeHistory();

    h.commit(stroke(1));
    h.commit(stroke(2));
    h.erase([1]);

    h.undo();
    h.undo();

    expect(ids(h)).toEqual([
      1,
    ]);
  });
});