import type { Stroke } from "./types";

type Change = {
  index: number;
  original: Stroke;
  pieces: Stroke[];
};

type Action =
  | {
      type: "add";
      stroke: Stroke;
    }
  | {
      type: "edit";
      changes: Change[];
    };

export class StrokeHistory {
  private strokes: Stroke[] = [];
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];

  commit(
    stroke: Stroke
  ) {
    this.strokes.push(
      stroke
    );

    this.undoStack.push({
      type: "add",
      stroke,
    });

    this.redoStack = [];
  }

  replace(
    replacements: {
      id: number;
      pieces: Stroke[];
    }[]
  ): boolean {
    const byId =
      new Map(
        replacements.map(
          (replacement) => [
            replacement.id,
            replacement.pieces,
          ]
        )
      );

    const changes: Change[] =
      [];

    this.strokes.forEach(
      (stroke, index) => {
        const pieces =
          byId.get(stroke.id);

        if (pieces) {
          changes.push({
            index,
            original: stroke,
            pieces,
          });
        }
      }
    );

    if (
      changes.length === 0
    ) {
      return false;
    }

    this.applyEdit(
      changes
    );

    this.undoStack.push({
      type: "edit",
      changes,
    });

    this.redoStack = [];

    return true;
  }

  erase(
    ids: Iterable<number>
  ): boolean {
    return this.replace(
      [...ids].map(
        (id) => ({
          id,
          pieces: [],
        })
      )
    );
  }

  undo(): boolean {
    const action =
      this.undoStack.pop();

    if (!action) {
      return false;
    }

    if (
      action.type === "add"
    ) {
      this.strokes =
        this.strokes.filter(
          (stroke) =>
            stroke !==
            action.stroke
        );
    } else {
      this.revertEdit(
        action.changes
      );
    }

    this.redoStack.push(
      action
    );

    return true;
  }

  redo(): boolean {
    const action =
      this.redoStack.pop();

    if (!action) {
      return false;
    }

    if (
      action.type === "add"
    ) {
      this.strokes.push(
        action.stroke
      );
    } else {
      this.applyEdit(
        action.changes
      );
    }

    this.undoStack.push(
      action
    );

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

  private applyEdit(
    changes: Change[]
  ) {
    const pieces =
      new Map(
        changes.map(
          (change) => [
            change.original,
            change.pieces,
          ]
        )
      );

    const next: Stroke[] =
      [];

    for (
      const stroke of
      this.strokes
    ) {
      const replacement =
        pieces.get(stroke);

      if (replacement) {
        next.push(
          ...replacement
        );
      } else {
        next.push(stroke);
      }
    }

    this.strokes = next;
  }

  private revertEdit(
    changes: Change[]
  ) {
    const gone =
      new Set(
        changes.flatMap(
          (change) =>
            change.pieces
        )
      );

    const rest =
      this.strokes.filter(
        (stroke) =>
          !gone.has(stroke)
      );

    for (
      const change of changes
    ) {
      rest.splice(
        change.index,
        0,
        change.original
      );
    }

    this.strokes = rest;
  }
}