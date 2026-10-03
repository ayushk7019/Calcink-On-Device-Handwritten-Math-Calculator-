# CalcInk Model & Architecture Decisions

Last updated: 2026-10-02

---

## 1. Problem Requirement

CalcInk must recognize handwritten mathematical expressions containing:

- digits 0-9
- plus (+)
- minus (-)
- multiplication (×)
- division (÷)
- decimal point (.)
- equals (=)

Required vocabulary: **16 classes**

(10 digits, 4 operators, decimal point, equals).

The recognition pipeline must run entirely on-device in the browser and support offline operation after application assets have been loaded.

The project must use an existing open-source pre-trained model rather than requiring training a model from scratch.

---

## 2. Current Stroke Data Model

The visible canvas is not treated as the source of truth.

The source of truth is the stroke state.

### Point

Each point contains:

- x coordinate
- y coordinate
- timestamp

```ts
type Point = {
  x: number;
  y: number;
  time: number;
};
```

### Stroke

Each stroke contains:

- stroke id
- stroke width
- ordered list of points

```ts
type Stroke = {
  id: number;
  width: number;
  points: Point[];
};
```

This allows the same stroke data to be used for:

1. rendering
2. undo/redo
3. erasing
4. segmentation and preprocessing
5. handwriting recognition

The recognized answer is stored separately as an annotation layer and is never added to the stroke history, so it cannot be mistaken for handwriting during recognition.

---

## 3. Model Candidates

### Candidate 1: Sagyam Handwritten Character Recognition Calculator

Repository:

https://github.com/Sagyam/Handwritten-Optical-Character-Recognition

Runtime:

TensorFlow.js

License:

GPL-3.0 (verified from the repository LICENSE file)

Model format:

TensorFlow.js Layers Model

Input:

100 × 100 × 3 RGB float32 tensor

Model architecture:

- MobileNetV2 backbone without the classification head
- Global max pooling
- BatchNormalization
- Dense(1024, ReLU)
- Dropout(0.3)
- Dense(19, Softmax)

Parameter count:

3,594,323 (this matches the sum of the layer parameter counts above)

Model output:

19 classes

#### Class-index mapping

| Index | Label |
|------:|-------|
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

The required CalcInk vocabulary is represented by indices 0-15.

The additional model classes are X, Y and Z. CalcInk does not treat them as valid expression symbols: a recognized X, Y or Z reaches the evaluator and is rejected as a syntax error, so the user sees an error and not a silently wrong answer.

The class order was taken from the original application source. Inside CalcInk it was confirmed empirically: in the evaluation logs the recognized labels match the written symbols for the digits and for +, -, ×, ÷ and =.

#### Model files

The model is stored locally in:

```text
public/models/sagyam/V3/
├── model.json
├── group1-shard1of4.bin
├── group1-shard2of4.bin
├── group1-shard3of4.bin
└── group1-shard4of4.bin
```

The model is loaded inside a dedicated Web Worker.

The saved model configuration references `L1` and `L2` regularizers that TensorFlow.js 3.12.0 does not resolve by default. Compatibility classes for both are registered in the worker before the model is loaded.

#### Model size

The manifest contains 3,594,323 float32 parameters, which is approximately 13.71 MiB of raw weight data (calculated from the tensor shapes, not measured from the files on disk).

#### Original preprocessing

The reference application reads the canvas as RGB, resizes it to 100 × 100 using bilinear interpolation, divides pixel values by 255, and adds a batch dimension. CalcInk deliberately differs from this; see section 12.

#### Symbol-level screening on the live demo

Each required symbol was handwritten 5 times in the Sagyam live demo: 72/80 correct (90%). The full per-attempt table is in section 6. The main weakness in that screening was handwritten `6` (2/5).

#### Status

**Selected primary recognition model.**

Selected after the symbol-level screening and successful local integration into CalcInk.

---

### Candidate 2: ink-on / CoMER

Repository (as reported during the search):

https://github.com/kimseungdae/ink-on

Runtime: ONNX Runtime Web

Model: CoMER, a whole-expression recognizer

Reported model footprint (not independently verified):

- encoder_int8.onnx: 3.4 MB
- decoder_int8.onnx: 4.0 MB
- total: 7.2 MB

**Status: documented alternative, not selected.**

It would have hidden the stroke-to-tensor stage that this project wants to design and test explicitly, and its documented vocabulary was not confirmed to cover all 16 required symbols.

---

### Candidate 3: TrOCR-LaTeX ONNX

Repository:

https://huggingface.co/onnx-community/latex_finetuned-ONNX

