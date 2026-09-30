import { describe, expect, test } from "vitest";
import { StrokeHistory } from "../src/canvas/history";
import type { Stroke } from "../src/canvas/types";

const stroke = (id: number): Stroke => ({ id, width: 3, points: [] });

describe("StrokeHistory", () => {
  test("undo removes the last stroke, redo restores it", () => {
    const h = new StrokeHistory();
    h.commit(stroke(1));
    h.commit(stroke(2));

    h.undo();
    expect(h.all.map((s) => s.id)).toEqual([1]);

    h.redo();
    expect(h.all.map((s) => s.id)).toEqual([1, 2]);
  });

  test("committing after undo clears the redo stack", () => {
    const h = new StrokeHistory();
    h.commit(stroke(1));
    h.undo();
    h.commit(stroke(2));

    expect(h.redo()).toBe(false);
    expect(h.all.map((s) => s.id)).toEqual([2]);
  });

  test("undo/redo on empty history is safe", () => {
    const h = new StrokeHistory();
    expect(h.undo()).toBe(false);
    expect(h.redo()).toBe(false);
  });

  test("clear empties both stacks", () => {
    const h = new StrokeHistory();
    h.commit(stroke(1));
    h.undo();
    h.clear();

    expect(h.all.length).toBe(0);
    expect(h.redo()).toBe(false);
  });
});