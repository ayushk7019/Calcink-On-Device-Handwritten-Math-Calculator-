import "./style.css";
import { DrawingCanvas } from "./canvas/drawingCanvas";
import { strokesToImageData } from "./recognition/preprocess";
import { RecognitionClient } from "./recognition/recognitionClient";
import { postprocessLabel } from "./recognition/postprocess";
import {
  recognizeExpression,
  type Classifier,
} from "./recognition/pipeline";
import { formatResult } from "./math/evaluate";

const canvas =
  document.querySelector<HTMLCanvasElement>("#canvas");

if (!canvas) {
  throw new Error("Canvas element not found");
}

const board = new DrawingCanvas(canvas);
const recognizer = new RecognitionClient();

const $ = (id: string): HTMLElement => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} not found`);
  }

  return element;
};

const prediction = $("prediction");
const recognizeButton = $("recognize");

$("undo").addEventListener("click", () => {
  board.undo();
});

$("redo").addEventListener("click", () => {
  board.redo();
});

$("clear").addEventListener("click", () => {
  board.clear();
  prediction.textContent = "Ready";
});

$("width").addEventListener("input", (event) => {
  const width = Number(
    (event.target as HTMLInputElement).value
  );

  board.setStrokeWidth(width);
});

window.addEventListener("keydown", (event) => {
  const mod =
    event.ctrlKey || event.metaKey;

  if (!mod) return;

  const key =
    event.key.toLowerCase();

  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    board.redo();
  } else if (key === "z") {
    event.preventDefault();
    board.undo();
  } else if (key === "y") {
    event.preventDefault();
    board.redo();
  }
});

const classify: Classifier = async (group) => {
  const imageData =
    strokesToImageData(group);

  if (!imageData) {
    return {
      label: "?",
      confidence: 0,
    };
  }

  const result =
    await recognizer.recognize(imageData);

  const label =
    postprocessLabel(
      group,
      result.label
    );

  return {
    label,
    confidence: result.confidence,
  };
};

recognizeButton.addEventListener(
  "click",
  async () => {
    try {
      const strokes =
        board.getStrokes();

      if (strokes.length === 0) {
        prediction.textContent =
          "Draw something first";
        return;
      }

      prediction.textContent =
        "Recognizing...";

      recognizeButton.setAttribute(
        "disabled",
        "true"
      );

      const output =
        await recognizeExpression(
          strokes,
          classify
        );

      console.log(
        "=== CALCINK SEGMENTATION DEBUG ==="
      );

      console.log(
        "Recognized text:",
        output.text
      );

      console.log(
        "Number of groups:",
        output.symbols.length
      );

      console.log(
        output.symbols
          .map(
            (symbol) =>
              `${symbol.label}  conf=${Math.round(
                symbol.confidence * 100
              )}` +
              `  w=${Math.round(
                symbol.rect.right -
                  symbol.rect.left
              )}` +
              `  h=${Math.round(
                symbol.rect.bottom -
                  symbol.rect.top
              )}` +
              `  x=${Math.round(
                symbol.rect.left
              )}` +
              `  y=${Math.round(
                symbol.rect.top
              )}`
          )
          .join("\n")
      );

      if (!output.result) {
        prediction.textContent =
          output.text;
        return;
      }

      let answer = "";

      if (output.result.ok) {
        answer = formatResult(
          output.result.value
        );
      } else if (
        output.result.error ===
        "undefined"
      ) {
        answer = "Undefined";
      } else {
        answer = "Error";
      }

      prediction.textContent =
        `${output.text} ${answer}`;
    } catch (error: unknown) {
      console.error(
        "Recognition failed:",
        error
      );

      prediction.textContent =
        "Recognition failed";
    } finally {
      recognizeButton.removeAttribute(
        "disabled"
      );
    }
  }
);

recognizer
  .ready()
  .then(() => {
    prediction.textContent =
      "Model ready";

    console.log(
      "Sagyam worker model loaded"
    );
  })
  .catch((error: unknown) => {
    prediction.textContent =
      "Model failed to load";

    console.error(
      "Sagyam worker model failed to load:",
      error
    );
  });