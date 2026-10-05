# CalcInk: On-Device Handwritten Math Calculator

CalcInk is a browser-based handwritten math calculator that lets users write mathematical expressions using a mouse, stylus, or touch and receive the calculated result directly beside the equals sign.

CalcInk was developed as a solo project.

The application is designed around a fully client-side architecture:

- handwritten stroke capture in the browser
- local symbol recognition
- deterministic mathematical evaluation
- inline answer projection
- Web Worker-based neural-network inference
- offline application and model caching
- no cloud inference APIs

## Live Demo

https://calcink-on-device-handwritten-math-nu.vercel.app/

The deployed application has been verified to load and perform recognition after network connectivity is disabled, provided the application and model assets have already been cached during an initial online visit.

---

## Quick Start

### Requirements

- Node.js v24.21.0
- npm 11.19.0

Tested environment: Node.js v24.21.0 and npm 11.19.0.

### Install and Run

```bash
git clone <repository-url>
cd <repository-folder>
npm install && npm run dev
```

Open the local URL printed by Vite in the terminal.

### Other Commands

| Task | Command |
| ---- | ------- |
| Install dependencies | `npm install` |
| Start development server | `npm run dev` |
| Run tests | `npm test -- --run` |
| Production build | `npm run build` |

The production build also generates the PWA service worker and precache manifest.

---

## Model Attribution

CalcInk uses the open-source **Sagyam Handwritten Character Recognition** model. The model is third-party material and is bundled unmodified in this repository.

| Item | Details |
| ---- | ------- |
| Model | Sagyam Handwritten Character Recognition |
| Source repository | https://github.com/Sagyam/Handwritten-Optical-Character-Recognition |
| License | GPL-3.0 |
| Runtime | TensorFlow.js |
| Model format | TensorFlow.js Layers Model |
| Input | 100 × 100 × 3 RGB float32 |
| Output | 19 classes (Softmax) |
| Parameters | 3,594,323 |
| Bundled location | `public/models/sagyam/V3/` |
| Full attribution | `public/models/sagyam/NOTICE.md` |

### Architecture

- MobileNetV2 backbone without the classification head
- Global max pooling
- BatchNormalization
- Dense(1024, ReLU)
- Dropout(0.3)
- Dense(19, Softmax)

### Class Mapping

| Index | Label |
| ----: | ----- |
| 0 | 0 |
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |
| 8 | 8 |
| 9 | 9 |
| 10 | Add (+) |
| 11 | Decimal (.) |
| 12 | Division (÷) |
| 13 | Equals (=) |
| 14 | Multiply (×) |
| 15 | Minus (-) |
| 16 | X |
| 17 | Y |
| 18 | Z |

The required CalcInk vocabulary corresponds to indices 0 through 15.

The additional X, Y, and Z classes are not valid CalcInk mathematical symbols. If one reaches the expression evaluator, the expression is rejected as invalid syntax rather than being silently accepted.

The model class order was taken from the original application source and checked empirically during CalcInk testing.

### Local Model Files

The model is bundled locally in:

```text
public/models/sagyam/V3/
```

Files:

```text
model.json
group1-shard1of4.bin
group1-shard2of4.bin
group1-shard3of4.bin
group1-shard4of4.bin
```

The model files are included in the application repository and are not downloaded from a remote inference service at runtime.

See `public/models/sagyam/NOTICE.md` for third-party model attribution, licensing, architecture, class mapping, and redistribution information.

### Model Size

The model contains 3,594,323 float32 parameters, which corresponds to approximately 13.71 MiB of raw float32 parameter storage.

The directly measured bundled model payload is:

```text
model.json              104,203 bytes
group1-shard1of4.bin  4,194,304 bytes
group1-shard2of4.bin  4,194,304 bytes
group1-shard3of4.bin  4,194,304 bytes
group1-shard4of4.bin  1,794,380 bytes
```

Total measured model payload: 14,481,495 bytes ≈ 13.81 MiB

The two figures represent different measurements:

- 13.71 MiB = calculated raw float32 parameter storage
- 13.81 MiB = measured model-file payload bundled with CalcInk

### License

CalcInk is distributed under the GNU General Public License v3.0 (GPL-3.0).

The project includes the Sagyam handwritten-character-recognition model, which is third-party material distributed under GPL-3.0. The model source, license, and redistribution information are documented in `public/models/sagyam/NOTICE.md`. The repository's license text is in `LICENSE`.

---

## Features

### Digital Ink Canvas

