# CalcInk Model & Architecture Decisions

Last updated: 2026-10-05

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

Required vocabulary: **16 classes** (10 digits, 4 operators, decimal point, equals).

The recognition pipeline runs entirely on-device in the browser.

The application supports offline operation after the required application assets and model files have been downloaded and cached.

The project uses an existing open-source pre-trained model rather than training a recognition model from scratch.

---

## 2. Current Stroke Data Model

The visible canvas is not treated as the source of truth. The source of truth is the stroke state.

### Point

Each point contains an x coordinate, a y coordinate and a timestamp.

```ts
type Point = {
  x: number;
  y: number;
  time: number;
};
```

### Stroke

Each stroke contains a stroke id, a stroke width and an ordered list of points.

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
3. stroke erasing
4. pixel erasing
5. segmentation and preprocessing
6. handwriting recognition

The generated answer is stored separately as an annotation layer and is never added to the stroke history. Therefore it cannot be mistaken for handwriting during recognition.

---

## 3. Model Candidates

### Candidate 1: Sagyam Handwritten Character Recognition

Repository: https://github.com/Sagyam/Handwritten-Optical-Character-Recognition

| | |
|---|---|
| Runtime | TensorFlow.js |
| License | GPL-3.0 (verified from the repository's LICENSE file) |
| Model format | TensorFlow.js Layers Model |
| Input | 100 × 100 × 3 RGB float32 tensor |
| Parameter count | 3,594,323 (matches the sum of the layer parameter counts) |
| Output | 19 classes |

Model architecture:

- MobileNetV2 backbone without the classification head
- Global max pooling
- BatchNormalization
- Dense(1024, ReLU)
- Dropout(0.3)
- Dense(19, Softmax)

#### Class-index mapping

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

The required CalcInk vocabulary is represented by indices 0-15.

The additional model classes are X, Y and Z. CalcInk does not treat them as valid mathematical expression symbols. If one reaches the evaluator, the expression is rejected as a syntax error and the user sees an error rather than a silently accepted result.

The class order was taken from the original application source and checked empirically during CalcInk testing.

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

The saved model configuration references `L1` and `L2` regularizers that TensorFlow.js 3.12.0 does not resolve by default. Compatibility registrations for both are performed in the worker before model loading.

#### Model size

The model manifest contains 3,594,323 float32 parameters, which is approximately 13.71 MiB of raw float32 parameter storage (calculated from the tensor shapes).

The directly measured local model payload is:

```text
model.json              104,203 bytes
group1-shard1of4.bin  4,194,304 bytes
group1-shard2of4.bin  4,194,304 bytes
group1-shard3of4.bin  4,194,304 bytes
group1-shard4of4.bin  1,794,380 bytes

Total                14,481,495 bytes ≈ 13.81 MiB
```

The 13.71 MiB value is therefore a parameter-storage calculation, while 13.81 MiB is the measured size of the model files bundled with CalcInk. The four weight shards add up exactly to the calculated parameter storage; the difference is `model.json`.

#### Original model preprocessing

The reference application reads the canvas as RGB, resizes it to 100 × 100 using bilinear interpolation, divides pixel values by 255, and adds a batch dimension.

CalcInk deliberately uses a symbol-level preprocessing pipeline instead; see Section 12.

#### Symbol-level screening on the live demo

Each required symbol was handwritten five times in the Sagyam live demo. Overall result: **72/80 correct (90%)**. The main weakness in that screening was handwritten `6` (2/5). The full per-symbol table is in Section 6.

#### Status

**Selected primary recognition model.** Sagyam was selected after the symbol-level screening and successful local integration into CalcInk.

---

### Candidate 2: ink-on / CoMER

Repository (as reported during the search): https://github.com/kimseungdae/ink-on

Runtime: ONNX Runtime Web. Model: CoMER, a whole-expression recognizer.

Reported model footprint (not independently re-measured for CalcInk):

- encoder_int8.onnx: 3.4 MB
- decoder_int8.onnx: 4.0 MB
- total: 7.2 MB

**Status: documented alternative, not selected.** The CalcInk design explicitly exposes the stroke-to-tensor stage and uses per-symbol classification.

### Candidate 3: TrOCR-LaTeX ONNX

Repository: https://huggingface.co/onnx-community/latex_finetuned-ONNX

Runtime: ONNX / Transformers.js. Purpose: handwritten mathematical expression recognition.

Reported repository size: approximately 4.6 GB (not re-measured for CalcInk).

**Status: not selected.** The reported footprint appeared unsuitable for a lightweight offline, client-side architecture.

### Candidate 4: altynbk handwritten-math-recognition

Reported during the initial model search (not verified directly): MIT license, Keras models, 15 classes, no decimal-point class.

**Status: fallback candidate, not used.** It would have required browser-oriented model conversion and separate decimal-point handling.

### Candidate 5: LaTeXVision

Reported during the initial model search as a server-oriented solution.

**Status: not selected.** A server-dependent recognition path conflicts with the 100% on-device requirement.

### Candidate comparison

| Candidate | Size | License | Runtime | Required-vocabulary fit | Status |
|---|---|---|---|---|---|
| Sagyam | 13.81 MiB (measured) | GPL-3.0 (verified) | TensorFlow.js | The 16 required symbols are within its 19 classes | **Selected**: best fit for the per-symbol offline browser design; integrated locally and screened at 72/80 |
| ink-on / CoMER | 7.2 MB (reported) | Not verified | ONNX Runtime Web | Whole-expression recognizer; vocabulary coverage not verified | Not selected: less aligned with the explicit stroke-to-tensor, per-symbol design |
| TrOCR-LaTeX ONNX | about 4.6 GB (reported) | Not verified | ONNX / Transformers.js | Whole-expression recognizer | Not selected: footprint unsuitable for a lightweight offline client |
| altynbk | Not verified | MIT (reported) | Keras | 15 classes, no decimal point | Not selected: needs conversion and separate decimal handling |
| LaTeXVision | Not verified | Not verified | Server-oriented | Whole-expression recognition | Not selected: server dependence conflicts with the on-device requirement |

Figures marked "reported" were taken from the model-search notes and were not independently re-measured. Only Sagyam's model payload was measured locally.

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
8. Inference architecture and latency
9. Offline suitability
10. Web Worker compatibility

The selected model was chosen using the complete CalcInk architecture, not on model size alone.

---

## 5. Recognition Architecture

```text
Pointer input
      ↓
Stroke capture
      ↓
Stroke history
      ↓
Recognition scheduling
      ↓
Symbol segmentation
      ↓
Per-symbol preprocessing
      ↓
100 × 100 RGB input
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

A per-symbol classifier is used because it makes the stroke-to-tensor pipeline explicit and allows the exact CalcInk vocabulary to be controlled independently from the arithmetic parser. Whole-expression recognition models remain documented alternatives.

### Main-thread responsibilities

- pointer input and stroke storage
- canvas rendering
- undo/redo and clear
- stroke width
- stroke and pixel eraser interaction
- symbol segmentation
- per-symbol image preparation
- recognition scheduling
- answer display

### Worker responsibilities

- TensorFlow.js model loading
- converting image data to a tensor
- neural-network inference
- returning predictions

Heavy model inference therefore runs outside the main drawing interaction path. Recognition requests carry an id, and worker responses are matched by id.

---

## 6. Handwriting Evaluation Protocol (symbol level, live demo)

Each required symbol was handwritten at least five times in the Sagyam live demo before local integration.

Symbols:

```text
0 1 2 3 4 5 6 7 8 9
+ - × ÷ . =
```

Multi-stroke symbols (`+`, `=`, `÷`, `×`) were drawn with natural gaps between strokes.

The test also specifically checked × versus X, handwritten division versus the model's division form, decimal point versus an accidental dot, and `=` as two separate strokes.

### Test results

| Symbol | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Attempt 5 | Correct |
| ------ | --------- | --------- | --------- | --------- | --------- | ------- |
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

This was a small personal handwriting test on the demo's own pipeline. It measures the model plus the demo's preprocessing and is not a general accuracy estimate.

---

## 7. Initial Decision Rule

The initial Sagyam screening heuristic was:

- at least 14 of the 16 symbols should achieve 4/5 or better
- both `.` and `=` should work
- persistent `.` or `=` failures would trigger evaluation of the fallback
- persistent × versus X confusion could justify post-processing

Result:

- 15 of 16 symbols reached at least 4/5
- `.` was 5/5
- `=` was 4/5
- overall result was 72/80

Therefore Sagyam passed the initial screening. This rule was an engineering heuristic for the initial model-selection stage, not a statistical standard.

---

## 8. Current Model Decision

**Sagyam is the selected primary recognition model.**

Reasons:

- browser-side TensorFlow.js inference
- local model assets
- Web Worker inference
- 100 × 100 × 3 input
- 19-class output containing the 16 required CalcInk symbols
- straightforward per-symbol classification
- successful local integration
- 72/80 symbol-level screening result
- 29/30 exact-text accuracy on the fresh expression-level evaluation
- successful deployed offline verification

The fresh expression-level result is a small-sample engineering measurement and is not presented as a general handwriting-recognition benchmark. Known weaknesses are documented in Section 17.

---

## 9. Stroke Segmentation

Every pen contact is stored as a separate stroke. Before recognition, strokes are grouped into candidate symbols using geometric features.

Each stroke is analyzed using its bounding box, width and height, center position, horizontal overlap, vertical gap relative to neighboring groups, and relative size.

Current defaults:

```text
minWidth      = 8
overlapRatio  = 0.6
gapFactor     = 0.8
```

These thresholds are heuristic and configurable.

### Multi-stroke symbols

- **Equals (`=`):** two roughly horizontal strokes, one above the other, with substantially overlapping horizontal ranges and a small vertical separation. Two horizontal strokes far apart horizontally are not automatically merged into `=`.
- **Plus (`+`):** a roughly horizontal and a roughly vertical stroke, grouped only when they actually cross. A small crossing tolerance prevents nearby independent strokes from merging.
- **Multiply (`×`):** two roughly diagonal strokes that cross near their centers.
- **Division (`÷`):** an upper dot, a horizontal bar and a lower dot arranged around the bar.

### Dot-like strokes

Very small strokes are handled separately from generic merging so they are not unnecessarily attached to neighboring symbols.

### Generic merging

Generic merging requires actual horizontal overlap before the overlap-ratio and vertical-gap conditions are applied, which helps prevent adjacent symbols from being merged incorrectly.

Merging repeats until no pair qualifies, because a successful merge can create a larger group that enables another valid merge.

### Ordering

Groups are sorted left to right by center x.

```text
strokes
   ↓
[group for 1] [group for +] [group for 2] [group for =]
   ↓
1 + 2 =
```

---

## 10. Recognition Post-processing

Post-processing handles geometric cases where the raw model label is not sufficient.

Current rules:

```text
two horizontal strokes  → =
one horizontal stroke   → -
valid division layout   → ÷
```

Post-processing uses stroke geometry and never calls the arithmetic evaluator to guess a symbol.

During evaluation, the debug output showed the raw model label next to the final label (`[label] raw=[label]`), so any label change caused by post-processing is visible in the debug data.

---

## 11. Decimal Point Handling

The expression pipeline detects decimal points geometrically. After segmentation, the tallest symbol group is the reference height, and a sufficiently small group is labelled `.` without asking the model:

```text
DOT_RATIO = 0.2
```

This provides a more stable representation for tiny handwritten dots after symbol cropping and resizing. The model's own decimal class remains part of its vocabulary, but the pipeline does not rely exclusively on it for tiny isolated dots.

---

## 12. Recognition Preprocessing

The visible canvas uses a CSS background while its drawing buffer is transparent, so recognition does not read the visible canvas directly. Each symbol group is rendered onto an offscreen canvas with an explicit solid background.

### Pipeline

```text
Symbol group strokes
        ↓
Bounding box
        ↓
Square crop
        ↓
Expanded margin
        ↓
Render with uniform scale
        ↓
White background + black ink, constant ink thickness
        ↓
100 × 100 RGB ImageData
        ↓
Transfer to worker
        ↓
Float32 tensor, pixel / 255
        ↓
[1, 100, 100, 3]
        ↓
Sagyam model
```

The current configuration uses a nominal output ink thickness of 7 px.

### Why this differs from the original application

The original application resizes its complete 400 × 400 canvas to 100 × 100. CalcInk uses a full-window canvas containing comparatively small symbols, so resizing the whole canvas would shrink symbols and can make their strokes too thin. Cropping each segmented symbol and applying a single uniform scale avoids that problem.

The worker constructs the tensor directly from RGB bytes instead of relying on `tf.browser.fromPixels`, avoiding backend-specific behavior in the worker.

### Experiment: wider symbol margin

The earlier crop already had a surrounding margin (10% on each side). A larger effective margin (an additional 15% padding) was added and tested as a single fixed configuration, not a sweep of values.

Approximate symbol occupancy of the final 100 × 100 image changed from about 83% to about 64%.

| Expression | Before | After |
| ---------- | -----: | ----: |
| `100÷0=` | 1/5 | 5/5 |
| `2+3×4-6÷2=` | 2/5 | 4/5 |

These were small samples from different drawing sessions, and the tested expressions were part of the tuning process. The measurements are therefore engineering evidence for the chosen configuration, not an independent benchmark. The larger margin was retained because it improved both tests.

The experiment does not establish why the larger margin helped. A possible hypothesis is that the additional empty space makes the input more similar to the model's training examples, but that has not been verified.

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

Precedence follows directly from the grammar:

- × and ÷ bind tighter than + and -
- operators are left-associative
- unary minus binds to a following number or unary expression

Supported: multi-digit integers, decimal numbers, negative numbers (including `5--3` and `5×-3`), `+`, `-`, `×`, `÷` and a terminal `=`.

### Error handling

- Division by zero returns an `undefined` error, shown as **Undefined**.
- Malformed input (for example `2++3`, `2×÷3`, `1.2.3`, or an empty expression) returns a `syntax` error, shown as **Error**.
- The evaluator returns errors as values and never throws; a randomized test confirms it does not throw on garbage input.
- Results are formatted to 12 significant digits, which hides floating-point noise such as 0.30000000000000004.

---

## 14. Automatic Recognition and Scheduling

Recognition runs automatically after writing:

```text
Stroke committed (or undo / redo / clear / erase)
      ↓
600 ms debounce
      ↓
Recognition
      ↓
Expression evaluation
      ↓
Answer projection
```

The debounce allows multi-stroke symbols such as `=`, `+` and `÷` to finish before recognition.

Each scheduled recognition run receives a version number, and a result is applied only when its version is still current, so a slow result from an older expression cannot overwrite a newer one. A new pointer-down cancels pending recognition and removes the old answer.

Worker requests also carry request ids, and responses are matched by id.

---

## 15. Dynamic Answer Projection

When the recognized expression ends with `=`, the expression is evaluated and the result is rendered beside the equals sign.

Example:

```text
18 + 4 × 3 = 30
```

The answer is an annotation layer rather than a user stroke. It:

- is placed immediately to the right of `=`
- is vertically centered on `=`
- is sized from the median recognized digit height within fixed bounds
- uses a separate visual style (blue for answers, red for **Undefined** and **Error**)
- disappears when the user starts a new stroke or edits the canvas

The toolbar also displays the recognized expression and result. For division by zero, the projected answer is **Undefined**.

### Recognition overlay

CalcInk includes an optional recognition overlay that is **off by default**.

When enabled, each recognized symbol is shown with a thin dashed bounding box and a label with the recognized symbol and the model-reported confidence percentage, for example `7 92%`.

Confidence levels:

- 90% or above: high (green)
- 60-89%: medium (amber)
- below 60%: low (red)

The overlay is a usability and debugging aid. The displayed confidence is the model's softmax confidence and is **not a guarantee that the recognition is correct**; the model can be highly confident in an incorrect classification.

The overlay does not modify the recognition pipeline, segmentation, preprocessing or arithmetic evaluation, and it is rendered separately from the handwriting stroke state.

---

## 16. Fresh Expression-Level Evaluation

After recognition, segmentation and preprocessing tuning, a fresh expression-level evaluation was run.

### Protocol

- 10 expressions
- 3 official attempts per expression
- 30 official runs
- one writer, one device

### Official set and result

| Expression | Correct |
| ---------- | ------: |
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

Exact recognized-text accuracy: **29/30 = 96.7%**, reported as **approximately 97%** because the sample is small.

### Failed official run

```text
Expected:   9-4=
Recognized: Y1.-4=
```

The recognized text has 6 symbols for a 4-symbol expression: the intended `9` was split into three groups before classification, and those fragments were labelled `Y`, `1` and `.`, followed by the correctly recognized `-`, `4` and `=`.

Stage: **segmentation, followed by model classification of the fragments.** It is not described as a single-glyph model-only error. No post-processing mismatch was observed in the logged `[label] raw=[label]` output for this run (see `docs/eval-fresh-set.txt`).

### Runs outside the official denominator

- One additional `9-4=` attempt was made after the planned three. It **passed**, so the raw log contains 3 passed and 1 failed for `9-4=`. The additional attempt is excluded from the official 30-run denominator.
- One `25×6=` run was written by accident and was not part of the test set. It is also excluded.

Both are kept in the raw log, `docs/eval-fresh-set.txt`.

### Caveats

- one writer, one device, small sample
- earlier evaluation sets were used during recognition, preprocessing and segmentation tuning

The 29/30 result is a small-sample engineering measurement and not a general handwriting-recognition benchmark.

### Answer accuracy

Displayed-answer correctness was not recorded as a separate metric in this evaluation, so no independent answer-accuracy percentage is claimed. A future evaluation should record the expected expression, recognized expression, displayed answer and expected answer, so that recognition accuracy and answer accuracy can be measured independently.

---

## 17. Known Limitations

- **Main-thread preprocessing and drawing responsiveness.** Segmentation and per-symbol image preparation run on the main thread. Model loading and inference stay in the Web Worker, so the heaviest model computation is kept off the drawing path. In the measured drawing test, Chrome Frame Rendering Stats showed about 58 FPS typically, a maximum of 60.2 and a minimum of 30. The result is therefore described as "typically near 60 FPS with transient dips", not as a guarantee. It was not measured whether the dips coincide with recognition requests. Moving the preprocessing into the worker was not attempted, because it would change the measured architecture.
- **Stray marks.** A tiny accidental pen mark can become a decimal point.
- **Very small symbols.** Below about 8 px, the components of `÷` become difficult to separate reliably.
- **Segmentation thresholds** are heuristic and were tuned mainly with one writer.
- **Multi-piece digits.** A digit drawn in several disconnected pieces can be split into several symbol groups, as in the failed `9-4=` run.
- **Recognition confidence.** The softmax confidence can be close to 100% for a wrong classification, so it is not a correctness guarantee.
- **Extra model classes.** X, Y and Z are not valid CalcInk symbols.
- **Expression layout.** Only a single left-to-right expression is supported; stacked equations are not.
- **Evaluation size.** The fresh evaluation used one writer, one device and 30 official runs.
- **Stroke eraser.** It removes complete strokes.
- **Pixel eraser.** It may split one stroke into several independent strokes. Undo restores the original stroke rather than rejoining the pieces. The radius is fixed, with no size control.

---

## 18. Eraser Architecture

CalcInk supports two eraser modes.

### Stroke eraser

The stroke eraser uses pure geometric hit testing:

```text
pointer position
      ↓
point-to-segment distance
      ↓
stroke hit test
      ↓
stroke id collected
```

On pointer-up, all selected stroke ids are committed as one history action, so one continuous erase drag corresponds to one undo operation.

### Pixel eraser

The pixel eraser clips stroke segments against a circular eraser region. A sparse polyline is handled by intersecting each segment with the eraser circle, so a fast stroke segment is cut even if no recorded point lies inside the erased area.

Boundary points are interpolated, including their timestamps. Very small remaining pieces are discarded so they do not become accidental decimal-point candidates. Eraser positions are interpolated during fast drags so the eraser cannot easily skip over a thin stroke between two pointer events.

### History model

`StrokeHistory` stores undoable actions rather than only a redo stroke list. The action model supports:

```text
add
edit / replace
```

Whole-stroke erasing is a replacement with no pieces. Pixel erasing replaces one or more original strokes with their remaining pieces. This keeps one erase drag a single undo/redo operation.

---

## 19. Offline / PWA Architecture

CalcInk uses `vite-plugin-pwa` with a Workbox-generated service-worker precache.

The configuration precaches `js`, `css`, `html`, `json`, `bin` and `webmanifest` files and raises the Workbox maximum file size to 10 MiB, because individual model shards are several megabytes.

The production build generates:

```text
dist/sw.js
dist/workbox-*.js
dist/manifest.webmanifest
dist/registerSW.js
```

The build reports:

```text
PWA v1.3.0
mode       generateSW
precache   12 entries
```

The generated precache payload is about 15.3 MiB (about 15,667 KiB). This is the first-visit payload, including application assets and the bundled model files; it is not the model-only size. The four model shards were confirmed in the generated service worker's precache list.

### Local offline verification

The production preview was opened at `http://localhost:4173/`. The browser showed the service worker as activated and running, and Cache Storage contained `model.json` and the four `group1-shard*of4.bin` files.

The preview server was then stopped completely and the application was reloaded. The offline test succeeded:

- the page loaded
- `Model ready` appeared
- `2+3=` was recognized
- the result `5` was displayed

### Deployed offline verification

Production deployment: https://calcink-on-device-handwritten-math-nu.vercel.app/

The deployed application was opened in Chrome and allowed to finish loading. Offline mode was then enabled with Chrome DevTools → Network → Offline, and the same URL was reloaded. The following was verified:

- the application loaded successfully
- `Model ready` appeared
- handwritten recognition continued to work
- the recognition overlay button remained available, and the overlay worked without network access

Result: **PASS.** The final deployed application, including the optional recognition overlay, operates without network connectivity after the application assets and model files have been cached. This verification was performed on the deployment containing the overlay.

The first visit still requires network access to download and cache the assets.

---

## 20. Testing Status

The automated suite covers: basic project setup, coordinate conversion, stroke history (including erase and replace actions), geometry, post-processing, arithmetic evaluation, symbol segmentation, the recognition pipeline, answer layout, overlay layout, recognition scheduling, stroke hit testing and pixel erasing.

Current status: **125 tests across 13 test files, all passing**, and the production build completes successfully.

### Automated test breakdown

| Test file | Tests |
|---|---:|
| basic | 1 |
| coordinates | 2 |
| evaluate | 36 |
| geometry | 3 |
| history | 15 |
| hitTest | 6 |
| pipeline | 7 |
| pixelErase | 12 |
| postprocess | 3 |
| scheduler | 6 |
| segment | 16 |
| answerLayout | 6 |
| overlayLayout | 12 |
| **Total** | **125** |

### Browser validation

The following behaviors have been verified manually:

1. automatic recognition after pen-up
2. previous answer removal after starting a new stroke
3. automatic recognition of a new expression
4. undo, redo and clear
5. rapid writing with debounced recognition
6. stroke eraser
7. pixel eraser, including undo, redo and fast drags without visible skipped sections
8. recognition updating after erasing
9. local offline loading after the preview server was stopped
10. deployed application loading offline (Chrome DevTools → Network → Offline), with handwritten recognition and answer projection working offline
11. recognition overlay: off by default, boxes, labels and confidence colours, the decimal-point box, and removal after a new stroke, undo and clear
12. touch drawing and recognition on a phone against the deployed URL, including the overlay, undo and clear

### Performance validation

#### Recognition latency

A temporary browser-console instrumentation pass measured model inference and end-to-end recognition.

```text
Model inference:   samples = 106
                   min 9.2 ms | max 437.0 ms | mean 27.74 ms | median 24.15 ms

End-to-end:        runs = 41
                   max 443.8 ms | mean 84.21 ms | median 62.9 ms
```

The end-to-end sample set included empty-canvas recognition calls. They are included in the mean and median, which are therefore slightly lower than they would be for user-facing recognitions only, and the 0 ms minimum is not reported because it does not represent a user-facing operation.

A separate later session observed a cold-start inference of about 732 ms; that is treated as an initialization observation and not as the steady-state summary. The instrumentation was removed before the final production build.

#### Drawing performance

Chrome Frame Rendering Stats were used during a manual drawing test:

```text
typical / sustained ≈ 58 FPS
maximum              = 60.2 FPS
minimum observed     = 30 FPS
```

The result supports "typically near 60 FPS with transient dips", not a guarantee of 60 FPS on all workloads and devices. The measurement was repeated with console logging suppressed so that diagnostic logging was not the main source of main-thread overhead. It was not measured whether the dips are correlated with recognition requests.

#### Memory stability

A Chrome Performance recording covered about 5.3 minutes:

```text
JS heap    = 3.6–4.7 MB
Documents  = 1–1
Listeners  = 21–21
```

The JS heap rose and fell repeatedly with no continuous upward trend, and the stable document and listener counts argue against obvious persistent accumulation in the tested session. This is an observational stability test, not proof of the absence of leaks.

The measured page heap does not include the TensorFlow.js model memory held by the recognition worker, so it must not be read as total application memory. No dedicated `tf.memory().numTensors` leak test was run in the worker.

#### Browser responsiveness

```text
LCP = 0.12 s
INP = 32–48 ms   (two local measurements)
CLS = 0.01       (separate Performance recording)
```

These were collected locally on one device and are not population-level field metrics.

---

## 21. Project Architecture

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
│   ├── segment.ts
│   ├── preprocess.ts
│   ├── postprocess.ts
│   ├── pipeline.ts
│   ├── recognitionClient.ts
│   ├── vocabulary.ts
│   ├── answerLayout.ts
│   ├── overlayLayout.ts
│   └── scheduler.ts
├── worker/
│   └── recognition.worker.ts
├── math/
│   └── evaluate.ts
└── main.ts

public/models/sagyam/       model files and NOTICE.md
tests/                      automated tests
docs/eval-fresh-set.txt     raw evaluation log
DECISIONS.md
README.md
LICENSE
vite.config.ts
package.json
package-lock.json
```

The handwritten stroke state remains the source of truth, and the generated answer remains separate from it.

---

## 22. Documentation and Licensing Status

Documentation and licensing files:

- root `LICENSE` (GPL-3.0)
- `README.md`: quick start, architecture, model attribution, performance and evaluation summaries, and the live demo link
- `public/models/sagyam/NOTICE.md`
- `docs/eval-fresh-set.txt`
- `DECISIONS.md` (this file)

The CalcInk repository is published under GPL-3.0. The Sagyam model is third-party GPL-3.0 material redistributed in `public/models/sagyam/V3/`. Its source, license, architecture, class mapping and redistribution details are documented in `public/models/sagyam/NOTICE.md`.

---

## 23. Implementation Status

### Completed

- responsive digital-ink canvas with mouse, stylus and touch input
- pointer events with coalesced-event handling
- smooth stroke rendering and high-DPI scaling
- stroke width, undo, redo and clear
- stroke-based state
- stroke eraser and pixel eraser, both undoable
- symbol segmentation and geometric post-processing
- symbol preprocessing and geometric decimal-point handling
- local Sagyam model integration with TensorFlow.js inference in a Web Worker
- request-id matching
- deterministic arithmetic parser (precedence, multi-digit, decimals, negatives, division by zero)
- automatic recognition with 600 ms debounce and stale-result protection
- inline answer projection and dynamic answer removal
- optional recognition overlay with confidence colours
- PWA service worker with model precaching, verified offline locally and on the deployed site
- deployed Vercel version
- README, model notice and root GPL-3.0 license
- fresh expression-level evaluation
- recognition latency, drawing performance and memory stability measurements
- 125 automated tests and a successful production build

### Remaining

Submission only: the repository link and the live demo link.

---

## 24. Final Validation Checklist

Run:

```text
npm test -- --run
npm run build
```

Verified:

- [x] 125 tests passing
- [x] production build succeeds
- [x] service worker generated
- [x] all four model shards included in the precache
- [x] live deployment works
- [x] deployed offline mode works after the initial online load
- [x] recognition latency measured
- [x] drawing performance measured
- [x] memory usage measured
- [x] drawing is typically near 60 FPS
- [x] temporary debug instrumentation removed
- [x] all model files are tracked
- [x] README contains the live demo URL
- [x] documentation reflects the current measured state

### Live demo

https://calcink-on-device-handwritten-math-nu.vercel.app/

The deployed application has been verified, using Chrome DevTools → Network → Offline, to continue functioning after network access was disabled, provided that the application and model assets had already been cached.