# CalcInk Model & Architecture Decisions

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

The canvas is not treated as the source of truth.

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
4. preprocessing
5. handwriting recognition

---

## 3. Model Candidates

### Candidate 1: Sagyam Handwritten Character Recognition Calculator

Repository:

https://github.com/Sagyam/Handwritten-Optical-Character-Recognition

Runtime:

TensorFlow.js

License:

GPL-3.0 (verified from the repository LICENSE)

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

3,594,323

Model output:

19 classes

Class order was taken from the application source and then checked empirically using handwritten test samples.

### Class-index mapping

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

The additional model classes are X, Y and Z.

---

### Preprocessing

The inspected application reads the canvas as RGB, resizes it to 100 × 100 using bilinear interpolation, divides pixel values by 255, and adds a batch dimension before inference.

Target tensor:

```text
[1, 100, 100, 3]
```

No explicit crop/pad operation was identified in the inspected prediction path.

Important implementation note:

The CalcInk canvas color is currently provided by CSS, while the canvas drawing buffer itself is transparent. Therefore, when generating the recognition tensor, strokes should first be rendered onto an offscreen canvas with an explicit solid background rather than reading transparent pixels directly.

The correct ink/background polarity should be confirmed during local integration testing.

---

### Model size

The model uses four TensorFlow.js binary weight shards.

The model manifest contains 3,594,323 float32 parameters, corresponding to approximately 13.71 MiB of raw weight data.

The exact on-disk total size of the `.bin` files should be recorded separately if measured directly.

---

### Preliminary handwriting evaluation

Each required symbol was handwritten 5 times using the Sagyam live demo.

### Results

| Symbol | Correct | Incorrect prediction(s) |
|--------|---------|-------------------------|
| 0 | 5/5 | - |
| 1 | 4/5 | 3 |
| 2 | 4/5 | X |
| 3 | 5/5 | - |
| 4 | 5/5 | - |
| 5 | 4/5 | 3 |
| 6 | 2/5 | 3, 8, 8 |
| 7 | 5/5 | - |
| 8 | 5/5 | - |
| 9 | 5/5 | - |
| + | 4/5 | Multiply |
| - | 5/5 | - |
| × | 5/5 | - |
| ÷ | 5/5 | - |
| . | 5/5 | - |
| = | 4/5 | Minus |

Overall result:

**72/80 correct (90%)**

This is a small personal handwriting test and should not be interpreted as a general model accuracy estimate.

### Important observations

- Decimal point (`.`): 5/5
- Equals sign (`=`): 4/5
- Multiplication (`×`): 5/5
- Division (`÷`): 5/5
- Handwritten `6`: 2/5
- One `2` was predicted as `X`
- One `+` was predicted as `Multiply`
- One `=` was predicted as `Minus`

The main observed weakness was recognition of handwritten `6`.

---

### Status

**Provisional primary candidate**

Sagyam passes the project's preliminary screening test:

- 15 of 16 required symbols achieved at least 4/5
- `.` achieved 5/5
- `=` achieved 4/5
- overall personal test accuracy was 72/80

Final selection remains pending successful local integration into CalcInk, including reproduction of the preprocessing pipeline and verification of inference inside the application.

---

### Candidate 2: ink-on / CoMER

Repository:

https://github.com/kimseungdae/ink-on

Runtime:

ONNX Runtime Web

Model:

CoMER

Reported model footprint:

- encoder_int8.onnx: 3.4 MB
- decoder_int8.onnx: 4.0 MB
- total: 7.2 MB

**Status: Alternative / under evaluation**

The reported model-size figures should be re-verified from the repository before being treated as final documented measurements.

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

**Status: Rejected for primary implementation, pending direct size verification**

Reason:

The reported model footprint appears too large for the lightweight offline browser architecture targeted by CalcInk. The exact figure should be verified before final publication.

---

### Candidate 4: altynbk

**Status: Fallback candidate**

Current verification status:

Repository URL, exact license, class vocabulary, model format, and model size remain to be verified directly.

Potential fallback approach:

Use the classifier for the supported symbols and handle decimal-point detection separately if required.

---

### Candidate 5: LaTeXVision

**Status: Candidate under review**

The repository details, runtime requirements, license, and exact symbol coverage should be verified directly before a final rejection is documented.

---

## 4. Selection Criteria

Candidates will be compared using:

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

---

## 5. Preferred Recognition Architecture

Current design direction:

```text
Canvas strokes
      ↓
Stroke preprocessing
      ↓
Symbol segmentation
      ↓
Image / tensor generation
      ↓
Per-symbol classifier
      ↓
Recognized symbols
      ↓
Expression tokenizer
      ↓
Deterministic math parser
      ↓
Result
      ↓
Canvas projection
```

A per-symbol classifier is preferred for the current design because it makes the stroke-to-tensor pipeline explicit and allows the exact CalcInk vocabulary to be controlled independently from the arithmetic parser.

Whole-expression recognition models remain documented alternatives.

---

## 6. Handwriting Evaluation Protocol

Each required symbol was handwritten at least 5 times.

Symbols:

```text
0 1 2 3 4 5 6 7 8 9
+ - × ÷ . =
```

Multi-stroke symbols were tested with natural gaps between strokes:

- +
- =
- ÷
- ×

The test also specifically checked:

- × versus X
- handwritten division styles versus the model's supported division form
- decimal point versus accidental dot
- equals sign as two separate strokes

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

No final model decision was made from a single sample.

---

## 7. Decision Rule

The working evaluation rule is:

- If at least 14 of the 16 symbols achieve 4/5 or better, and both `.` and `=` work, Sagyam can be selected as the primary candidate.
- If `.` or `=` consistently fails, evaluate the altynbk fallback.
- If the main issue is × versus X confusion while the other required symbols work, evaluate a post-processing strategy for the X class.

This rule is a project evaluation heuristic and is being applied together with local integration and performance testing.

---

## 8. Current Decision

**Sagyam is the provisional primary recognition candidate.**

Reason:

- Browser-side TensorFlow.js model
- 100 × 100 × 3 input
- 19-class output containing the required 16 CalcInk symbols
- Existing symbol-classification architecture
- 72/80 correct (90%) in the preliminary personal handwriting test
- Decimal point: 5/5
- Equals sign: 4/5
- Multiplication: 5/5
- Division: 5/5

Known weakness:

- Handwritten `6` achieved only 2/5 in the preliminary test.

Final adoption is pending successful local integration, preprocessing verification, and performance testing inside CalcInk.

---

## 9. Next Steps

1. Obtain and bundle the Sagyam TensorFlow.js model files locally.
2. Reproduce the verified 100 × 100 × 3 preprocessing pipeline.
3. Render strokes to an offscreen canvas with an explicit background before creating the model tensor.
4. Integrate TensorFlow.js inference into CalcInk.
5. Move inference into a Web Worker so recognition does not block canvas rendering.
6. Test predictions directly inside CalcInk.
7. Measure inference latency and verify offline operation.
8. Update this document with the final integration results.
9. Record the final model decision and rationale.
## 10. Initial Stroke Segmentation Rule

The canvas stores every pen contact as a separate stroke. Before recognition, these strokes must be grouped into individual mathematical symbols.

The initial segmentation strategy is geometry-first:

### Step 1: Compute stroke geometry

For every stroke, calculate:

- bounding box: `minX`, `minY`, `maxX`, `maxY`
- width and height
- center point
- horizontal and vertical gaps to nearby strokes

### Step 2: Detect explicit multi-stroke symbols first

Some symbols are naturally composed of multiple strokes.

A pair of strokes may be grouped into the same symbol only when their geometry strongly supports that interpretation.

#### Equals (`=`)

Two strokes are grouped as `=` when:

- both strokes are approximately horizontal
- their x-ranges overlap substantially
- one stroke is clearly above the other
- the vertical separation is small relative to their size

Two horizontal strokes that are far apart horizontally are therefore not automatically treated as `=`.

#### Plus (`+`)

Two strokes are grouped as `+` when:

- one stroke is approximately horizontal
- one stroke is approximately vertical
- their centers are close or their paths intersect

#### Multiply (`×`)

Two strokes are grouped as `×` when:

- both are approximately diagonal
- they cross or meet near their centers

#### Division (`÷`)

Division is treated as a multi-part symbol only when the strokes form the expected geometric arrangement around a common horizontal center.

### Step 3: Group remaining strokes

For strokes that do not match a known multi-stroke operator:

- strokes that overlap or nearly touch may belong to the same symbol
- strokes separated by a clear horizontal gap are treated as different symbols
- proximity alone is not sufficient to merge two strokes
- the grouping threshold is relative to the local stroke size rather than a fixed pixel value

This prevents two nearby symbols such as `- -` from being incorrectly merged.

### Step 4: Preserve left-to-right order

After grouping, calculate the bounding box of each symbol group and sort groups by their leftmost x-coordinate.

Example:

```text
strokes
  ↓
[group for 1] [group for +] [group for 2] [group for =]
  ↓
1 + 2 =

---