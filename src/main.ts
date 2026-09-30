import "./style.css";
import { DrawingCanvas } from "./canvas/drawingCanvas";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");

if (!canvas) {
  throw new Error("Canvas element not found");
}

const board = new DrawingCanvas(canvas);

const $ = (id: string) => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} not found`);
  }

  return element;
};

$("undo").addEventListener("click", () => {
  board.undo();
});

$("redo").addEventListener("click", () => {
  board.redo();
});

$("clear").addEventListener("click", () => {
  board.clear();
});

$("width").addEventListener("input", (event) => {
  const width = Number((event.target as HTMLInputElement).value);

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