\# Model Notice



\## Model



Sagyam Handwritten Character Recognition



\## Source



https://github.com/Sagyam/Handwritten-Optical-Character-Recognition



\## License



GPL-3.0



\## Model Format



TensorFlow.js Layers Model



\## Local Location



`public/models/sagyam/V3/`



\## Files



\- `model.json`

\- `group1-shard1of4.bin`

\- `group1-shard2of4.bin`

\- `group1-shard3of4.bin`

\- `group1-shard4of4.bin`



\## Architecture



\- MobileNetV2 backbone without the classification head

\- Global max pooling

\- BatchNormalization

\- Dense(1024, ReLU)

\- Dropout(0.3)

\- Dense(19, Softmax)



\## Output Classes



The model contains 19 classes:



\- 0-9

\- Add

\- Decimal

\- Division

\- Equals

\- Multiply

\- Minus

\- X

\- Y

\- Z



CalcInk uses the required mathematical vocabulary from the model's output

classes.



\## Redistribution



These model files are redistributed with CalcInk.



The model files themselves were not modified.



\## Project Code



The CalcInk application code under `src/` was written for this project.

