# CalcInk Model & Architecture Decisions

Last updated: 2026-10-04

---

## 1. Problem Requirement

CalcInk must recognize handwritten mathematical expressions containing:

* digits 0-9
* plus (+)
* minus (-)
* multiplication (ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â)
* division (ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·)
* decimal point (.)
* equals (=)

Required vocabulary: **16 classes**

(10 digits, 4 operators, decimal point, equals).

The recognition pipeline runs entirely on-device in the browser.

The application supports offline operation after the required application assets and model files have been downloaded and cached.

The project uses an existing open-source pre-trained model rather than training a recognition model from scratch.

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

The generated answer is stored separately as an annotation layer and is never added to the stroke history. Therefore it cannot be mistaken for handwriting during recognition.

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

100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 3 RGB float32 tensor

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
|    12 | Division (ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·) |
|    13 | Equals (=)   |
|    14 | Multiply (ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â) |
|    15 | Minus (-)    |
|    16 | X            |
|    17 | Y            |
|    18 | Z            |

The required CalcInk vocabulary is represented by indices 0-15.

The additional model classes are X, Y and Z. CalcInk does not treat them as valid mathematical expression symbols. If one reaches the evaluator, the expression is rejected as a syntax error and the user sees an error rather than a silently accepted result.

The class order was taken from the original application source and checked empirically during CalcInk testing.

---

### Model files

The model is stored locally in:

```text
public/models/sagyam/V3/

ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ model.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard1of4.bin
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard2of4.bin
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard3of4.bin
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard4of4.bin
```

The model is loaded inside a dedicated Web Worker.

The saved model configuration references `L1` and `L2` regularizers that TensorFlow.js 3.12.0 does not resolve by default. Compatibility registrations for both are performed in the worker before model loading.

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
14,481,495 bytes ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â  13.81 MiB
```

The 13.71 MiB value is therefore a parameter-storage calculation, while 13.81 MiB is the measured size of the model files bundled with CalcInk.

---

### Original model preprocessing

The reference application reads the canvas as RGB, resizes it to 100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100 using bilinear interpolation, divides pixel values by 255, and adds a batch dimension.

CalcInk deliberately uses a symbol-level preprocessing pipeline instead; see Section 12.

---

### Symbol-level screening on the live demo

Each required symbol was handwritten five times in the Sagyam live demo.

Overall result:

**72/80 correct (90%)**

The main weakness in that screening was handwritten `6`:

**2/5**

The full per-symbol table is recorded in Section 6.

---

### Status

**Selected primary recognition model**

Sagyam was selected after the symbol-level screening and successful local integration into CalcInk.

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

It was not selected for the current implementation because the CalcInk design explicitly exposes the stroke-to-tensor stage and uses per-symbol classification.

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

The reported footprint appeared unsuitable for the lightweight offline, client-side architecture targeted by CalcInk.

---

### Candidate 4: altynbk handwritten-math-recognition

Reported during the initial model search:

* MIT license
* Keras models
* 15 classes
* no decimal-point class

**Status: fallback candidate, not used.**

Using it would have required browser-oriented model conversion and separate decimal-point handling.

---

### Candidate 5: LaTeXVision

Reported during the initial model search as a server-oriented solution.

**Status: not selected.**

A server-dependent recognition path conflicts with the 100% on-device requirement.

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
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Stroke capture
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Stroke history
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Recognition scheduling
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Symbol segmentation
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Per-symbol preprocessing
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100 RGB input
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Recognition Web Worker
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
TensorFlow.js Sagyam model
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Per-symbol classification
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Geometric post-processing
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Recognized expression text
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Deterministic arithmetic parser
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Result
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Canvas answer projection
```

A per-symbol classifier is used because it makes the stroke-to-tensor pipeline explicit and allows the exact CalcInk vocabulary to be controlled independently from the arithmetic parser.

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

Heavy model inference therefore runs outside the main drawing interaction path.

Recognition requests carry an id, and worker responses are matched by id.

