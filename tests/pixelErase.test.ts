import {
  describe,
  expect,
  test,
} from "vitest";

import {
  erasePieces,
} from "../src/canvas/pixelErase";

const P = (
  pts: [number, number][]
) =>
  pts.map(
    ([x, y], i) => ({
      x,
      y,
      time: i,
    })
  );

const xy = (
  piece: {
    x: number;
    y: number;
  }[]
) =>
  piece.map(
    (p) => [
      p.x,
      p.y,
    ]
  );

describe(
  "erasePieces",
  () => {
    const line =
      P([
        [0, 0],
        [100, 0],
      ]);

    test(
      "a circle that does not touch the stroke leaves it unchanged (null)",
      () => {
        expect(
          erasePieces(
            line,
            50,
            30,
            10
          )
        ).toBeNull();
      }
    );

    test(
      "a near miss (distance 11, radius 10) is null",
      () => {
        expect(
          erasePieces(
            line,
            50,
            11,
            10
          )
        ).toBeNull();
      }
    );

    test(
      "a tangent touch is not an erase",
      () => {
        expect(
          erasePieces(
            line,
            50,
            10,
            10
          )
        ).toBeNull();
      }
    );

    test(
      "erasing the middle splits one stroke into two, even with no recorded point inside",
      () => {
        const out =
          erasePieces(
            line,
            50,
            0,
            10
          )!;

        expect(
          out
        ).toHaveLength(2);

        expect(
          xy(out[0])[0]
        ).toEqual([
          0,
          0,
        ]);

        expect(
          out[0][1].x
        ).toBeCloseTo(40);

        expect(
          out[1][0].x
        ).toBeCloseTo(60);

        expect(
          xy(out[1])[1]
        ).toEqual([
          100,
          0,
        ]);
      }
    );

    test(
      "erasing the end trims the stroke",
      () => {
        const out =
          erasePieces(
            line,
            100,
            0,
            10
          )!;

        expect(
          out
        ).toHaveLength(1);

        expect(
          out[0][1].x
        ).toBeCloseTo(90);
      }
    );

    test(
      "erasing the start trims the stroke",
      () => {
        const out =
          erasePieces(
            line,
            0,
            0,
            10
          )!;

        expect(
          out
        ).toHaveLength(1);

        expect(
          out[0][0].x
        ).toBeCloseTo(10);

        expect(
          xy(out[0])[1]
        ).toEqual([
          100,
          0,
        ]);
      }
    );

    test(
      "a circle covering the whole stroke returns an empty list, not null",
      () => {
        expect(
          erasePieces(
            line,
            50,
            0,
            200
          )
        ).toEqual([]);
      }
    );

    test(
      "a recorded point inside the circle is removed from a multi-point stroke",
      () => {
        const out =
          erasePieces(
            P([
              [0, 0],
              [50, 0],
              [100, 0],
            ]),
            50,
            0,
            5
          )!;

        expect(
          out
        ).toHaveLength(2);

        expect(
          out[0][
            out[0].length - 1
          ].x
        ).toBeCloseTo(45);

        expect(
          out[1][0].x
        ).toBeCloseTo(55);
      }
    );

    test(
      "a single-point stroke (a dot) is removed when inside",
      () => {
        expect(
          erasePieces(
            P([
              [20, 20],
            ]),
            22,
            20,
            5
          )
        ).toEqual([]);
      }
    );

    test(
      "a single-point stroke outside is untouched",
      () => {
        expect(
          erasePieces(
            P([
              [20, 20],
            ]),
            60,
            20,
            5
          )
        ).toBeNull();
      }
    );

    test(
      "tiny leftovers are dropped so they cannot be read as decimal points",
      () => {
        expect(
          erasePieces(
            line,
            50,
            0,
            49
          )
        ).toEqual([]);
      }
    );

    test(
      "interpolated boundary points get an interpolated timestamp",
      () => {
        const out =
          erasePieces(
            line,
            50,
            0,
            10
          )!;

        expect(
          out[0][1].time
        ).toBeCloseTo(0.4);

        expect(
          out[1][0].time
        ).toBeCloseTo(0.6);
      }
    );
  }
);