Runtime: ONNX / Transformers.js

Purpose: handwritten mathematical expression recognition.

Reported repository size (not independently verified): approximately 4.6 GB.

**Status: not selected.**

The reported footprint appeared unsuitable for a lightweight, offline, client-side application.

---

### Candidate 4: altynbk handwritten-math-recognition

Reported from search results, not verified directly:

- MIT license
- Keras models
- 15 classes (the 10 digits plus add, subtract, multiply, divide and equals), so **no decimal point**

**Status: fallback candidate, not used.**

Using it would have required a model conversion for the browser and a separate rule-based decimal-point detector.

---

### Candidate 5: LaTeXVision

Reported from search results, not verified directly: inference through a server and a 24-symbol classifier.

**Status: not selected.**

Server-based inference conflicts with the 100% on-device requirement.

---

## 4. Selection Criteria

Candidates were compared using:

1. Coverage of all 16 required symbols
2. License and redistribution requirements
3. Model size
4. Browser runtime compatibility
5. Input format
6. Preprocessing requirements
7. Recognition accuracy on handwritten samples
8. Inference latency
9. Offline operation
10. Compatibility with Web Workers

The selected model was chosen on the complete CalcInk architecture, not on model size alone.

---

## 5. Recognition Architecture

```text
Pointer input
      ↓
Stroke capture
      ↓
Stroke history
      ↓
Recognition scheduling (600 ms debounce, versioned)
      ↓
Symbol segmentation
      ↓
Per-symbol preprocessing (crop, margin, 100 × 100 RGB)
      ↓
Recognition Web Worker
      ↓
TensorFlow.js Sagyam model
      ↓
Per-symbol classification
      ↓
Geometric post-processing
      ↓
Recognized expression text
      ↓
Deterministic arithmetic parser
      ↓
Result
      ↓
Canvas answer projection
```

A per-symbol classifier is used because it makes the stroke-to-tensor pipeline explicit and lets the exact CalcInk vocabulary be controlled independently from the arithmetic parser. Whole-expression recognition models remain documented alternatives.

### Main-thread responsibilities

- pointer input and stroke storage
- canvas rendering
- undo/redo, clear, stroke width
- symbol segmentation
- per-symbol image preparation
- recognition scheduling
- answer display

### Worker responsibilities

- TensorFlow.js model loading
- converting image data to a tensor
- neural-network inference
- returning predictions

This keeps heavy model inference out of the drawing interaction path. Requests carry an id, and responses are matched by id.

---

## 6. Handwriting Evaluation Protocol (symbol level, live demo)

Each required symbol was handwritten at least 5 times in the Sagyam live demo, before local integration.

Symbols:

```text
0 1 2 3 4 5 6 7 8 9
+ - × ÷ . =
```

Multi-stroke symbols were drawn with natural gaps between strokes: `+`, `=`, `÷`, `×`.

The test also specifically checked × versus X, handwritten division versus the model's division form, decimal point versus an accidental dot, and `=` as two separate strokes.

### Test results

| Symbol | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Attempt 5 | Correct |
|--------|-----------|-----------|-----------|-----------|-----------|---------|
| 0 | 0 | 0 | 0 | 0 | 0 | 5/5 |
| 1 | 1 | 1 | 3 | 1 | 1 | 4/5 |
| 2 | 2 | 2 | X | 2 | 2 | 4/5 |
| 3 | 3 | 3 | 3 | 3 | 3 | 5/5 |
| 4 | 4 | 4 | 4 | 4 | 4 | 5/5 |
| 5 | 5 | 5 | 3 | 5 | 5 | 4/5 |
| 6 | 6 | 3 | 8 | 6 | 8 | 2/5 |
| 7 | 7 | 7 | 7 | 7 | 7 | 5/5 |
| 8 | 8 | 8 | 8 | 8 | 8 | 5/5 |
| 9 | 9 | 9 | 9 | 9 | 9 | 5/5 |
| + | Add | Add | Multiply | Add | Add | 4/5 |
| - | Minus | Minus | Minus | Minus | Minus | 5/5 |
| × | Multiply | Multiply | Multiply | Multiply | Multiply | 5/5 |
| ÷ | Division | Division | Division | Division | Division | 5/5 |
| . | Decimal | Decimal | Decimal | Decimal | Decimal | 5/5 |
| = | Equals | Equals | Minus | Equals | Equals | 4/5 |

Overall: **72/80 correct (90%)**.