---

## 6. Handwriting Evaluation Protocol (symbol level, live demo)

Each required symbol was handwritten at least five times in the Sagyam live demo before local integration.

Symbols:

```text
0 1 2 3 4 5 6 7 8 9

+ - ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â· . =
```

Multi-stroke symbols were drawn with natural gaps between strokes:

* `+`
* `=`
* `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·`
* `ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â`

The test also specifically checked:

* ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â versus X
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
| ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â      | Multiply  | Multiply  | Multiply  | Multiply  | Multiply  | 5/5     |
| ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·      | Division  | Division  | Division  | Division  | Division  | 5/5     |
| .      | Decimal   | Decimal   | Decimal   | Decimal   | Decimal   | 5/5     |
| =      | Equals    | Equals    | Minus     | Equals    | Equals    | 4/5     |

Overall:

**72/80 correct (90%)**

This was a small personal handwriting test on the demo's own pipeline. It measures the model plus the demo's preprocessing and is not a general accuracy estimate.

---

## 7. Initial Decision Rule

The initial Sagyam screening heuristic was:

* at least 14 of the 16 symbols should achieve 4/5 or better
* both `.` and `=` should work
* persistent `.` or `=` failures would trigger evaluation of the fallback
* persistent ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â versus X confusion could justify post-processing

Result:

* 15 of 16 symbols reached at least 4/5
* `.` was 5/5
* `=` was 4/5
* overall result was 72/80

Therefore Sagyam passed the initial screening.

This rule was an engineering heuristic for the initial model-selection stage, not a statistical standard.

---

## 8. Current Model Decision

**Sagyam is the selected primary recognition model.**

Reasons:

* browser-side TensorFlow.js inference
* local model assets
* Web Worker inference
* 100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 3 input
* 19-class output containing the 16 required CalcInk symbols
* straightforward per-symbol classification
* successful local integration
* 72/80 symbol-level screening result
* 29/30 exact-text accuracy on the fresh expression-level evaluation
* successful deployed offline verification

The fresh expression-level result is a small-sample engineering measurement and is not presented as a general handwriting-recognition benchmark.

Known weaknesses are documented in Section 17.

---

## 9. Stroke Segmentation

Every pen contact is stored as a separate stroke.

Before recognition, strokes are grouped into candidate symbols using geometric features.

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

### Equals (`=`)

Two roughly horizontal strokes can form `=` when:

* both are approximately horizontal
* their horizontal ranges overlap substantially
* one stroke is above the other
* their vertical separation is sufficiently small

Two horizontal strokes that are far apart horizontally are not automatically merged into `=`.

### Plus (`+`)

A roughly horizontal and a roughly vertical stroke are grouped as `+` only when they actually cross.

A small crossing tolerance prevents nearby independent strokes from being merged.

### Multiply (`ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â`)

Two roughly diagonal strokes can form `ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â` when they cross near their centers.

### Division (`ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·`)

A division symbol can contain:

* upper dot
* horizontal bar
* lower dot

The components must satisfy the expected geometric arrangement around the bar.

### Dot-like strokes

Very small strokes are handled separately from generic merging so they are not unnecessarily attached to neighboring symbols.

### Generic merging

Generic merging requires actual horizontal overlap before the configured overlap-ratio and vertical-gap conditions are applied.

This helps prevent adjacent symbols from being merged incorrectly.

Merging repeats until no pair qualifies, because a successful merge can create a larger group that enables another valid merge.

### Ordering

Groups are sorted left to right by center x.

```text
strokes

   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

[group for 1] [group for +] [group for 2] [group for =]

   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

1 + 2 =
```

---

## 10. Recognition Post-processing

Post-processing handles geometric cases where the raw model label is not sufficient.

Current rules include:

```text
two horizontal strokes  ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ =
one horizontal stroke   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ -

valid division layout    ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·
```

Post-processing uses stroke geometry and never calls the arithmetic evaluator to guess a symbol.

