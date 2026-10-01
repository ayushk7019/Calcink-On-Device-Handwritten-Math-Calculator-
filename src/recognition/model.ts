import * as tf from "@tensorflow/tfjs";

const MODEL_URL = "/models/sagyam/V3/model.json";

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

let modelPromise: Promise<tf.LayersModel> | null = null;

export function loadModel() {
  if (!modelPromise) {
    modelPromise = tf.loadLayersModel(MODEL_URL);
  }

  return modelPromise;
}