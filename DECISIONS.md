# CalcInk Model & Architecture Decisions

Last updated: 2026-10-03

---

## 1. Problem Requirement

CalcInk must recognize handwritten mathematical expressions containing:

* digits 0-9
* plus (+)
* minus (-)
* multiplication (×)
* division (÷)
* decimal point (.)
* equals (=)

Required vocabulary: **16 classes**
(10 digits, 4 operators, decimal point, equals).

The recognition pipeline runs entirely on-device in the browser.

The application supports offline operation after the required application assets
and model files have been downloaded and cached.

The project uses an existing open-source pre-trained model rather than
training a recognition model from scratch.

---

## 2. Current Stroke Data Model

The visible canvas is not treated as the source of truth.

The source of truth is the stroke state.

### Point

Each point contains:

* x coordinate
* y coordinate
* timestamp

```ts
type Point = {
  x: number;
  y: number;
  time: number;
};
```

### Stroke

Each stroke contains:

* stroke id
* stroke width
* ordered list of points

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

The generated answer is stored separately as an annotation layer and is never
added to the stroke history. Therefore it cannot be mistaken for handwriting
during recognition.

---

## 3. Model Candidates

### Candidate 1: Sagyam Handwritten Character Recognition

Repository:

https://github.com/Sagyam/Handwritten-Optical-Character-Recognition

Runtime:

TensorFlow.js

License:

GPL-3.0

Model format:

TensorFlow.js Layers Model

Input:

100 × 100 × 3 RGB float32 tensor

Model architecture:

* MobileNetV2 backbone without the classification head
* Global max pooling
* BatchNormalization
* Dense(1024, ReLU)
* Dropout(0.3)
* Dense(19, Softmax)

Parameter count:

3,594,323

The parameter count matches the sum of the layer parameter counts.

Model output:

19 classes.

### Class-index mapping

| Index | Label        |
| ----: | ------------ |
|     0 | 0            |
|     1 | 1            |
|     2 | 2            |
|     3 | 3            |
|     4 | 4            |
|     5 | 5            |
|     6 | 6            |
|     7 | 7            |
|     8 | 8            |
|     9 | 9            |
|    10 | Add (+)      |
|    11 | Decimal (.)  |
|    12 | Division (÷) |
|    13 | Equals (=)   |
|    14 | Multiply (×) |
|    15 | Minus (-)    |
|    16 | X            |
|    17 | Y            |
|    18 | Z            |

The required CalcInk vocabulary is represented by indices 0-15.

The additional model classes are X, Y and Z. CalcInk does not treat them as
valid mathematical expression symbols. If one reaches the evaluator, the
expression is rejected as a syntax error and the user sees an error rather
than a silently accepted result.

The class order was taken from the original application source and checked
empirically during CalcInk testing.

---

### Model files

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

The saved model configuration references `L1` and `L2` regularizers that
TensorFlow.js 3.12.0 does not resolve by default. Compatibility
registrations for both are performed in the worker before model loading.

---

### Model size

The model manifest contains:

```text
3,594,323 float32 parameters
```

This corresponds to approximately:

```text
13.71 MiB
```

of raw float32 parameter storage.

The directly measured local model payload is:

```text
model.json              104,203 bytes
group1-shard1of4.bin  4,194,304 bytes
group1-shard2of4.bin  4,194,304 bytes
group1-shard3of4.bin  4,194,304 bytes
group1-shard4of4.bin  1,794,380 bytes
```

Total measured model payload:

```text
14,481,495 bytes ≈ 13.81 MiB
```

The 13.71 MiB value is therefore a parameter-storage calculation, while
13.81 MiB is the measured size of the model files bundled with CalcInk.

---

### Original model preprocessing

The reference application reads the canvas as RGB, resizes it to 100 × 100
using bilinear interpolation, divides pixel values by 255, and adds a batch
dimension.

CalcInk deliberately uses a symbol-level preprocessing pipeline instead;
see section 12.

---

### Symbol-level screening on the live demo

Each required symbol was handwritten five times in the Sagyam live demo.

Overall result:

**72/80 correct (90%)**

The main weakness in that screening was handwritten `6`:

**2/5**

The full per-attempt table is recorded in section 6.

---

### Status

**Selected primary recognition model**

Sagyam was selected after the symbol-level screening and successful local
integration into CalcInk.

---

### Candidate 2: ink-on / CoMER

Repository:

https://github.com/kimseungdae/ink-on

Runtime:

ONNX Runtime Web

Model:

CoMER, a whole-expression recognizer

Reported model footprint:

* encoder_int8.onnx: 3.4 MB
* decoder_int8.onnx: 4.0 MB
* total: 7.2 MB

These size figures were not independently re-measured for CalcInk.

**Status: documented alternative, not selected.**

It was not selected for the current implementation because the CalcInk design
explicitly exposes the stroke-to-tensor stage and uses per-symbol
classification.

---

### Candidate 3: TrOCR-LaTeX ONNX

Repository:

https://huggingface.co/onnx-community/latex_finetuned-ONNX

Runtime:

ONNX / Transformers.js

Purpose:

Handwritten mathematical expression recognition.

Reported repository size:

Approximately 4.6 GB.

The exact figure was not re-measured for CalcInk.

**Status: not selected.**

The reported footprint appeared unsuitable for the lightweight offline,
client-side architecture targeted by CalcInk.

---

### Candidate 4: altynbk handwritten-math-recognition

Reported during the initial model search:

* MIT license
* Keras models
* 15 classes
* no decimal-point class

**Status: fallback candidate, not used.**

Using it would have required browser-oriented model conversion and separate
decimal-point handling.

---

### Candidate 5: LaTeXVision

Reported during the initial model search as a server-oriented solution.

**Status: not selected.**

A server-dependent recognition path conflicts with the 100% on-device
requirement.

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

The selected model was chosen using the complete CalcInk architecture, not on
model size alone.

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

A per-symbol classifier is used because it makes the stroke-to-tensor pipeline
explicit and allows the exact CalcInk vocabulary to be controlled
independently from the arithmetic parser.

Whole-expression recognition models remain documented alternatives.

### Main-thread responsibilities

* pointer input and stroke storage
* canvas rendering
* undo/redo
* clear
* stroke width
* stroke and pixel eraser interaction
* symbol segmentation
* per-symbol image preparation
* recognition scheduling
* answer display

### Worker responsibilities

* TensorFlow.js model loading
* converting image data to a tensor
* neural-network inference
* returning predictions

Heavy model inference therefore runs outside the main drawing interaction
path.

Recognition requests carry an id, and worker responses are matched by id.

---

## 6. Handwriting Evaluation Protocol (symbol level, live demo)

Each required symbol was handwritten at least five times in the Sagyam live
demo before local integration.

Symbols:

```text
0 1 2 3 4 5 6 7 8 9

+ - × ÷ . =
```

Multi-stroke symbols were drawn with natural gaps between strokes:

* `+`
* `=`
* `÷`
* `×`

The test also specifically checked:

* × versus X
* handwritten division versus the model's division form
* decimal point versus an accidental dot
* `=` as two separate strokes

### Test results

| Symbol | Attempt 1 | Attempt 2 | Attempt 3 | Attempt 4 | Attempt 5 | Correct |
| ------ | --------- | --------- | --------- | --------- | --------- | ------- |
| 0      | 0         | 0         | 0         | 0         | 0         | 5/5     |
| 1      | 1         | 1         | 3         | 1         | 1         | 4/5     |
| 2      | 2         | 2         | X         | 2         | 2         | 4/5     |
| 3      | 3         | 3         | 3         | 3         | 3         | 5/5     |
| 4      | 4         | 4         | 4         | 4         | 4         | 5/5     |
| 5      | 5         | 5         | 3         | 5         | 5         | 4/5     |
| 6      | 6         | 3         | 8         | 6         | 8         | 2/5     |
| 7      | 7         | 7         | 7         | 7         | 7         | 5/5     |
| 8      | 8         | 8         | 8         | 8         | 8         | 5/5     |
| 9      | 9         | 9         | 9         | 9         | 9         | 5/5     |
| +      | Add       | Add       | Multiply  | Add       | Add       | 4/5     |
| -      | Minus     | Minus     | Minus     | Minus     | Minus     | 5/5     |
| ×      | Multiply  | Multiply  | Multiply  | Multiply  | Multiply  | 5/5     |
| ÷      | Division  | Division  | Division  | Division  | Division  | 5/5     |
| .      | Decimal   | Decimal   | Decimal   | Decimal   | Decimal   | 5/5     |
| =      | Equals    | Equals    | Minus     | Equals    | Equals    | 4/5     |

Overall:

**72/80 correct (90%)**

This was a small personal handwriting test on the demo's own pipeline. It
measures the model plus the demo's preprocessing and is not a general
accuracy estimate.