During evaluation, the debug output showed the raw model label next to the final label (`[label] raw=[label]`), so any label change caused by post-processing is visible in the debug data.

---

## 11. Decimal Point Handling

The expression pipeline detects decimal points geometrically.

After segmentation, the tallest symbol group is used as the reference height.

A sufficiently small group is labelled `.` without asking the model:

```text
DOT_RATIO = 0.2
```

This provides a more stable representation for tiny handwritten dots after symbol cropping and resizing.

The model's own decimal class remains part of the Sagyam vocabulary, but the current CalcInk pipeline does not rely exclusively on the model to resolve tiny isolated dots.

---

## 12. Recognition Preprocessing

The visible canvas uses a CSS background while its drawing buffer is transparent.

Therefore, recognition does not directly interpret the transparent drawing buffer as the model background.

Instead, each symbol group is rendered onto an offscreen canvas with an explicit solid background.

### Pipeline

```text
Symbol group strokes

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Bounding box

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Square crop

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Expanded margin

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Render with uniform scale

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

White background + black ink

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Constant output ink thickness

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100 RGB ImageData

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Transfer to worker

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Float32 tensor

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

pixel / 255

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

[1, 100, 100, 3]

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ

Sagyam model
```

The current preprocessing configuration uses a nominal output ink thickness of 7 px.

### Why this differs from the original application

The original application resizes its complete 400 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 400 canvas to 100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100.

CalcInk uses a full-window canvas containing comparatively small symbols, so resizing the whole canvas would shrink symbols and can make their strokes too thin.

Cropping each segmented symbol and applying a single uniform scale avoids that problem.

The worker constructs the tensor directly from RGB bytes instead of relying on `tf.browser.fromPixels`, avoiding backend-specific behavior in the worker.

### Experiment: wider symbol margin

The earlier crop already had a surrounding margin.

A larger effective margin was added and tested as a single fixed configuration rather than as a sweep of values.

Approximate symbol occupancy of the final 100 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 100 image changed from:

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
| `100ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·0=`     |    1/5 |   5/5 |
| `2+3ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â4-6ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·2=` |    2/5 |   4/5 |

These were small samples from different drawing sessions, and the tested expressions were part of the tuning process.

Therefore the measurements are engineering evidence for the chosen configuration, not an independent recognition benchmark.

The larger margin was retained because it improved both tests.

The experiment does not establish why the larger margin helped. A possible hypothesis is that the additional empty space makes the input distribution more similar to examples seen by the model during training, but that has not been independently verified.

---

## 13. Mathematical Evaluation Engine

CalcInk uses a deterministic recursive-descent arithmetic parser.

`eval()` is not used.

Grammar:

```text
expr   := term (('+' | '-') term)*

term   := unary (('ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â' | 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·') unary)*

unary  := '-' unary | number

number := digits with at most one '.', at least one digit
```

Precedence follows directly from the grammar:

* ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â and ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â· bind tighter than + and -
* operators are left-associative
* unary minus binds to a following number or unary expression

Supported:

* multi-digit integers
* decimal numbers
* negative numbers
* `+`
* `-`
* `ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â`
* `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·`
* terminal `=`

The evaluator supports expressions such as:

```text
5--3

5ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â-3
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
2ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·3
1.2.3
```

An empty or otherwise invalid expression is also rejected.

The evaluator returns errors as values rather than throwing.

---

## 14. Automatic Recognition and Scheduling

Recognition runs automatically after writing.

```text
Stroke committed
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
600 ms debounce
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Recognition
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Expression evaluation
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
Answer projection
```

The debounce allows multi-stroke symbols such as `=`, `+`, and `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·` to finish before recognition.

Each scheduled recognition run receives a version number.

A result is applied only when its version is still current.

Therefore a slow result from an older expression cannot overwrite a newer result.

A new pointer-down cancels pending recognition and removes the old answer.

Worker requests also carry request ids, and responses are matched by id.

Undo, redo, clear, and eraser operations trigger the normal recognition update flow through the canvas change events.

