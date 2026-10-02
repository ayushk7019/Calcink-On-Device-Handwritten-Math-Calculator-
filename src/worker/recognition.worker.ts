import * as tf from "@tensorflow/tfjs";
import { labels } from "../recognition/vocabulary";

const MODEL_URL =
  "/models/sagyam/V3/model.json";

class L2 {
  static className = "L2";

  constructor(config: any) {
    return tf.regularizers.l1l2(config);
  }
}

class L1 {
  static className = "L1";

  constructor(config: any) {
    return tf.regularizers.l1l2(config);
  }
}

tf.serialization.registerClass(L2 as any);
tf.serialization.registerClass(L1 as any);

let modelPromise:
  | Promise<tf.LayersModel>
  | null = null;

function loadModel() {
  if (!modelPromise) {
    modelPromise =
      tf.loadLayersModel(
        MODEL_URL
      );
  }

  return modelPromise;
}

type WorkerMessage =
  | {
      type: "load";
    }
  | {
      type: "predict";
      id: number;
      imageData: ImageData;
    };

self.onmessage = async (
  event: MessageEvent<WorkerMessage>
) => {
  const message = event.data;

  try {
    const model =
      await loadModel();

    if (message.type === "load") {
      self.postMessage({
        type: "ready",
      });

      return;
    }

    const start =
      performance.now();

    const { data } =
      message.imageData;

    const rgb =
      new Float32Array(
        100 * 100 * 3
      );

    for (
      let i = 0, j = 0;
      i < data.length;
      i += 4
    ) {
      rgb[j++] =
        data[i] / 255;

      rgb[j++] =
        data[i + 1] / 255;

      rgb[j++] =
        data[i + 2] / 255;
    }

    const input =
      tf.tensor4d(
        rgb,
        [1, 100, 100, 3]
      );

    const probabilities =
      tf.tidy(() => {
        const output =
          model.predict(
            input
          ) as tf.Tensor;

        return output.dataSync();
      });

    input.dispose();

    let bestIndex = 0;

    for (
      let i = 1;
      i < probabilities.length;
      i++
    ) {
      if (
        probabilities[i] >
        probabilities[bestIndex]
      ) {
        bestIndex = i;
      }
    }

    const result = {
      label:
        labels[bestIndex],
      index: bestIndex,
      confidence:
        probabilities[bestIndex],
      elapsedMs:
        performance.now() -
        start,
    };

    self.postMessage({
      type: "result",
      id: message.id,
      result,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      ...(message.type === "predict"
        ? { id: message.id }
        : {}),
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};