---

## 7. Initial Decision Rule

The initial Sagyam screening heuristic was:

* at least 14 of the 16 symbols should achieve 4/5 or better
* both `.` and `=` should work
* persistent `.` or `=` failures would trigger evaluation of the fallback
* persistent × versus X confusion could justify post-processing

Result:

* 15 of 16 symbols reached at least 4/5
* `.` was 5/5
* `=` was 4/5
* overall result was 72/80

Therefore Sagyam passed the initial screening.

This rule was an engineering heuristic for the initial model-selection stage,
not a statistical standard.

---

## 8. Current Model Decision

**Sagyam is the selected primary recognition model.**

Reasons:

* browser-side TensorFlow.js inference
* local model assets
* Web Worker inference
* 100 × 100 × 3 input
* 19-class output containing the 16 required CalcInk symbols
* straightforward per-symbol classification
* successful local integration
* 72/80 symbol-level screening result
* 29/30 exact-text accuracy on the fresh expression-level evaluation

The fresh expression-level result is a small-sample engineering measurement
and is not presented as a general handwriting-recognition benchmark.

Known weaknesses are documented in section 17.

---

## 9. Stroke Segmentation

Every pen contact is stored as a separate stroke.

Before recognition, strokes are grouped into candidate symbols using geometric
features.

Each stroke is analyzed using:

* bounding box
* width and height
* center position
* horizontal overlap
* vertical gap relative to neighboring groups
* relative size

Current defaults:

```text
minWidth      = 8
overlapRatio  = 0.6
gapFactor     = 0.8
```

These thresholds are heuristic and configurable.

### Multi-stroke symbols

#### Equals (`=`)

Two roughly horizontal strokes can form `=` when:

* both are approximately horizontal
* their horizontal ranges overlap substantially
* one stroke is above the other
* their vertical separation is sufficiently small

Two horizontal strokes that are far apart horizontally are not automatically
merged into `=`.

#### Plus (`+`)

A roughly horizontal and a roughly vertical stroke are grouped as `+` only
when they actually cross.

A small crossing tolerance prevents nearby independent strokes from being
merged.

#### Multiply (`×`)

Two roughly diagonal strokes can form `×` when they cross near their
centers.

#### Division (`÷`)

A division symbol can contain:

* upper dot
* horizontal bar
* lower dot

The components must satisfy the expected geometric arrangement around the
bar.

### Dot-like strokes

Very small strokes are handled separately from generic merging so they are
not unnecessarily attached to neighboring symbols.

### Generic merging

Generic merging requires actual horizontal overlap before the configured
overlap-ratio and vertical-gap conditions are applied.

This helps prevent adjacent symbols from being merged incorrectly.

Merging repeats until no pair qualifies, because a successful merge can create
a larger group that enables another valid merge.

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

Post-processing handles geometric cases where the raw model label is not
sufficient.

Current rules include:

```text
two horizontal strokes  → =
one horizontal stroke   → -
valid division layout   → ÷
```

Post-processing uses stroke geometry and never calls the arithmetic evaluator
to guess a symbol.

During evaluation, the debug output showed the raw model label next to the
final label (`[label] raw=[label]`), so any label change caused by
post-processing is visible in the debug data.

---

## 11. Decimal Point Handling

The expression pipeline detects decimal points geometrically.

After segmentation, the tallest symbol group is used as the reference height.

A sufficiently small group is labelled `.` without asking the model:

```text
DOT_RATIO = 0.2
```

This provides a more stable representation for tiny handwritten dots after
symbol cropping and resizing.

The model's own decimal class remains part of the Sagyam vocabulary, but the
current CalcInk pipeline does not rely exclusively on the model to resolve
tiny isolated dots.

---

## 12. Recognition Preprocessing

The visible canvas uses a CSS background while its drawing buffer is
transparent.

Therefore, recognition does not directly interpret the transparent drawing
buffer as the model background.

Instead, each symbol group is rendered onto an offscreen canvas with an
explicit solid background.

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
White background + black ink
        ↓
Constant output ink thickness
        ↓
100 × 100 RGB ImageData
        ↓
Transfer to worker
        ↓
Float32 tensor
        ↓
pixel / 255
        ↓
[1, 100, 100, 3]
        ↓