- Mouse, stylus, and touch input
- Pointer-event based input handling
- Coalesced pointer-event handling
- Smooth stroke rendering
- High-DPI / Retina scaling
- Adjustable stroke width
- Undo
- Redo
- Clear canvas
- Stroke eraser
- Pixel eraser

### Stroke-Based Source Representation

The application keeps handwritten strokes as the source of truth rather than treating rendered canvas pixels as the primary representation.

### Handwriting Recognition

CalcInk uses the open-source Sagyam Handwritten Character Recognition model (see [Model Attribution](#model-attribution)).

Required mathematical vocabulary:

```text
0 1 2 3 4 5 6 7 8 9
+ - × ÷ . =
```

The required vocabulary contains 16 symbols:

- 10 digits
- 4 arithmetic operators
- decimal point
- equals sign

The model is executed locally in the browser using TensorFlow.js.

Inference runs inside a Web Worker so that neural-network computation is separated from the main drawing interaction path.

CalcInk does not use cloud vision services, remote inference APIs, or server-side recognition.

### Automatic Recognition

Recognition is triggered automatically after the user finishes writing.

A 600 ms debounce is used so that rapid multi-stroke writing does not trigger recognition after every individual stroke.

Recognition requests use versioning and request IDs so that stale results from older expressions cannot overwrite newer edits.

Starting a new stroke removes the previous generated answer.

Undo, redo, clear, and eraser operations also invalidate old recognition output and trigger the normal recognition update flow.

### Mathematical Evaluation

CalcInk uses a deterministic recursive-descent parser.

Supported features include:

- addition
- subtraction
- multiplication
- division
- standard operator precedence
- multi-digit numbers
- decimal numbers
- negative numbers
- division-by-zero handling
- controlled syntax errors

The application does not use JavaScript `eval()` for handwritten input.

For division by zero, the application displays:

```text
Undefined
```

Malformed expressions produce a controlled error state.

### Inline Answer Projection

When an expression ends with `=`, the calculated result is rendered directly beside the equals sign.

Example:

```text
18 + 4 × 3 = 30
```

The generated answer is stored separately from the user's handwritten strokes. Therefore the projected result cannot be mistaken for handwriting during recognition.

The answer annotation:

- is placed immediately to the right of `=`
- is vertically centered relative to `=`
- is sized based on recognized symbol geometry
- disappears when the user starts editing the equation

### Recognition Overlay

CalcInk also provides an optional recognition overlay, disabled by default. When enabled, each recognized symbol receives a thin dashed bounding box and a label such as `7 92%`.

Confidence levels are displayed as:

| Confidence | Level | Colour |
| ---------- | ----- | ------ |
| ≥ 90% | High | Green |
| 60–89% | Medium | Amber |
| < 60% | Low | Red |

The overlay is a usability and debugging aid. The percentage is the model-reported confidence, not a guarantee of correctness; the model can be highly confident in an incorrect classification.

---

## Architecture

The high-level processing pipeline is:

```text
Pointer Input
      ↓
Stroke Capture
      ↓
Stroke State / History
      ↓
Recognition Scheduler
      ↓
Symbol Segmentation
      ↓
Per-Symbol Preprocessing
      ↓
100 × 100 RGB Input
      ↓
Recognition Web Worker
      ↓
TensorFlow.js Sagyam Model
      ↓
Classification
      ↓
Geometric Post-processing
      ↓
Recognized Expression
      ↓
Deterministic Math Parser
      ↓
Result
      ↓
Canvas Answer Projection
```

### Main Thread

The main thread handles:

- pointer events
- stroke storage
- canvas rendering
- undo / redo
- clear
- stroke width
- stroke eraser interaction
- pixel eraser interaction
- symbol segmentation
- per-symbol image preparation
- recognition scheduling
- result presentation

### Web Worker

The recognition worker handles:

- TensorFlow.js model loading
- compatibility registration for required model regularizers
- image-to-tensor conversion
- neural-network inference
- prediction
- returning recognition results

Each recognition request includes an ID, and the worker response is matched to the corresponding request.

This architecture keeps the neural-network inference workload outside the main drawing interaction path.

### Stroke Representation

The canvas uses strokes as the source of truth instead of treating rendered pixels as the primary data representation.

Point:

```ts
type Point = {
  x: number;
  y: number;
  time: number;
};
```

Stroke:

```ts
type Stroke = {
  id: number;
  width: number;
  points: Point[];
};
```

The same stroke representation is used by:

- rendering
- undo / redo
- stroke erasing
- pixel erasing
- segmentation
- preprocessing
- recognition

The generated answer is maintained separately as an annotation layer.

---

## Recognition Pipeline

### 1. Stroke Segmentation

The segmentation layer groups related strokes into candidate symbols.

Each stroke is analyzed using geometric features such as:

- bounding box
- width and height
- center position
- horizontal overlap
- relative vertical gap
- relative size

Current heuristic defaults:

```text
minWidth      = 8
overlapRatio  = 0.6
gapFactor     = 0.8
```

Special geometric handling exists for `+`, `=`, `×`, `÷`, and dot-like strokes.

Generic merging requires actual horizontal overlap before the configured overlap-ratio and vertical-gap checks are applied. This helps prevent nearby independent symbols from being merged incorrectly.

Groups are finally ordered from left to right.

### 2. Symbol Preprocessing

Each symbol group is:

- bounded by its geometry
- converted into a square crop
- given surrounding margin
- rendered with an explicit background
- normalized to a consistent ink thickness
- resized to 100 × 100
- converted into RGB ImageData

The resulting model input is:

```text
[1, 100, 100, 3]
```

Pixel values are normalized to the range:

```text
0 ... 1
```

The visible canvas background is provided through CSS, so recognition does not rely on the visible canvas background. Instead, preprocessing renders each symbol onto a dedicated white-background image with black ink.

The current nominal output ink thickness is approximately 7 px.

### 3. Model Inference

The preprocessed symbol is sent to the recognition Web Worker.

The worker runs the locally bundled TensorFlow.js Sagyam model and returns:

- predicted class
- class index
- confidence
- inference time

The worker constructs the input tensor directly from RGB image data instead of relying on `tf.browser.fromPixels`.

### 4. Geometric Post-processing

Geometric post-processing handles cases where stroke structure provides stronger information than the raw model label.

Current examples include:

```text
two horizontal strokes  → =
one horizontal stroke   → -
valid division geometry → ÷
```

Post-processing uses stroke geometry and does not use the arithmetic evaluator to guess symbols.

### 5. Decimal Point Handling

Very small isolated stroke groups can be treated as decimal points using a geometric size heuristic.

The current threshold is:

```text
DOT_RATIO = 0.2
```

The tallest symbol group in the expression is used as a reference for this comparison.

This reduces dependence on the neural-network classifier for very small isolated dots.

### Preprocessing Experiment

The recognition crop was tuned to provide a larger effective margin around individual symbols before resizing them to the model's 100 × 100 input.

The earlier configuration already provided surrounding space; the experiment increased that margin further.

Approximate observed symbol occupancy changed from ~83% to ~64%.

Measured tuning results:

| Expression | Before | After |
| ---------- | -----: | ----: |
| 100÷0= | 1/5 | 5/5 |
| 2+3×4-6÷2= | 2/5 | 4/5 |

These measurements came from small samples and different drawing sessions. The expressions were also part of the recognition-tuning process.

Therefore these results are documented as engineering evidence for the chosen preprocessing configuration rather than as an independent benchmark.

The exact reason the larger margin helped has not been independently verified.

---

## Mathematical Parser

CalcInk uses a deterministic recursive-descent parser with the following grammar:

```text
expr   := term (('+' | '-') term)*
term   := unary (('×' | '÷') unary)*
unary  := '-' unary | number
number := digits with at most one '.', at least one digit
```

The parser supports:

- integer numbers
- decimal numbers
- negative numbers
- `+`, `-`, `×`, `÷`

Operator precedence is represented directly by the grammar:

- multiplication and division bind tighter than addition and subtraction
- binary operators are left-associative
- unary minus is supported

Examples:

```text
5--3
5×-3
```

Division by zero produces `Undefined`. Invalid syntax produces a controlled error state.

The application never evaluates handwritten input using JavaScript `eval()`.

## Recognition Scheduling Flow

Recognition uses a debounce interval of 600 ms.

The flow is:

```text
User writes
   ↓
Stroke commit
   ↓
600 ms debounce
   ↓
Recognition
   ↓
Expression evaluation
   ↓
Answer projection
```

Recognition requests use versioning so stale results cannot overwrite results from newer edits.

Starting a new stroke removes the existing generated answer.

Undo, redo, clear, and eraser actions invalidate older recognition output.

## Eraser System

CalcInk provides two eraser modes.

### Stroke Eraser

The stroke eraser removes complete strokes using geometric hit testing.

The core logic is based on point-to-segment distance.

A continuous erase drag collects affected stroke IDs and commits them as one undoable history action. Therefore one continuous stroke-eraser drag corresponds to one undo operation.

### Pixel Eraser

The pixel eraser removes portions of strokes rather than complete strokes.

Stroke segments are clipped against a circular eraser region.

For sparse or fast stroke segments, the implementation checks the actual line segment against the circular eraser instead of relying only on recorded points.

Boundary points are interpolated, including timestamps.

Eraser positions are also interpolated during fast pointer movement so the eraser is less likely to skip across thin strokes.

Very small remaining pieces are discarded to reduce accidental creation of decimal-point candidates.

A pixel erase operation may split one original stroke into multiple replacement strokes. Undo restores the original stroke, while redo reapplies the replacement.

---

## Offline / PWA Support

CalcInk uses `vite-plugin-pwa` with a Workbox-generated service worker.

The production build precaches application assets including: `js`, `css`, `html`, `json`, `bin`, `webmanifest`.

The Workbox cache size limit is configured to allow the model shard files to be precached.

### Generated PWA Files

The production build generates:

```text
dist/sw.js
dist/workbox-*.js
dist/manifest.webmanifest
dist/registerSW.js
```

The build currently reports:

```text
PWA v1.3.0
mode       generateSW
precache   12 entries
```

All four Sagyam model shards are included in the generated precache list.

### Local Offline Verification

The production preview was tested locally using `http://localhost:4173/`.

The browser confirmed that the service worker was activated and running.

Cache Storage contained:

```text
model.json
group1-shard1of4.bin
group1-shard2of4.bin
group1-shard3of4.bin
group1-shard4of4.bin
```

The preview server was then stopped completely and the application was reloaded.

The following worked offline:

- page loading
- model initialization
- `2+3=` recognition
- answer projection with result 5

### Deployed Offline Verification

The production deployment is https://calcink-on-device-handwritten-math-nu.vercel.app/

The deployed application was loaded while online and allowed to cache its application and model assets. Network connectivity was then disabled and the same deployed URL was reloaded.

The following were verified successfully:

- page loaded
- model remained available
- handwritten recognition continued to work
- answer projection continued to work

Therefore the deployed CalcInk application has passed an offline verification using Chrome DevTools Network -> Offline after initial asset caching.

The first visit still requires network connectivity to download the application and model assets.

---

## Testing

### Automated Tests

The current automated test suite covers:

- basic project setup
- coordinate conversion
- stroke history
- geometry
- post-processing
- arithmetic evaluation
- symbol segmentation
- recognition pipeline
- answer layout
- recognition overlay layout
- recognition scheduling
- stroke hit testing
- pixel erasing
- undo/redo replacement history

Current status: **125 tests across 13 test files, all passing**

Run the complete test suite with:

```bash
npm test -- --run
```

### Test Breakdown

```text
basic              1
coordinates        2
evaluate          36
geometry           3
history           15
hitTest            6
pipeline           7
pixelErase        12
postprocess        3
scheduler          6
segment           16
answerLayout       6
overlayLayout     12
--------------------
total            125
```

### Browser Validation

The following behaviors have been manually verified:

- automatic recognition after pen-up
- previous answer removal after starting a new stroke
- automatic recognition of a new expression
- undo handling
- redo handling
- clear handling
- rapid writing with debounced recognition
- stroke eraser
- pixel eraser
- pixel eraser undo
- pixel eraser redo
- fast pixel-eraser dragging without visible skipped sections
- recognition updating after erasing
- local offline loading after the preview server was stopped
- deployed application loading offline
- deployed handwritten recognition while offline
- deployed answer projection while offline

### Expression-Level Evaluation

A fresh expression-level evaluation was performed after recognition, segmentation, and preprocessing tuning.

**Protocol**

- 10 expressions
- 3 official attempts per expression
- 30 official runs
- one writer
- one device

**Result**

Exact recognized-text accuracy: **29/30 = 96.7%**, reported as approximately **97%** because the sample is small.

**Evaluation Set**

| Expression | Correct |
| ---------- | ------: |
| 9-4= | 2/3 |
| 6×7= | 3/3 |
| 8÷4= | 3/3 |
| 3.2+1.8= | 3/3 |
| 25×4= | 3/3 |
| 100-37= | 3/3 |
| 7+8÷2= | 3/3 |
| 6×3-4= | 3/3 |
| 0.5×6= | 3/3 |
| 36÷9+2.5= | 3/3 |

**Failed Official Run**

One official run produced:

```text
Expected:   9-4=
Recognized: Y1.-4=
```

The segmentation log showed:

```text
Number of groups: 6
```

The intended 9 was split into three groups which were then classified as `Y`, `1`, and `.`, followed by the correctly recognized `-`, `4`, and `=`.

The failure therefore involved segmentation followed by model classification of the fragments, rather than being described as a model-only single-glyph failure.

**Additional Runs**

One additional `9-4=` retry was performed outside the official three attempts and passed.

Therefore the raw evaluation log contains:

```text
9-4= → 3 passed, 1 failed
```

This additional attempt is excluded from the official 30-run denominator.

An accidental `25×6=` run was also retained in the raw log and excluded from the official evaluation.

The complete evaluation record is maintained in `docs/eval-fresh-set.txt`.

**Evaluation Limitations**

- one writer
- one device
- small sample size
- earlier evaluation sets were used during recognition, preprocessing, and segmentation tuning

Therefore the 29/30 result should be interpreted as a small-sample engineering measurement and not as a general handwriting-recognition benchmark.

**Answer Accuracy**

Displayed-answer accuracy was not separately recorded during this evaluation. Therefore no independent answer-accuracy percentage is claimed.

A future evaluation should record:

- expected expression
- recognized expression
- displayed answer
- expected answer

so recognition accuracy and answer accuracy can be measured independently.

---

## Project Structure

```text
src/
├── canvas/
│   ├── drawingCanvas.ts
│   ├── history.ts
│   ├── coordinates.ts
│   ├── hitTest.ts
│   ├── pixelErase.ts
│   └── types.ts
├── recognition/
│   ├── geometry.ts
│   ├── postprocess.ts
│   ├── preprocess.ts
│   ├── recognitionClient.ts
│   ├── segment.ts
│   ├── pipeline.ts
│   ├── vocabulary.ts
│   ├── answerLayout.ts
│   ├── scheduler.ts
│   └── overlayLayout.ts
├── worker/
│   └── recognition.worker.ts
├── math/
│   └── evaluate.ts
└── main.ts

public/
└── models/
    └── sagyam/
        ├── NOTICE.md
        └── V3/
            ├── model.json
            ├── group1-shard1of4.bin
            ├── group1-shard2of4.bin
            ├── group1-shard3of4.bin
            └── group1-shard4of4.bin

tests/

docs/
└── eval-fresh-set.txt

DECISIONS.md
README.md
LICENSE
vite.config.ts
package.json
package-lock.json
```

## Documentation

Important project documentation:

**`DECISIONS.md`** contains:

- model-selection decisions
- architecture decisions
- preprocessing experiments
- segmentation decisions
- evaluation results
- eraser architecture
- offline/PWA verification
- implementation status

**`docs/eval-fresh-set.txt`** contains the raw fresh expression-level evaluation record and the official test-set notes.

**`public/models/sagyam/NOTICE.md`** contains:

- third-party model attribution
- source repository
- license
- model architecture
- class mapping
- bundled model information
- redistribution details

**`LICENSE`** contains the repository's GNU GPL-3.0 license.

---

## Current Status

### Completed

- responsive digital-ink canvas
- mouse, stylus, and touch input
- pointer events
- coalesced pointer-event handling
- smooth stroke rendering
- high-DPI scaling
- stroke-width adjustment
- stroke-based data model
- undo / redo
- clear
- stroke eraser
- pixel eraser
- undo / redo for eraser operations
- symbol segmentation
- geometric post-processing
- symbol preprocessing
- geometric decimal-point handling
- local Sagyam model integration
- TensorFlow.js inference
- Web Worker inference
- request-ID matching
- deterministic arithmetic parser
- operator precedence
- multi-digit numbers
- decimal numbers
- negative numbers
- division-by-zero handling
- automatic recognition
- 600 ms recognition debounce
- stale-result protection
- inline answer projection
- dynamic answer removal during editing
- optional recognition overlay with confidence colours
- PWA/service-worker generation
- model precaching
- local stopped-server offline verification
- deployed production demo
- deployed offline verification using Chrome DevTools Network -> Offline
- evaluation documentation
- model licensing documentation
- 125 automated tests

### Status

Complete for submission.

### Final Verification

Before submission, run:

```bash
npm test -- --run
npm run build
```

Expected automated result: 125 tests passing.

Also verify:

- production build succeeds
- service worker generated
- all four model shards included in precache
- live deployment works
- deployed offline mode works after initial online load
- recognition latency is measured
- memory usage is measured
- drawing remains responsive near 60 FPS
- no unnecessary debug `console.log` statements remain
- all model files are tracked
- README contains the live demo URL
- documentation is up to date
- Git working tree is clean

The live CalcInk deployment is https://calcink-on-device-handwritten-math-nu.vercel.app/
