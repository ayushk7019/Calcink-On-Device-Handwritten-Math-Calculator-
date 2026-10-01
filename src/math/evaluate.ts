export type EvalResult =
  | {
      ok: true;
      value: number;
    }
  | {
      ok: false;
      error: "syntax" | "undefined";
    };

type Op = "+" | "-" | "*" | "/";

type Token =
  | {
      type: "num";
      value: number;
    }
  | {
      type: "op";
      op: Op;
    };

class Fail extends Error {
  kind: "syntax" | "undefined";

  constructor(kind: "syntax" | "undefined") {
    super(kind);
    this.kind = kind;
  }
}

const OPS: Record<string, Op> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "×": "*",
  "*": "*",
  "÷": "/",
  "/": "/",
};

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];

  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (ch in OPS) {
      tokens.push({
        type: "op",
        op: OPS[ch],
      });

      i++;
    } else if (
      (ch >= "0" && ch <= "9") ||
      ch === "."
    ) {
      let j = i;
      let dots = 0;
      let digits = 0;

      while (
        j < src.length &&
        (
          (src[j] >= "0" && src[j] <= "9") ||
          src[j] === "."
        )
      ) {
        if (src[j] === ".") {
          dots++;
        } else {
          digits++;
        }

        j++;
      }

      if (dots > 1 || digits === 0) {
        throw new Fail("syntax");
      }

      const text = src.slice(i, j);
      const value = Number(text);

      if (!Number.isFinite(value)) {
        throw new Fail("syntax");
      }

      tokens.push({
        type: "num",
        value,
      });

      i = j;
    } else {
      throw new Fail("syntax");
    }
  }

  return tokens;
}

class Parser {
  private i = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): number {
    const value = this.expr();

    if (this.i < this.tokens.length) {
      throw new Fail("syntax");
    }

    return value;
  }

  private peekOp(a: Op, b: Op): Op | null {
    const token = this.tokens[this.i];

    if (
      token &&
      token.type === "op" &&
      (token.op === a || token.op === b)
    ) {
      return token.op;
    }

    return null;
  }

  private expr(): number {
    let value = this.term();

    for (
      let op = this.peekOp("+", "-");
      op !== null;
      op = this.peekOp("+", "-")
    ) {
      this.i++;

      const right = this.term();

      if (op === "+") {
        value += right;
      } else {
        value -= right;
      }
    }

    return value;
  }

  private term(): number {
    let value = this.unary();

    for (
      let op = this.peekOp("*", "/");
      op !== null;
      op = this.peekOp("*", "/")
    ) {
      this.i++;

      const right = this.unary();

      if (op === "/" && right === 0) {
        throw new Fail("undefined");
      }

      if (op === "*") {
        value *= right;
      } else {
        value /= right;
      }
    }

    return value;
  }

  private unary(): number {
    const token = this.tokens[this.i];

    if (
      token &&
      token.type === "op" &&
      token.op === "-"
    ) {
      this.i++;
      return -this.unary();
    }

    return this.number();
  }

  private number(): number {
    const token = this.tokens[this.i];

    if (
      token &&
      token.type === "num"
    ) {
      this.i++;
      return token.value;
    }

    throw new Fail("syntax");
  }
}

export function evaluate(input: string): EvalResult {
  try {
    let src = input.replace(/\s+/g, "");

    if (src.endsWith("=")) {
      src = src.slice(0, -1);
    }

    if (src === "") {
      throw new Fail("syntax");
    }

    const tokens = tokenize(src);
    const value = new Parser(tokens).parse();

    if (!Number.isFinite(value)) {
      throw new Fail("undefined");
    }

    return {
      ok: true,
      value,
    };
  } catch (error) {
    if (error instanceof Fail) {
      return {
        ok: false,
        error: error.kind,
      };
    }

    return {
      ok: false,
      error: "syntax",
    };
  }
}

export function formatResult(value: number): string {
  const rounded = Number(value.toPrecision(12));

  if (Object.is(rounded, -0)) {
    return "0";
  }

  return String(rounded);
}