Sagyam model
```

The current preprocessing configuration uses a nominal output ink thickness
of 7 px.

### Why this differs from the original application

The original application resizes its complete 400 × 400 canvas to 100 × 100.

CalcInk uses a full-window canvas containing comparatively small symbols, so
resizing the whole canvas would shrink symbols and can make their strokes too
thin.

Cropping each segmented symbol and applying a single uniform scale avoids
that problem.

The worker constructs the tensor directly from RGB bytes instead of relying
on `tf.browser.fromPixels`, avoiding backend-specific behavior in the worker.

### Experiment: wider symbol margin

The earlier crop already had a surrounding margin.

A larger effective margin was added and tested as a single fixed configuration
rather than as a sweep of values.

Approximate symbol occupancy of the final 100 × 100 image changed from:

```text
~83%
```

to:

```text
~64%
```

Measured results:

| Expression   | Before | After |
| ------------ | -----: | ----: |
| `100÷0=`     |    1/5 |   5/5 |
| `2+3×4-6÷2=` |    2/5 |   4/5 |

These were small samples from different drawing sessions, and the tested
expressions were part of the tuning process.

Therefore the measurements are engineering evidence for the chosen
configuration, not an independent recognition benchmark.

The larger margin was retained because it improved both tests.

The experiment does not establish why the larger margin helped. A possible
hypothesis is that the additional empty space makes the input distribution
more similar to examples seen by the model during training, but that has not
been independently verified.

---

## 13. Mathematical Evaluation Engine

CalcInk uses a deterministic recursive-descent arithmetic parser.

`eval()` is not used.

Grammar:

```text
expr   := term (('+' | '-') term)*

term   := unary (('×' | '÷') unary)*

unary  := '-' unary | number

number := digits with at most one '.', at least one digit
```

Precedence follows directly from the grammar:

* × and ÷ bind tighter than + and -
* operators are left-associative
* unary minus binds to a following number or unary expression

Supported:

* multi-digit integers
* decimal numbers
* negative numbers
* `+`
* `-`
* `×`
* `÷`
* terminal `=`

The evaluator supports expressions such as:

```text
5--3
5×-3
```

### Error handling

Division by zero returns an `undefined` error, shown as:

```text
Undefined
```

Malformed input returns a `syntax` error, shown as:

```text
Error
```

Examples include:

```text
2++3
2×÷3
1.2.3
```

An empty or otherwise invalid expression is also rejected.

The evaluator returns errors as values rather than throwing.

---

## 14. Automatic Recognition and Scheduling

Recognition runs automatically after writing.

```text
Stroke committed
      ↓
600 ms debounce
      ↓
Recognition
      ↓
Expression evaluation
      ↓
