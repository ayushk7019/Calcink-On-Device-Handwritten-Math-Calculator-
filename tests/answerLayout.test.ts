import { describe, expect, test } from "vitest";
import { answerAnnotation } from "../src/recognition/answerLayout";
import type {
  ExpressionResult,
  RecognizedSymbol,
} from "../src/recognition/pipeline";

const sym = (
  label: string,
  left: number,
  top: number,
  right: number,
  bottom: number
): RecognizedSymbol => ({
  label,
  confidence: 1,
  rect: {
    left,
    top,
    right,
    bottom,
  },
});

const symbols = (digitH = 40) => [
  sym(
    "2",
    10,
    100,
    40,
    100 + digitH
  ),
  sym(
    "+",
    60,
    105,
    100,
    135
  ),
  sym(
    "3",
    120,
    100,
    150,
    100 + digitH
  ),
  sym(
    "=",
    160,
    120,
    200,
    140
  ),
];

const out = (
  result: ExpressionResult["result"],
  syms = symbols()
): ExpressionResult => ({
  symbols: syms,
  text: syms
    .map((s) => s.label)
    .join(""),
  result,
});

describe("answerAnnotation", () => {
  test(
    "places the answer to the right of '=' and centers it vertically",
    () => {
      const a = answerAnnotation(
        out({
          ok: true,
          value: 5,
        })
      )!;

      expect(a.text).toBe("5");
      expect(a.x).toBeGreaterThan(200);
      expect(a.y).toBe(130);
      expect(a.kind).toBe("answer");
    }
  );

  test(
    "no result yet gives no annotation",
    () => {
      expect(
        answerAnnotation(out(null))
      ).toBeNull();
    }
  );

  test(
    "division by zero reads Undefined",
    () => {
      const a = answerAnnotation(
        out({
          ok: false,
          error: "undefined",
        })
      )!;

      expect(a.text).toBe("Undefined");
      expect(a.kind).toBe("undefined");
    }
  );

  test(
    "syntax errors read Error",
    () => {
      const a = answerAnnotation(
        out({
          ok: false,
          error: "syntax",
        })
      )!;

      expect(a.text).toBe("Error");
      expect(a.kind).toBe("error");
    }
  );

  test(
    "floating-point noise is hidden",
    () => {
      const a = answerAnnotation(
        out({
          ok: true,
          value: 0.1 + 0.2,
        })
      )!;

      expect(a.text).toBe("0.3");
    }
  );

  test(
    "answer size follows handwriting size within limits",
    () => {
      const small = answerAnnotation(
        out(
          {
            ok: true,
            value: 5,
          },
          symbols(30)
        )
      )!;

      const big = answerAnnotation(
        out(
          {
            ok: true,
            value: 5,
          },
          symbols(90)
        )
      )!;

      const huge = answerAnnotation(
        out(
          {
            ok: true,
            value: 5,
          },
          symbols(900)
        )
      )!;

      expect(big.size).toBeGreaterThan(
        small.size
      );

      expect(huge.size).toBeLessThanOrEqual(
        120
      );
    }
  );
});