This was a small personal handwriting test on the demo's own pipeline. It measures the model plus the demo's preprocessing and is not a general accuracy estimate. No final model decision was made from a single sample.

---

## 7. Decision Rule

The working screening rule was:

- If at least 14 of the 16 symbols achieve 4/5 or better, and both `.` and `=` work, Sagyam can be selected as the primary candidate.
- If `.` or `=` consistently fails, evaluate the altynbk fallback.
- If the main issue is × versus X confusion while the other required symbols work, evaluate a post-processing strategy for the X class.

Result: 15 of 16 symbols reached 4/5 or better, `.` was 5/5 and `=` was 4/5, so Sagyam passed the screening.

This rule was an engineering heuristic for the initial selection stage and not a statistical standard.

---

## 8. Current Decision

**Sagyam is the selected primary recognition model.**

Reasons:

- browser-side TensorFlow.js inference
- local model assets, loadable inside a Web Worker
- 100 × 100 × 3 input
- 19-class output containing the 16 required CalcInk symbols
- straightforward per-symbol classification
- passed the symbol-level screening (72/80)
- successfully integrated into the CalcInk pipeline
- reached 29/30 exact-text accuracy on the fresh expression-level evaluation (section 16), a small-sample engineering measurement

Known weaknesses are recorded in section 17.

---

## 9. Stroke Segmentation

Every pen contact is stored as a separate stroke. Before recognition, strokes are grouped into candidate symbols using geometry.

Each stroke is analyzed using its bounding box, width and height, center, horizontal overlap and vertical gap relative to neighbours, and its size relative to its neighbours.

Current defaults:

```text
minWidth       = 8
overlapRatio   = 0.6
gapFactor      = 0.8
```

The thresholds are tuned heuristics and are injectable so they can be adjusted.

### Multi-stroke symbols

- **Equals (=):** two roughly horizontal strokes, one above the other, with substantial horizontal overlap and a small vertical separation. Two horizontal strokes far apart horizontally are not treated as `=`.
- **Plus (+):** a roughly horizontal and a roughly vertical stroke that cross. A small crossing tolerance keeps adjacent independent strokes from merging.
- **Multiply (×):** two roughly diagonal strokes that cross near their centers.
- **Division (÷):** an upper dot, a horizontal bar and a lower dot arranged around a common horizontal center. The bar must meet minimum width and flatness requirements.

### Dot-like strokes

Very small strokes are handled separately from generic merging so that small dots are not unnecessarily merged into neighbouring symbols.

### Generic merging

Generic merging requires real horizontal overlap before the overlap-ratio and vertical-gap thresholds apply. For example, `3 =` must remain two groups.

Merging repeats until no pair qualifies, because a merge widens a group and can make further merges possible (the two dots of a division sign merge through the bar).

### Ordering

Groups are sorted left to right by center x, not by drawing order.

```text
strokes
   ↓
[group for 1] [group for +] [group for 2] [group for =]
   ↓
1 + 2 =
```

---

## 10. Recognition Post-processing

Post-processing handles cases where the raw model label is not enough. It uses stroke geometry and never calls the arithmetic parser to guess a symbol, which keeps recognition and evaluation separate.

Current rules:

```text
two horizontal strokes   → =
one horizontal stroke    → -
valid three-part layout  → ÷
```

During evaluation the debug output showed the raw model label next to the final label (`[label] raw=[label]`), so any case where post-processing changes a label is visible.

---

## 11. Decimal Point Handling

The expression pipeline detects decimal points geometrically. After segmentation, the height of the tallest symbol group is the reference, and a group smaller than 20% of that reference is labelled `.` without asking the model:

```text
DOT_RATIO = 0.2
```

This was added because a lone dot, once cropped and enlarged to the model's input, no longer resembles the small dots the model saw during training; the model labelled such dots as ×, 1, and `.` inconsistently.

The model's own decimal class remains part of its vocabulary but is not relied on for dots.

---

## 12. Recognition Preprocessing

The visible canvas uses a CSS background while its drawing buffer is transparent, so reading it directly would give black pixels. Instead, each symbol group is rendered onto an offscreen canvas with an explicit solid background.

### Pipeline

```text
Symbol group strokes
        ↓
Bounding box
        ↓
Square crop with margin
        ↓
Render with uniform scale: white background, black ink,
constant ink thickness (7 px in the output image)
        ↓
100 × 100 RGB ImageData
        ↓
Transferred to the worker
        ↓
Float32 tensor: pixel / 255 → [1, 100, 100, 3]
        ↓
Sagyam model
```

### Why this differs from the original application

