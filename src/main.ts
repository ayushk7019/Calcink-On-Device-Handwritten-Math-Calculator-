import "./style.css";
import { DrawingCanvas } from "./canvas/drawingCanvas";
import { strokesToImageData } from "./recognition/preprocess";
import { RecognitionClient } from "./recognition/recognitionClient";
import { postprocessLabel } from "./recognition/postprocess";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

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
  const mod = event.ctrlKey || event.metaKey;

  if (!mod) return;

  const key = event.key.toLowerCase();

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

recognizeButton.addEventListener("click", async () => {
  try {
    const strokes = board.getStrokes();

    if (strokes.length === 0) {
      prediction.textContent = "Draw something first";
      return;
    }

    prediction.textContent = "Recognizing...";
    recognizeButton.setAttribute("disabled", "true");

    const imageData = strokesToImageData(strokes);

    if (!imageData) {
      prediction.textContent = "Nothing to recognize";
      return;
    }

    const result = await recognizer.recognize(imageData);

    const label = postprocessLabel(strokes, result.label);

    prediction.textContent =
      `${label} (${(result.confidence * 100).toFixed(1)}%)`;

    console.log("Recognition result:", {
      ...result,
      finalLabel: label,
    });
  } catch (error: unknown) {
    console.error("Recognition failed:", error);
    prediction.textContent = "Recognition failed";
  } finally {
    recognizeButton.removeAttribute("disabled");
  }
});

recognizer
  .ready()
  .then(() => {
    prediction.textContent = "Model ready";
    console.log("Sagyam worker model loaded");
  })
  .catch((error: unknown) => {
    prediction.textContent = "Model failed to load";
    console.error(
      "Sagyam worker model failed to load:",
      error
    );
  });