Answer projection
```

The debounce allows multi-stroke symbols such as `=`, `+`, and `÷` to finish
before recognition.

Each scheduled recognition run receives a version number.

A result is applied only when its version is still current.

Therefore a slow result from an older expression cannot overwrite a newer
result.

A new pointer-down cancels pending recognition and removes the old answer.

Worker requests also carry request ids, and responses are matched by id.

Undo, redo, clear, and eraser operations trigger the normal recognition update
flow through the canvas change events.

---

## 15. Dynamic Answer Projection

When the recognized expression ends with `=`, the expression is evaluated and
the result is rendered beside the equals sign.

Example:

```text
18 + 4 × 3 = 30
```

The answer is an annotation layer rather than a user stroke.

It:

* is placed immediately to the right of `=`
* is vertically centered on `=`
* is sized from the median recognized digit height within fixed bounds
* uses a separate visual style
* disappears when the user starts a new stroke or edits the canvas

The toolbar also displays the recognized expression and result.

For division by zero, the projected answer is:

```text
Undefined
```

---

## 16. Fresh Expression-Level Evaluation

After recognition, segmentation, and preprocessing tuning, a fresh
expression-level evaluation was run.

### Protocol

* 10 expressions
* 3 official attempts per expression
* 30 official runs
* one writer
* one device

### Official set and result

| Expression  | Correct |
| ----------- | ------: |
| `9-4=`      |     2/3 |
| `6×7=`      |     3/3 |
| `8÷4=`      |     3/3 |
| `3.2+1.8=`  |     3/3 |
| `25×4=`     |     3/3 |
| `100-37=`   |     3/3 |
| `7+8÷2=`    |     3/3 |
| `6×3-4=`    |     3/3 |
| `0.5×6=`    |     3/3 |
| `36÷9+2.5=` |     3/3 |

Exact recognized-text accuracy:

**29/30 = 96.7%**

This is reported as **approximately 97%** because the sample is small.

### Failed official run

```text
Expected:   9-4=
Recognized: Y1.-4=
```

The segmentation log showed:

```text
Number of groups: 6
```

with groups:

```text
[Y]
[1]
[.]
[-]
[4]
[=]
```

The intended `9` was therefore split into three groups before classification,
and those fragments were subsequently labelled `Y`, `1`, and `.`.

Stage:

**segmentation, followed by model classification of the fragments.**

This is not described as a single-glyph model-only error.

No post-processing mismatch was observed in the logged
`[label] raw=[label]` output for this failed run.

### Runs outside the official denominator

One additional `9-4=` attempt was made after the planned three.

Result:

**passed**

Therefore the raw log contains:

```text
9-4= → 3 passed, 1 failed
```

The additional attempt is excluded from the official 30-run denominator.

One accidental:

```text
25×6=
```

run was also recorded.

It was not part of the official test set and is excluded from the official
denominator.

Both additional runs remain in:

```text
docs/eval-fresh-set.txt
```

### Caveats

* one writer
* one device
* small sample size
* earlier evaluation sets were used during recognition, preprocessing, and
  segmentation tuning

Therefore the 29/30 result is a small-sample engineering measurement, not a
general handwriting-recognition benchmark.

### Answer accuracy

Displayed-answer correctness was not recorded as a separate metric in this
evaluation.

Therefore no independent answer-accuracy percentage is claimed from this
run.

A future evaluation should record:

```text
expected expression
recognized expression
displayed answer
expected answer
```

so recognition accuracy and answer accuracy can be measured independently.

---

## 17. Known Limitations

### Stray marks

A tiny accidental pen mark can become a decimal point.

### Very small symbols

Below approximately 8 px, the components of `÷` can become difficult to
separate reliably.

### Segmentation thresholds

Segmentation thresholds are heuristic and were tuned primarily using one
writer.

### Multi-piece digits

A digit drawn in several disconnected pieces can be split into multiple symbol
groups.

The fresh `9-4=` evaluation failure demonstrated this behavior.

### Recognition confidence

The model's softmax confidence can be close to 100% even for an incorrect
classification, so confidence is not treated as a guaranteed correctness
measure.

### Additional model classes

X, Y and Z exist in the Sagyam model output but are not valid CalcInk
expression symbols.

### Expression layout

The current recognizer supports a single left-to-right expression and does not
support stacked equations.

### Evaluation size

The fresh expression evaluation used one writer, one device, and only 30
official runs.

### Stroke eraser

The stroke eraser removes complete strokes.

### Pixel eraser

The pixel eraser removes portions of strokes and may split one original stroke
into multiple independent replacement strokes.

Undo restores the original stroke rather than physically joining the
replacement pieces back together.

The pixel eraser currently uses a fixed circular eraser radius and does not
yet expose an eraser-size control.

---

## 18. Eraser Architecture

CalcInk now supports two eraser modes.

### Stroke eraser

The stroke eraser uses pure geometric hit testing.

For each pointer position:

```text
pointer position
      ↓
point-to-segment distance
      ↓
stroke hit test
      ↓
stroke id collected
```

On pointer-up, all selected stroke ids are committed as one history action.

Therefore one continuous erase drag corresponds to one undo operation.

### Pixel eraser

The pixel eraser clips stroke segments against a circular eraser region.

A sparse polyline is handled by intersecting each segment with the eraser
circle, allowing a fast stroke segment to be cut even if no recorded point lies
inside the erased area.

Boundary points are interpolated, including their timestamps.

Very small remaining pieces are discarded so they do not become accidental
decimal-point candidates.

Eraser positions are interpolated during fast drags so the eraser cannot easily
skip over a thin stroke between two pointer events.

### History model

`StrokeHistory` stores undoable actions rather than only a redo stroke list.

The current action model supports:

```text
add
edit / replace
```

Whole-stroke erasing is implemented as a replacement with no pieces.

Pixel erasing is implemented as a replacement of one or more original strokes
with their remaining pieces.

This allows one erase drag to remain a single undo/redo operation.

---

## 19. Offline / PWA Architecture

CalcInk uses `vite-plugin-pwa` with Workbox-generated service-worker
precache.

The PWA build configuration precaches:

```text
js
css
html
json
bin
webmanifest
```

and raises the Workbox maximum file size to:

```text
10 MiB per file
```

because individual model shards are several megabytes.

The production build generated:

```text
dist/sw.js
dist/workbox-*.js
dist/manifest.webmanifest
dist/registerSW.js
```

The build reported:

```text
PWA v1.3.0
mode       generateSW
precache   12 entries
```

The four model shards were confirmed in the generated service-worker
precache list.

### Local offline verification

The production preview application was opened at:

```text
http://localhost:4173/
```

The browser showed:

```text
Service Worker: activated and running
```

Cache Storage contained:

```text
model.json
group1-shard1of4.bin
group1-shard2of4.bin
group1-shard3of4.bin
group1-shard4of4.bin
```

The preview server was then stopped completely and the application was
reloaded.

The offline test succeeded:

* page loaded
* `Model ready` appeared
* `2+3=` was recognized
* result `5` was displayed

This proves local offline operation after the initial online load.

The first visit still requires network access to download and cache the
application and model assets.

A separate production/deployed airplane-mode verification remains to be
completed.

---

## 20. Testing Status

The automated suite currently covers:

* basic project setup
* coordinate conversion
* stroke history
* geometry
* post-processing
* arithmetic evaluation
* symbol segmentation
* recognition pipeline
* answer layout
* recognition scheduling
* stroke hit testing
* pixel erasing
* undo/redo replacement history

Current status:

**113 tests across 12 test files, all passing**

Latest verified production build:

```text
npm run build
```

completed successfully.

### Automated test breakdown

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
--------------------
total            113
```