The original application resizes its whole 400 × 400 canvas to 100 × 100. CalcInk's canvas is full-window with small symbols, so resizing the whole canvas would shrink and distort symbols (non-uniform scale) and thin the strokes to below one pixel. Cropping each segmented symbol with a single uniform scale avoids both problems.

The tensor is built from raw RGB bytes inside the worker instead of calling `tf.browser.fromPixels`, which avoids backend-specific behaviour in a worker.

### Experiment: wider symbol margin

The crop already had a 10% margin on each side. An additional 15% padding was added, and this was tested as a single fixed setting, not a sweep of values.

Approximate symbol occupancy of the 100 × 100 image changed from about 83% to about 64%.

| Expression | Before | After |
|---|---:|---:|
| `100÷0=` | 1/5 | 5/5 |
| `2+3×4-6÷2=` | 2/5 | 4/5 |

These are small samples from different drawing sessions, and the tested expressions were part of the tuning process, so the numbers are engineering evidence for this configuration and not an independent benchmark. The larger margin was kept because it improved both tests.

The experiment does not establish why the larger margin helped. A possible hypothesis is that the extra empty space makes the input closer to the model's training examples; this has not been verified.

---

## 13. Mathematical Evaluation Engine

CalcInk uses a deterministic recursive-descent arithmetic parser. `eval()` is not used.

Grammar:

```text
expr   := term (('+' | '-') term)*
term   := unary (('×' | '÷') unary)*
unary  := '-' unary | number
number := digits with at most one '.', at least one digit
```

Precedence follows from the grammar: `term` is called from `expr`, so × and ÷ bind tighter than + and -.

Supported: multi-digit integers, floating-point decimals, negative numbers (including `5--3` and `5×-3`), left-associative operators, and a terminal `=` that is ignored.

Error handling:

- Division by zero returns an `undefined` error, shown as **Undefined**.
- Malformed input (such as `2++3`, `2×÷3`, `1.2.3`, an empty expression, or an unrecognized symbol) returns a `syntax` error, shown as **Error**.
- `evaluate` never throws; errors are returned as values, and a randomized test confirms it does not throw on garbage input.
- Results are formatted to 12 significant digits, which hides floating-point noise such as 0.30000000000000004.

---

## 14. Automatic Recognition and Scheduling

Recognition runs automatically after writing:

```text
Stroke committed (pen up) or undo / redo / clear
      ↓
600 ms debounce
      ↓
Recognition
```

The debounce lets multi-stroke symbols (`=`, `+`) finish and avoids running inference after every stroke.

Each scheduled run increments a version number. A result is shown only if its version is still the latest, so a slow older result can never overwrite a newer one. A new pointer-down cancels any pending or in-flight run and removes the old answer.

Worker requests carry an id, and responses are matched by id so concurrent requests cannot receive each other's results.

---

## 15. Dynamic Answer Projection

When the recognized text ends with `=`, the expression is evaluated and the result is drawn on the canvas.

Example:

```text
18 + 4 × 3 = 30
```

The answer is an annotation layer, not a stroke. It:

- is placed immediately to the right of `=`, centered vertically on it
- is sized from the median height of the recognized digits, within fixed limits
- uses a separate color (blue for answers, red for **Undefined** and **Error**)
- disappears when the user starts a new stroke or uses undo, redo or clear

The recognized text is also shown in the toolbar.

---

## 16. Fresh Expression-Level Evaluation

After the pipeline was tuned and integrated, a fresh expression-level evaluation was run.

### Protocol

- 10 expressions
- 3 official attempts per expression
- 30 official runs
- one writer, one device

### Official set and result

| Expression | Correct |
|---|---:|
| `9-4=` | 2/3 |
| `6×7=` | 3/3 |
| `8÷4=` | 3/3 |
| `3.2+1.8=` | 3/3 |
| `25×4=` | 3/3 |
| `100-37=` | 3/3 |
| `7+8÷2=` | 3/3 |
| `6×3-4=` | 3/3 |
| `0.5×6=` | 3/3 |
| `36÷9+2.5=` | 3/3 |

Exact recognized-text accuracy: **29 / 30 = 96.7%**, reported as **approximately 97%** because the sample is small.

### The failed official run

```text
Expected:   9-4=
Recognized: Y1.-4=
```

The recognized text has 6 symbols for a 4-symbol expression, so the intended `9` was split into three groups before classification, and the fragments were then labelled `Y`, `1` and `.`.

Stage: **segmentation, followed by model classification of the fragments.** It is not described as a single-glyph model misclassification, and no post-processing mismatch was observed in the logged `[label] raw=[label]` output.

