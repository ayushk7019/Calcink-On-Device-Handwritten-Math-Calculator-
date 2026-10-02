\# CalcInk: On-Device Handwritten Math Calculator



CalcInk is a browser-based handwritten math calculator that lets users write

mathematical expressions using mouse, stylus, or touch and receive the

calculated result directly beside the equals sign.



The application is designed around a fully client-side architecture:



\- handwritten stroke capture in the browser

\- local symbol recognition

\- deterministic mathematical evaluation

\- inline answer projection

\- Web Worker based neural-network inference

\- no cloud inference APIs



\---



\## Features



\### Digital Ink Canvas



\- Mouse, stylus, and touch input

\- Smooth stroke rendering

\- High-DPI / Retina scaling

\- Adjustable stroke width

\- Undo

\- Redo

\- Clear canvas

\- Stroke-based source representation



\### Handwriting Recognition



CalcInk uses the open-source \*\*Sagyam Handwritten Character Recognition\*\*

model.



Required mathematical vocabulary:



```text

0 1 2 3 4 5 6 7 8 9

\+ - × ÷ . =                                                                                      The model is executed locally in the browser using TensorFlow.js.



Inference runs inside a Web Worker so that neural-network computation does not

block the main drawing interaction.



Automatic Recognition



Recognition is triggered automatically after the user finishes a stroke.



A 600 ms debounce is used so that rapid writing does not trigger recognition

after every individual stroke.



Stale recognition results are discarded when a newer edit has occurred.



Mathematical Evaluation



CalcInk uses a deterministic recursive-descent parser.



Supported features:



addition

subtraction

multiplication

division

operator precedence

multi-digit numbers

decimal numbers

negative numbers

division-by-zero handling



The application does not use eval().



Inline Answer Projection



When an expression ends with =, the calculated result is rendered directly

beside the equals sign.



Example:



18 + 4 × 3 = 30



The generated answer is stored separately from the user's handwritten strokes.



Architecture



The high-level processing pipeline is:



Pointer Input

&#x20;    ↓

Stroke Capture

&#x20;    ↓

Stroke State / History

&#x20;    ↓

Recognition Scheduler

&#x20;    ↓

Symbol Segmentation

&#x20;    ↓

Per-Symbol Preprocessing

&#x20;    ↓

100 × 100 RGB Input

&#x20;    ↓

Recognition Web Worker

&#x20;    ↓

TensorFlow.js Sagyam Model

&#x20;    ↓

Classification

&#x20;    ↓

Post-processing

&#x20;    ↓

Recognized Expression

&#x20;    ↓

Deterministic Math Parser

&#x20;    ↓

Result

&#x20;    ↓

Canvas Answer Projection

Main Thread



The main thread handles:



pointer events

stroke storage

canvas rendering

undo / redo

clear

stroke width

symbol segmentation

recognition scheduling

result presentation

Web Worker



The recognition worker handles:



TensorFlow.js model loading

image-to-tensor conversion

neural-network inference

prediction

returning recognition results



This keeps heavy model inference away from the drawing interaction path.



Stroke Representation



The canvas uses strokes as the source of truth instead of treating the rendered

pixels as the primary data representation.



Point

type Point = {

&#x20; x: number;

&#x20; y: number;

&#x20; time: number;

};

Stroke

type Stroke = {

&#x20; id: number;

&#x20; width: number;

&#x20; points: Point\[];

};



This representation is shared by:



rendering

undo / redo

erasing

preprocessing

recognition

Recognition Pipeline

1\. Stroke Segmentation



The stroke segmentation layer groups related strokes into candidate symbols.



Special geometric handling exists for:



\+

=

÷

dot-like strokes



Generic merging requires actual horizontal overlap before the configured

overlap ratio and vertical-gap checks are applied.



This helps prevent nearby independent symbols from being merged incorrectly.



2\. Symbol Preprocessing



Each symbol group is:



bounded

converted into a square crop

given surrounding margin

rendered onto an explicit background

resized to 100 × 100

converted into RGB ImageData



The resulting input is:



\[1, 100, 100, 3]



Pixel values are normalized to the range:



0 ... 1



The visible canvas background is provided through CSS, so recognition uses an

explicit preprocessing canvas rather than relying on the visible canvas

background.



3\. Model Inference



The preprocessed symbol is sent to the recognition Web Worker.



The worker runs the local TensorFlow.js Sagyam model and returns:



predicted class

class index

confidence

inference time

4\. Post-processing



Geometric post-processing handles cases such as:



two horizontal strokes  → =

one horizontal stroke   → -

valid division geometry → ÷

5\. Expression Evaluation



The recognized symbols are converted into a mathematical expression.



The deterministic parser then evaluates the expression using standard operator

precedence.



Recognition Model

Sagyam Handwritten Character Recognition



Source repository:



https://github.com/Sagyam/Handwritten-Optical-Character-Recognition



Runtime:



TensorFlow.js



License:



GPL-3.0



Model format:



TensorFlow.js Layers Model



Input:



100 × 100 × 3 RGB



Model architecture:



MobileNetV2 backbone without the classification head

Global max pooling

BatchNormalization

Dense(1024, ReLU)

Dropout(0.3)

Dense(19, Softmax)



Parameter count:



3,594,323



The model provides 19 output classes.



Index	Label

0	0

1	1

2	2

3	3

4	4

5	5

6	6

7	7

8	8

9	9

10	Add (+)

11	Decimal (.)

12	Division (÷)

13	Equals (=)

14	Multiply (×)

15	Minus (-)

16	X

17	Y

18	Z



CalcInk uses the required mathematical vocabulary represented within the

model's output classes.



Local model files



The model is bundled locally at:



public/models/sagyam/V3/



Files:



model.json

group1-shard1of4.bin

group1-shard2of4.bin

group1-shard3of4.bin

group1-shard4of4.bin



See:



public/models/sagyam/NOTICE.md



for third-party model and redistribution information.



Preprocessing Experiment



The recognition crop was tuned to provide a larger effective margin around

individual symbols before resizing them to the model's 100 × 100 input.



The earlier configuration already provided surrounding space; the experiment

increased that margin further.



Observed symbol occupancy changed approximately from:



\~83%



to:



\~64%



Measured tuning results:



Expression	Before	After

100÷0=	1/5	5/5

2+3×4-6÷2=	2/5	4/5



These measurements came from small samples and different drawing sessions.

The expressions were also part of the recognition-tuning process.



Therefore, these results are documented as engineering evidence rather than as

an independent benchmark.



The exact reason the larger margin helped has not been independently verified.



Mathematical Parser



CalcInk uses a recursive-descent parser with the following grammar:



expr   := term (('+' | '-') term)\*

term   := unary (('×' | '÷') unary)\*

unary  := '-' unary | number

number := digits \[ '.' digits\* ]



The parser supports:



integer numbers

decimal numbers

negative numbers

\+

\-

×

÷



Division by zero produces:



Undefined



Invalid syntax produces a controlled error state.



The application never evaluates handwritten input using JavaScript eval().



Automatic Recognition



Recognition uses a debounce interval of:



600 ms



The flow is:



User writes

&#x20;   ↓

Stroke commit

&#x20;   ↓

600 ms debounce

&#x20;   ↓

Recognition

&#x20;   ↓

Expression evaluation

&#x20;   ↓

Answer projection



Recognition requests use versioning so that stale results cannot overwrite

results from newer edits.



Starting a new stroke removes the existing generated answer.



Undo, redo, and clear also invalidate old recognition output.



Project Structure

src/

├── canvas/

│   ├── drawingCanvas.ts

│   ├── history.ts

│   ├── coordinates.ts

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

│   └── scheduler.ts

├── worker/

│   └── recognition.worker.ts

├── math/

│   └── evaluate.ts

└── main.ts



public/

└── models/

&#x20;   └── sagyam/

&#x20;       ├── NOTICE.md

&#x20;       └── V3/

&#x20;           ├── model.json

&#x20;           ├── group1-shard1of4.bin

&#x20;           ├── group1-shard2of4.bin

&#x20;           ├── group1-shard3of4.bin

&#x20;           └── group1-shard4of4.bin



docs/

└── eval-fresh-set.txt



DECISIONS.md

LICENSE

Local Development

Requirements

Node.js

npm

Install dependencies



Clone the repository and install dependencies:



npm install

Start the development server

npm run dev



Open the local URL printed by Vite in the terminal.



Run tests

npm test -- --run

Build for production

npm run build

Testing



The current automated test suite covers:



project setup

coordinate conversion

stroke history

geometry

post-processing

arithmetic evaluation

symbol segmentation

recognition pipeline

answer layout

recognition scheduling



Current status:



10 test files

84 tests

84 passed



The production TypeScript/Vite build also completes successfully.



Browser validation



The current browser flow has been manually checked for:



automatic recognition after pen-up

previous answer removal after starting a new stroke

automatic recognition of a new expression

undo handling

clear handling

rapid writing with debounced recognition

Evaluation



A fresh expression-level evaluation was performed after recognition tuning.



Protocol

10 expressions

3 official attempts per expression

30 official runs

one writer

one device

Result

Exact text accuracy = 29/30 = 96.7%



This is reported as approximately:



97%



because the sample is small.



Official evaluation set

9-4=

6×7=

8÷4=

3.2+1.8=

25×4=

100-37=

7+8÷2=

6×3-4=

0.5×6=

36÷9+2.5=

Failed official run



One official run produced:



Expected:   9-4=

Recognized: Y1.-4=



The segmentation log showed:



Number of groups: 6



The first intended 9 was split into three groups, which were subsequently

classified as:



Y

1

.



followed by the correctly recognized:



\-

4

=



The failure therefore involved segmentation followed by model classification.



Additional runs



An additional 9-4= retry was made outside the official three attempts and

passed.



Therefore, the raw log contains four attempts for 9-4=:



3 passed

1 failed



This additional attempt is excluded from the official 30-run denominator.



An accidental:



25×6=



run was also retained in the raw log but excluded from the official

evaluation.



Evaluation limitations



The fresh evaluation has the following limitations:



one writer

one device

small sample size

earlier evaluation sets were used during tuning of recognition,

preprocessing, and segmentation



The 29/30 result should therefore be interpreted as a small-sample engineering

measurement and not as a general handwriting-recognition benchmark.



Answer accuracy



Displayed-answer accuracy was not separately recorded during this evaluation.



Therefore no separate answer-accuracy percentage is claimed.



The evaluation record is maintained in:



docs/eval-fresh-set.txt

Documentation



Important project documentation:



DECISIONS.md



contains model-selection, architecture, preprocessing, segmentation, and

evaluation decisions.



docs/eval-fresh-set.txt



contains the fresh expression-level evaluation record.



public/models/sagyam/NOTICE.md



contains third-party model and redistribution information.



LICENSE



contains the repository license.



License



CalcInk is distributed under the GNU General Public License v3.0.



The project includes the Sagyam handwritten-character-recognition model,

which is distributed under GPL-3.0.



The model is third-party material and its source and license are documented in:



public/models/sagyam/NOTICE.md

Current Status

Completed

responsive digital-ink canvas

mouse, stylus, and touch input

smooth drawing

high-DPI scaling

undo / redo

clear

stroke-width adjustment

stroke-based data model

symbol segmentation

symbol preprocessing

local Sagyam model integration

TensorFlow.js inference

Web Worker inference

deterministic arithmetic parser

operator precedence

decimals

negative numbers

division-by-zero handling

automatic recognition

600 ms recognition debounce

stale-result protection

inline answer projection

dynamic answer removal during editing

automated tests

evaluation documentation

Remaining Work



The following features are still planned before final submission:



stroke eraser

pixel eraser

service-worker-based offline caching

offline / airplane-mode verification

deployed production demo

recognition latency measurement

memory measurement

60 FPS drawing measurement

final submission polish



\### Save it correctly



In Notepad:



\*\*File → Save As\*\*



Use:



```text

File name: README.md

Save as type: All Files (\*.\*)

Encoding: UTF-8



Make sure it does not become:



README.md.txt



Then run:



Get-ChildItem README.md



and:



git status --short



You should now see something like:



?? LICENSE

?? README.md

?? public/models/sagyam/NOTICE.md

