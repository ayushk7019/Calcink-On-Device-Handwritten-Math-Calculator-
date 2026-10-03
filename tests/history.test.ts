import {
  describe,
  expect,
  test,
} from "vitest";

import {
  StrokeHistory,
} from "../src/canvas/history";

import type {
  Stroke,
} from "../src/canvas/types";

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

describe(
  "StrokeHistory",
  () => {
    test(
      "commit stores strokes",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.commit(
          stroke(2)
        );

        expect(
          h.all.map(
            (s) => s.id
          )
        ).toEqual([
          1,
          2,
        ]);
      }
    );

    test(
      "undo removes the latest committed stroke",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.commit(
          stroke(2)
        );

        expect(
          h.undo()
        ).toBe(true);

        expect(
          h.all.map(
            (s) => s.id
          )
        ).toEqual([
          1,
        ]);
      }
    );

    test(
      "redo restores the latest undone stroke",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.commit(
          stroke(2)
        );

        h.undo();

        expect(
          h.redo()
        ).toBe(true);

        expect(
          h.all.map(
            (s) => s.id
          )
        ).toEqual([
          1,
          2,
        ]);
      }
    );

    test(
      "empty undo and redo return false",
      () => {
        const h =
          new StrokeHistory();

        expect(
          h.undo()
        ).toBe(false);

        expect(
          h.redo()
        ).toBe(false);
      }
    );
  }
);

describe(
  "StrokeHistory erase",
  () => {
    const ids = (
      h: StrokeHistory
    ) =>
      h.all.map(
        (s) => s.id
      );

    test(
      "erase removes strokes and undo restores them at their original positions",
      () => {
        const h =
          new StrokeHistory();

        [1, 2, 3, 4].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        expect(
          h.erase([2, 4])
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          3,
        ]);

        expect(
          h.undo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          2,
          3,
          4,
        ]);
      }
    );

    test(
      "redo erases again",
      () => {
        const h =
          new StrokeHistory();

        [1, 2, 3].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        h.erase([2]);
        h.undo();

        expect(
          h.redo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          3,
        ]);
      }
    );

    test(
      "one erase action is one undo step",
      () => {
        const h =
          new StrokeHistory();

        [1, 2, 3].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        h.erase([1, 3]);

        expect(
          h.undo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          2,
          3,
        ]);
      }
    );

    test(
      "erasing unknown ids does nothing and leaves redo intact",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.undo();

        expect(
          h.erase([99])
        ).toBe(false);

        expect(
          h.redo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
        ]);
      }
    );

    test(
      "a new erase clears the redo branch",
      () => {
        const h =
          new StrokeHistory();

        [1, 2].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        h.undo();

        h.erase([1]);

        expect(
          h.redo()
        ).toBe(false);
      }
    );

    test(
      "undo works through add and erase actions in order",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.commit(
          stroke(2)
        );

        h.erase([1]);

        h.undo();
        h.undo();

        expect(
          ids(h)
        ).toEqual([
          1,
        ]);
      }
    );
  }
);

describe(
  "StrokeHistory replace (pixel erase)",
  () => {
    const ids = (
      h: StrokeHistory
    ) =>
      h.all.map(
        (s) => s.id
      );

    test(
      "replace swaps a stroke for its pieces in place; undo and redo round-trip",
      () => {
        const h =
          new StrokeHistory();

        [1, 2, 3].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        expect(
          h.replace([
            {
              id: 2,
              pieces: [
                stroke(10),
                stroke(11),
              ],
            },
          ])
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          10,
          11,
          3,
        ]);

        expect(
          h.undo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          2,
          3,
        ]);

        expect(
          h.redo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
          10,
          11,
          3,
        ]);
      }
    );

    test(
      "a replacement with no pieces removes the stroke; undo restores its position",
      () => {
        const h =
          new StrokeHistory();

        [1, 2, 3].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        h.replace([
          {
            id: 2,
            pieces: [],
          },
        ]);

        expect(
          ids(h)
        ).toEqual([
          1,
          3,
        ]);

        h.undo();

        expect(
          ids(h)
        ).toEqual([
          1,
          2,
          3,
        ]);
      }
    );

    test(
      "several strokes changed in one replace are one undo step",
      () => {
        const h =
          new StrokeHistory();

        [1, 2, 3].forEach(
          (i) =>
            h.commit(
              stroke(i)
            )
        );

        h.replace([
          {
            id: 1,
            pieces: [
              stroke(10),
            ],
          },
          {
            id: 3,
            pieces: [],
          },
        ]);

        expect(
          ids(h)
        ).toEqual([
          10,
          2,
        ]);

        h.undo();

        expect(
          ids(h)
        ).toEqual([
          1,
          2,
          3,
        ]);
      }
    );

    test(
      "unknown ids change nothing and keep the redo branch",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.undo();

        expect(
          h.replace([
            {
              id: 99,
              pieces: [],
            },
          ])
        ).toBe(false);

        expect(
          h.redo()
        ).toBe(true);

        expect(
          ids(h)
        ).toEqual([
          1,
        ]);
      }
    );

    test(
      "undo steps back through add, replace and erase in order",
      () => {
        const h =
          new StrokeHistory();

        h.commit(
          stroke(1)
        );

        h.commit(
          stroke(2)
        );

        h.replace([
          {
            id: 1,
            pieces: [
              stroke(10),
              stroke(11),
            ],
          },
        ]);

        h.erase([2]);

        h.undo();

        expect(
          ids(h)
        ).toEqual([
          10,
          11,
          2,
        ]);

        h.undo();

        expect(
          ids(h)
        ).toEqual([
          1,
          2,
        ]);

        h.undo();

        expect(
          ids(h)
        ).toEqual([
          1,
        ]);
      }
    );
  }
);