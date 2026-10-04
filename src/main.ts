import "./style.css";

import { DrawingCanvas } from "./canvas/drawingCanvas";
import { strokesToImageData } from "./recognition/preprocess";
import { RecognitionClient } from "./recognition/recognitionClient";
import { postprocessLabel } from "./recognition/postprocess";
import {
recognizeExpression,
type Classifier,
type ExpressionResult,
} from "./recognition/pipeline";
import { answerAnnotation } from "./recognition/answerLayout";
import { symbolOverlays } from "./recognition/overlayLayout";
import { RecognitionScheduler } from "./recognition/scheduler";
import { formatResult } from "./math/evaluate";

const canvas =
document.querySelector<HTMLCanvasElement>(
"#canvas"
);

if (!canvas) {
throw new Error(
"Canvas element not found"
);
}

const board =
new DrawingCanvas(canvas);

const recognizer =
new RecognitionClient();

const $ = (
id: string
): HTMLElement => {
const element =
document.getElementById(id);

if (!element) {
throw new Error(
`Missing element: #${id}`
);
}

return element;
};

const prediction =
$("prediction");

const penButton =
$("pen") as HTMLButtonElement;

const eraserButton =
$("eraser") as HTMLButtonElement;

const pixelButton =
$("pixel") as HTMLButtonElement;

const undoButton =
$("undo") as HTMLButtonElement;

const redoButton =
$("redo") as HTMLButtonElement;

const clearButton =
$("clear") as HTMLButtonElement;

const overlayButton =
$("overlay") as HTMLButtonElement;

const widthInput =
$("width") as HTMLInputElement;

const classify: Classifier =
async (group) => {
const imageData =
strokesToImageData(group);

if (!imageData) {
  return {
    label: "?",
    raw: "?",
    confidence: 0,
  };
}

const result =
  await recognizer.recognize(
    imageData
  );

const label =
  postprocessLabel(
    group,
    result.label
  );

return {
  label,
  raw: result.label,
  confidence:
    result.confidence,
};

};

function show(
output: ExpressionResult
) {
board.setOverlays(
symbolOverlays(
output.symbols
)
);

if (
output.symbols.length === 0
) {
board.setAnnotations([]);
prediction.textContent = "";
return;
}

const annotation =
answerAnnotation(output);

board.setAnnotations(
annotation
? [annotation]
: []
);

if (!output.result) {
prediction.textContent =
output.text;
return;
}

if (!output.result.ok) {
if (
output.result.error ===
"undefined"
) {
prediction.textContent =
`${output.text} Undefined`;
} else {
prediction.textContent =
`${output.text} Error`;
}

return;

}

const answer =
formatResult(
output.result.value
);

prediction.textContent =
`${output.text} ${answer}`;
}

function showError(
error: unknown
) {
console.error(error);

board.setAnnotations([]);
board.setOverlays([]);

prediction.textContent =
"Recognition failed";
}

const recognizeNow =
async (): Promise<ExpressionResult> => {
return recognizeExpression(
board.getStrokes(),
classify
);
};

const scheduler =
new RecognitionScheduler(
recognizeNow,
show,
showError,
600
);

const toolButtons = {
pen: penButton,
eraser: eraserButton,
pixel: pixelButton,
};

function setTool(
tool:
| "pen"
| "eraser"
| "pixel"
) {
board.setTool(tool);

for (
const [name, element] of
Object.entries(toolButtons)
) {
element.setAttribute(
"aria-pressed",
String(name === tool)
);
}
}

board.onChange = (
kind
) => {
if (kind === "start") {
scheduler.cancel();
board.setAnnotations([]);
return;
}

scheduler.schedule();
};

penButton.addEventListener(
"click",
() => {
setTool("pen");
}
);

eraserButton.addEventListener(
"click",
() => {
setTool("eraser");
}
);

pixelButton.addEventListener(
"click",
() => {
setTool("pixel");
}
);

undoButton.addEventListener(
"click",
() => {
board.undo();
}
);

redoButton.addEventListener(
"click",
() => {
board.redo();
}
);

clearButton.addEventListener(
"click",
() => {
board.clear();
prediction.textContent = "";
}
);

overlayButton.addEventListener(
"click",
() => {
const on =
overlayButton.getAttribute(
"aria-pressed"
) !== "true";

overlayButton.setAttribute(
  "aria-pressed",
  String(on)
);

board.setShowOverlays(on);

}
);

widthInput.addEventListener(
"input",
() => {
const width =
Number(widthInput.value);

if (Number.isFinite(width)) {
  board.setStrokeWidth(width);
}

}
);

window.addEventListener(
"keydown",
(event) => {
if (
(event.ctrlKey ||
event.metaKey) &&
event.key.toLowerCase() ===
"z"
) {
event.preventDefault();

  if (event.shiftKey) {
    board.redo();
  } else {
    board.undo();
  }

  return;
}

if (
  (event.ctrlKey ||
    event.metaKey) &&
  event.key.toLowerCase() ===
    "y"
) {
  event.preventDefault();
  board.redo();
}

}
);

setTool("pen");

recognizer
.ready()
.then(() => {
prediction.textContent =
"Model ready";
})
.catch((error) => {
showError(error);
});
