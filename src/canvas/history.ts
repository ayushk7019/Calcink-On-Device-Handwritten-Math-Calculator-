import type { Stroke } from "./types";

export class StrokeHistory {
  private strokes: Stroke[] = [];
  private redoStack: Stroke[] = [];

  commit(stroke: Stroke) {
    this.strokes.push(stroke);
    this.redoStack = [];
  }

  undo(): boolean {
    const s = this.strokes.pop();

    if (!s) return false;

    this.redoStack.push(s);
    return true;
  }

  redo(): boolean {
    const s = this.redoStack.pop();

    if (!s) return false;

    this.strokes.push(s);
    return true;
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
  }

  get all(): readonly Stroke[] {
    return this.strokes;
  }
}