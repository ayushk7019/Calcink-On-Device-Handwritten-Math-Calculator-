import type { Stroke } from "./types";

type Removed = {
  index: number;
  stroke: Stroke;
};

type Action =
  | {
      type: "add";
      stroke: Stroke;
    }
  | {
      type: "erase";
      removed: Removed[];
    };

export class StrokeHistory {
  private strokes: Stroke[] = [];
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];

  commit(stroke: Stroke) {
    this.strokes.push(stroke);
    this.undoStack.push({
      type: "add",
      stroke,
    });
    this.redoStack = [];
  }

  erase(ids: Iterable<number>): boolean {
    const idSet = new Set(ids);
    const removed: Removed[] = [];

    this.strokes.forEach(
      (stroke, index) => {
        if (idSet.has(stroke.id)) {
          removed.push({
            index,
            stroke,
          });
        }
      }
    );

    if (removed.length === 0) {
      return false;
    }

    this.strokes =
      this.strokes.filter(
        (stroke) =>
          !idSet.has(stroke.id)
      );

    this.undoStack.push({
      type: "erase",
      removed,
    });

    this.redoStack = [];

    return true;
  }

  undo(): boolean {
    const action =
      this.undoStack.pop();

    if (!action) {
      return false;
    }

    if (action.type === "add") {
      this.strokes =
        this.strokes.filter(
          (stroke) =>
            stroke !== action.stroke
        );
    } else {
      for (
        const removed of action.removed
      ) {
        this.strokes.splice(
          removed.index,
          0,
          removed.stroke
        );
      }
    }

    this.redoStack.push(action);

    return true;
  }

  redo(): boolean {
    const action =
      this.redoStack.pop();

    if (!action) {
      return false;
    }

    if (action.type === "add") {
      this.strokes.push(
        action.stroke
      );
    } else {
      const erased = new Set(
        action.removed.map(
          (removed) =>
            removed.stroke
        )
      );

      this.strokes =
        this.strokes.filter(
          (stroke) =>
            !erased.has(stroke)
        );
    }

    this.undoStack.push(action);

    return true;
  }

  clear() {
    this.strokes = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  get all(): readonly Stroke[] {
    return this.strokes;
  }
}