---

## 15. Dynamic Answer Projection

When the recognized expression ends with `=`, the expression is evaluated and the result is rendered beside the equals sign.

Example:

```text
18 + 4 ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 3 = 30
```

The answer is an annotation layer rather than a user stroke.

### Recognition Overlay

CalcInk includes an optional recognition overlay that is **off by default**.

When enabled, each recognized symbol is shown with a thin dashed bounding box and a label containing the recognized symbol and the model-reported confidence percentage, for example 7 92%.

Confidence levels are displayed as:

- >= 90% -> high -> green
- 60-89% -> medium -> amber
- < 60% -> low -> red

The overlay is a visual usability and debugging aid. The displayed confidence is the model-reported softmax confidence and is **not a guarantee that the recognition is correct**. The model can be highly confident in an incorrect classification.

The overlay does not modify the recognition pipeline, segmentation, preprocessing, or arithmetic evaluation. It is rendered separately from the handwriting stroke state.

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

After recognition, segmentation, and preprocessing tuning, a fresh expression-level evaluation was run.

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
| `6ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â7=`      |     3/3 |
| `8ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·4=`      |     3/3 |
| `3.2+1.8=`  |     3/3 |
| `25ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â4=`     |     3/3 |
| `100-37=`   |     3/3 |
| `7+8ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·2=`    |     3/3 |
| `6ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â3-4=`    |     3/3 |
| `0.5ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â6=`    |     3/3 |
| `36ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·9+2.5=` |     3/3 |

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

The intended `9` was therefore split into three groups before classification, and those fragments were subsequently labelled `Y`, `1`, and `.`.

Stage:

**segmentation, followed by model classification of the fragments.**

This is not described as a single-glyph model-only error.

No post-processing mismatch was observed in the logged `[label] raw=[label]` output for this failed run.

### Runs outside the official denominator

One additional `9-4=` attempt was made after the planned three.

Result:

**passed**

Therefore the raw log contains:

```text
9-4= ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ 3 passed, 1 failed
```

The additional attempt is excluded from the official 30-run denominator.

One accidental:

```text
25ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â6=
```

run was also recorded.

It was not part of the official test set and is excluded from the official denominator.

Both additional runs remain in:

```text
docs/eval-fresh-set.txt
```

### Caveats

* one writer
* one device
* small sample size
* earlier evaluation sets were used during recognition, preprocessing, and segmentation tuning

Therefore the 29/30 result is a small-sample engineering measurement, not a general handwriting-recognition benchmark.

### Answer accuracy

Displayed-answer correctness was not recorded as a separate metric in this evaluation.

Therefore no independent answer-accuracy percentage is claimed from this run.

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

Below approximately 8 px, the components of `ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â·` can become difficult to separate reliably.

### Segmentation thresholds

Segmentation thresholds are heuristic and were tuned primarily using one writer.

### Multi-piece digits

A digit drawn in several disconnected pieces can be split into multiple symbol groups.

The fresh `9-4=` evaluation failure demonstrated this behavior.

### Recognition confidence

The model's softmax confidence can be close to 100% even for an incorrect classification, so confidence is not treated as a guaranteed correctness measure.

### Additional model classes

X, Y and Z exist in the Sagyam model output but are not valid CalcInk expression symbols.

### Expression layout

The current recognizer supports a single left-to-right expression and does not support stacked equations.

### Evaluation size

The fresh expression evaluation used one writer, one device, and only 30 official runs.

### Stroke eraser

The stroke eraser removes complete strokes.

### Pixel eraser

The pixel eraser removes portions of strokes and may split one original stroke into multiple independent replacement strokes.

Undo restores the original stroke rather than physically joining the replacement pieces back together.

The pixel eraser currently uses a fixed circular eraser radius and does not yet expose an eraser-size control.

---

## 18. Eraser Architecture

CalcInk now supports two eraser modes.

### Stroke eraser

The stroke eraser uses pure geometric hit testing.

For each pointer position:

```text
pointer position
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
point-to-segment distance
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
stroke hit test
      ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ
stroke id collected
```

On pointer-up, all selected stroke ids are committed as one history action.

Therefore one continuous erase drag corresponds to one undo operation.

### Pixel eraser

The pixel eraser clips stroke segments against a circular eraser region.

A sparse polyline is handled by intersecting each segment with the eraser circle, allowing a fast stroke segment to be cut even if no recorded point lies inside the erased area.

Boundary points are interpolated, including their timestamps.

Very small remaining pieces are discarded so they do not become accidental decimal-point candidates.

Eraser positions are interpolated during fast drags so the eraser cannot easily skip over a thin stroke between two pointer events.

### History model

`StrokeHistory` stores undoable actions rather than only a redo stroke list.

The current action model supports:

```text
add

edit / replace
```

Whole-stroke erasing is implemented as a replacement with no pieces.

Pixel erasing is implemented as a replacement of one or more original strokes with their remaining pieces.

This allows one erase drag to remain a single undo/redo operation.

---

## 19. Offline / PWA Architecture

CalcInk uses `vite-plugin-pwa` with Workbox-generated service-worker precache.

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

The build reports:

```text
PWA v1.3.0
mode       generateSW
precache   12 entries
```

The total generated precache payload was:

```text
15,667.58 KiB ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â  15.3 MiB
```

This is the first-visit precached application payload, including the application assets and bundled model files; it is not the model-only size.

The four model shards were confirmed in the generated service-worker precache list.

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

The preview server was then stopped completely and the application was reloaded.

The offline test succeeded:

* page loaded
* `Model ready` appeared
* `2+3=` was recognized
* result `5` was displayed

This verifies local offline operation after the initial online load.

The first visit still requires network access to download and cache the application and model assets.

### Deployed offline verification

Production deployment:

https://calcink-on-device-handwritten-math-nu.vercel.app/

The deployed application was opened in Chrome and allowed to finish loading.

Offline mode was then enabled using:

Chrome DevTools -> Network -> Offline

With the network disabled, the same deployed URL was reloaded.

The following was verified:

* the application loaded successfully
* Model ready appeared
* handwritten recognition continued to work
* the recognition overlay button remained available
* the recognition overlay continued to work without network access

Result:

**PASS — the final deployed CalcInk application, including the optional recognition overlay, operates without network connectivity after the required application assets and model files have been cached.**

This final verification was performed on the deployment containing the recognition overlay.
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

**125 tests across 13 test files, all passing**

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
overlayLayout     12

--------------------

total            125
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
15. deployed application loading offline using Chrome DevTools Network ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Offline
16. deployed handwritten recognition while offline
17. deployed answer projection while offline
18. recognition overlay disabled by default
19. recognition overlay boxes, labels, and confidence colours
20. decimal-point recognition overlay
21. recognition overlays disappear after a new stroke, undo, and clear

### Performance validation

#### Recognition latency

A browser-console instrumentation pass measured model-inference and end-to-end recognition timings.

Measured model inference:

```text
samples  = 106

min      = 9.2 ms

max      = 437.0 ms

mean     = 27.74 ms

median   = 24.15 ms
```

Measured end-to-end recognition:

```text
runs     = 41

max      = 443.8 ms

mean     = 84.21 ms

median   = 62.9 ms
```

The earlier `0 ms` minimum is not reported because the end-to-end sample set included empty-canvas recognition calls. Those calls do not represent a user-facing recognition operation.

The end-to-end summary therefore focuses on the measured maximum, mean, and median rather than reporting the non-user-facing `0 ms` minimum.

A separate later session also observed a cold-start inference of approximately 732 ms. That value is treated as an initialization observation rather than the steady-state summary.

The instrumentation was temporary and was removed before the final production build.

#### Drawing performance

Chrome Frame Rendering Stats were used during a manual drawing test.

Observed:

```text
typical / sustained ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€¹Ã¢â‚¬Â  58 FPS

maximum              = 60.2 FPS

minimum observed     = 30 FPS
```