### Browser validation

The following application behaviors have been manually verified:

1. automatic recognition after pen-up
2. previous answer removal after starting a new stroke
3. automatic recognition of a new expression
4. undo handling
5. redo handling
6. clear handling
7. rapid writing with debounced recognition
8. stroke eraser
9. pixel eraser
10. pixel eraser undo
11. pixel eraser redo
12. fast pixel-eraser dragging without visible skipped sections
13. recognition updating after erasing
14. local offline loading after the preview server was stopped

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
│   └── scheduler.ts
├── worker/
│   └── recognition.worker.ts
├── math/
│   └── evaluate.ts
└── main.ts
```

Additional project files include:

```text
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

docs/
└── eval-fresh-set.txt

DECISIONS.md
README.md
LICENSE
vite.config.ts
package.json
package-lock.json
```

The handwritten stroke state remains the source of truth.

The generated answer remains separate from the handwriting stroke state.

---

## 22. Documentation and Licensing Status

Completed:

* root `LICENSE`
* `README.md`
* `public/models/sagyam/NOTICE.md`
* `docs/eval-fresh-set.txt`
* `DECISIONS.md`

The CalcInk repository is published under GPL-3.0.

The Sagyam model is third-party GPL-3.0 material and is redistributed in:

```text
public/models/sagyam/V3/
```

Its source, license, architecture, class mapping, and redistribution details
are documented in:

```text
public/models/sagyam/NOTICE.md
```

---

## 23. Implementation Status and Remaining Work

### Completed

* responsive digital-ink canvas
* mouse, stylus, and touch input
* pointer events
* coalesced pointer-event handling
* smooth stroke rendering
* high-DPI scaling
* stroke-width control
* stroke-based state
* undo
* redo
* clear
* stroke segmentation
* geometric post-processing
* symbol preprocessing
* geometric decimal-point handling
* local Sagyam model integration
* TensorFlow.js inference
* Web Worker inference
* request-id matching
* deterministic arithmetic parser
* standard operator precedence
* multi-digit numbers
* decimal numbers
* negative numbers
* division-by-zero handling
* automatic recognition
* 600 ms debounce
* stale-result protection
* inline answer projection
* dynamic answer removal
* stroke eraser
* pixel eraser
* undo/redo for eraser operations
* PWA/service-worker generation
* model precaching
* local stopped-server offline verification
* README
* model notice
* root GPL-3.0 license
* fresh expression-level evaluation
* 113 automated tests

### Still required before final submission

* deployed production URL
* airplane-mode verification on the deployed URL
* recognition latency measurement
* memory-usage measurement over a longer session
* drawing performance / 60 FPS measurement
* final production-build verification
* final README update with the deployed live link
* final repository review

---

## 24. Final Validation Checklist

Before submission, run:

```bash
npm test -- --run
npm run build
```

Then verify:

```text
113 tests passing
production build succeeds
service worker generated
all four model shards included in precache
live deployment works
deployed offline mode works after initial online load
recognition latency is measured
memory usage is measured
drawing remains responsive near 60 FPS
no debug console.log statements remain
all model files are tracked
documentation is up to date
Git working tree is clean
```
