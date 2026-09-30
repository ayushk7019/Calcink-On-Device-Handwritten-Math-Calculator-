import "./style.css";
import { DrawingCanvas } from "./canvas/drawingCanvas";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
if (!canvas) throw new Error("Canvas element not found");

const board = new DrawingCanvas(canvas);

window.addEventListener("keydown", (event) => {
  const mod = event.ctrlKey || event.metaKey; // metaKey = Cmd on Mac
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