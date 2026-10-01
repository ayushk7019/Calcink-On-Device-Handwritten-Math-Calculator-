import { describe, expect, test } from "vitest";
import { evaluate, formatResult } from "../src/math/evaluate";

describe("evaluate: valid expressions", () => {
  test.each([
    ["2+3", 5],
    ["18+4×3", 30],
    ["18+4×3=", 30],
    ["10-4-3", 3],
    ["100÷10÷5", 2],
    ["2+3×4-6÷2", 11],
    ["12.5+0.25", 12.75],
    [".5+.5", 1],
    ["-3+5", 2],
    ["5×-3", -15],
    ["5--3", 8],
    ["123456×2", 246912],
    ["7÷2", 3.5],
  ])("%s = %s", (src, expected) => {
    expect(evaluate(src)).toEqual({
      ok: true,
      value: expected,
    });
  });
});

describe("evaluate: division by zero", () => {
  test.each([
    "5÷0",
    "0÷0",
    "1÷0.0",
    "2+3÷0=",
    "5÷0×0",
  ])("%s is undefined", (src) => {
    expect(evaluate(src)).toEqual({
      ok: false,
      error: "undefined",
    });
  });
});

describe("evaluate: malformed input", () => {
  test.each([
    "",
    "=",
    "+",
    "2+",
    "×3",
    "2++3",
    "2×÷3",
    "1.2.3+4",
    ".",
    "2=3",
    "abc",
    "3x4",
  ])("'%s' is a syntax error", (src) => {
    expect(evaluate(src)).toEqual({
      ok: false,
      error: "syntax",
    });
  });

  test("never throws on random garbage", () => {
    const alphabet = "0123456789+-×÷.=x ";

    let seed = 12345;

    const rand = () => {
      seed =
        (seed * 1103515245 + 12345) &
        0x7fffffff;

      return seed / 0x7fffffff;
    };

    for (let n = 0; n < 2000; n++) {
      let s = "";

      const len = Math.floor(rand() * 12);

      for (let i = 0; i < len; i++) {
        s += alphabet[
          Math.floor(rand() * alphabet.length)
        ];
      }

      expect(() => evaluate(s)).not.toThrow();
    }
  });
});

describe("formatResult", () => {
  test.each([
    [0.1 + 0.2, "0.3"],
    [30, "30"],
    [3.5, "3.5"],
    [-0, "0"],
    [1 / 3, "0.333333333333"],
  ])("%s -> %s", (value, expected) => {
    expect(formatResult(value)).toBe(expected);
  });
});