The result supports the description **typically near 60 FPS with transient dips**, rather than a guarantee of 60 FPS under all workloads and devices.

The measurement was repeated with console logging suppressed so that diagnostic logging did not become the primary source of main-thread overhead.

No measurement was performed to establish whether the transient FPS dips were directly correlated with recognition requests.

#### Memory stability

A Chrome Performance recording covered approximately:

```text
5.3 minutes
```

The observed metrics were:

```text
JS heap        = 3.6ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ4.7 MB

Documents      = 1ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ1

Listeners      = 21ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ21
```

The JS heap repeatedly increased and decreased during the session instead of showing a continuous upward trend.

The stable document and listener counts also provide evidence against obvious persistent accumulation during the tested session.

This is an observational stability test, not a formal proof of absence of memory leaks.

The measured page/main-thread heap does not include the complete TensorFlow.js model memory held by the recognition worker, so these figures should not be interpreted as total application memory usage.

No dedicated `tf.memory().numTensors` worker-side leak test was performed.

#### Browser responsiveness

Two local browser measurements reported:

```text
LCP = 0.12 s

INP = 32ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ48 ms
```

A separate Performance recording also reported:

```text
CLS = 0.01
```

These browser metrics were collected locally on one device and are not presented as population-level field metrics.

---

## 21. Project Architecture

```text
src/

ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ canvas/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ drawingCanvas.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ history.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ coordinates.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ hitTest.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ pixelErase.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ types.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ recognition/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ geometry.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ segment.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ preprocess.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ postprocess.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ pipeline.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ recognitionClient.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ vocabulary.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ answerLayout.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ scheduler.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ worker/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ recognition.worker.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ math/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡   ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ evaluate.ts
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ main.ts
```

Additional project files include:

```text
public/

ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ models/

    ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ sagyam/

        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ NOTICE.md
        ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ V3/

            ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ model.json
            ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard1of4.bin
            ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard2of4.bin
            ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard3of4.bin
            ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ group1-shard4of4.bin

docs/

ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ eval-fresh-set.txt

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

Its source, license, architecture, class mapping, and redistribution details are documented in:

```text
public/models/sagyam/NOTICE.md
```

The README contains the live deployed demo URL and the current project status.

---

## 23. Implementation Status

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
* optional recognition overlay with confidence colours
* stroke eraser
* pixel eraser
* undo/redo for eraser operations
* PWA/service-worker generation
* model precaching
* local stopped-server offline verification
* deployed Vercel version
* deployed offline verification
* README
* model notice
* root GPL-3.0 license
* fresh expression-level evaluation
* recognition latency measurement
* drawing performance measurement
* memory stability measurement
* 125 automated tests
* successful production build

### Final pre-submission work

The main implementation and performance validation work is complete.

Remaining administrative checks are:

* review the final Git working tree
* confirm no temporary debug instrumentation remains
* confirm all model files are tracked
* confirm documentation reflects the final committed state
* make the final documentation commit and push
* perform one final submission-readiness audit against the Phase 1 rubric

---

## 24. Final Validation Checklist

Run:

```text
npm test -- --run

npm run build
```

Then verify:

```text
[x] 125 tests passing

[x] production build succeeds

[x] service worker generated

[x] all four model shards included in precache

[x] live deployment works

[x] deployed offline mode works after initial online load

[x] recognition latency measured

[x] drawing performance measured

[x] memory usage measured

[x] drawing is typically near 60 FPS

[x] temporary debug instrumentation removed

[x] all model files are tracked

[x] README contains the live demo URL

[x] documentation reflects the current measured state

[ ] final Git working tree check
```

The README has been checked and contains the final live demo URL.

The final Git working-tree check is performed after the final documentation commit and push.

### Live Demo

```text
https://calcink-on-device-handwritten-math-nu.vercel.app/
```

The deployed application has been verified using Chrome DevTools **Network -> Offline** to continue functioning after network access was disabled, provided that the application and model assets had already been cached.