### Runs outside the official denominator

- One additional `9-4=` attempt was made after the planned three. Result: **passed**. Therefore, `9-4=` passed 3 of 4 total attempts in the raw log. The additional attempt is excluded from the official 30-run denominator.- One `25×6=` run was written by accident and was not part of the test set.

Both are kept in the raw log (`docs/eval-fresh-set.txt`) and excluded from the 30-run denominator.

### Caveats

- one writer, one device, small sample
- earlier evaluation sets were used to tune preprocessing, segmentation and thresholds, so only this set is used for reporting
- displayed-answer correctness was not recorded separately, so no independent answer-accuracy figure is claimed; a future run should record expected text, recognized text, displayed answer and expected answer

---

## 17. Known Limitations

- **Stray marks:** a tiny accidental pen mark becomes a decimal point (for example `2+3×4-6÷2.=` in one run).
- **Very small symbols:** below roughly 8 px, the three strokes of `÷` can no longer be told apart from `-` plus dots.
- **Segmentation thresholds** are heuristic and tuned on one writer.
- **Digits written in several pieces** (such as a `9` drawn with a separate tail) can be split into several groups.
- **Misread symbols:** `6` was the weakest digit in the symbol screening (2/5), and low-confidence `=` reads occur.
- **Single line only:** stacked equations are not supported.
- **Model overconfidence:** the softmax confidence is often near 100% for wrong labels, so it is not a reliable correctness signal.
- **Extra classes:** X, Y and Z are not valid expression symbols.
- **Small evaluation:** one writer, one device.

---

## 18. Licensing and Third-Party Model Handling

The Sagyam model is distributed under GPL-3.0, and CalcInk redistributes its files in `public/models/sagyam/V3/`.

Decision: the CalcInk repository is published under **GPL-3.0** as well. Upstream copyright and license notices are kept, and any changes are stated in the README.

Required before submission:

- root `LICENSE` file with the GPL-3.0 text
- `public/models/sagyam/NOTICE.md` identifying the model, its source repository, license, local path, architecture, date copied, and whether the model files were modified

This section is a project decision and not legal advice.

---

## 19. Testing Status

The automated suite covers: basic setup, coordinate conversion, stroke history, geometry, post-processing, the arithmetic evaluator (valid input, division by zero, malformed input, randomized no-throw check, formatting), segmentation, the recognition pipeline, answer layout, and the recognition scheduler.

Current status: **84 tests across 10 test files, all passing**, and the production build completes.

Manual browser checks: automatic recognition after pen-up, removal of the old answer when a new stroke starts, undo and clear handling, and rapid writing without a recognition run per stroke.

---

## 20. Project Architecture

```text
src/
├── canvas/
│   ├── drawingCanvas.ts
│   ├── history.ts
│   ├── coordinates.ts
│   └── types.ts
├── recognition/
│   ├── geometry.ts
│   ├── segment.ts
│   ├── preprocess.ts
│   ├── postprocess.ts
│   ├── pipeline.ts
│   ├── recognitionClient.ts
│   ├── vocabulary.ts
│   ├── answerLayout.ts
│   └── scheduler.ts
├── worker/
│   └── recognition.worker.ts
├── math/
│   └── evaluate.ts
└── main.ts
```

The handwritten stroke state remains the source of truth.

---

## 21. Implementation Status and Remaining Work

### Completed

- responsive digital-ink canvas (mouse, stylus, touch via pointer events, coalesced events)
- smooth stroke rendering and high-DPI scaling
- stroke width, undo, redo, clear
- stroke-based state
- symbol segmentation and geometric post-processing
- per-symbol preprocessing and geometric decimal-point detection
- local Sagyam model with TensorFlow.js inference in a Web Worker
- deterministic arithmetic parser (precedence, multi-digit, decimals, negatives, division by zero)
- automatic recognition with debounce and stale-result protection
- inline answer projection
- automated test suite

### Still required before submission

- stroke eraser, wired into stroke history so undo and redo stay consistent
- pixel eraser (listed in the problem statement)
- service worker caching the application and model files, verified in airplane mode
- production deployment and live demo link
- measurements: drawing frame rate, recognition latency, memory over a long session
- README (quick start, architecture, model attribution, evaluation, limitations)
- root GPL-3.0 `LICENSE` and `public/models/sagyam/NOTICE.md`
- final repository review (no debug `console.log`, no stale files, model files tracked)

Before submission run:

```text
npm test -- --run
npm run build
```