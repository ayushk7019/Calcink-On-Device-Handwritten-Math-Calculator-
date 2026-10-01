export type RecognitionResult = {
  label: string;
  index: number;
  confidence: number;
  elapsedMs: number;
};

export class RecognitionClient {
  private worker: Worker;

  private readyPromise: Promise<void>;

  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;

  constructor() {
    this.worker = new Worker(
      new URL(
        "../worker/recognition.worker.ts",
        import.meta.url
      ),
      {
        type: "module",
      }
    );

    this.readyPromise = new Promise(
      (resolve, reject) => {
        this.resolveReady = resolve;
        this.rejectReady = reject;
      }
    );

    this.worker.addEventListener(
      "message",
      this.onMessage
    );

    this.worker.postMessage({
      type: "load",
    });
  }

  private onMessage = (
    event: MessageEvent
  ) => {
    if (event.data.type === "ready") {
      this.resolveReady();
      return;
    }

    if (event.data.type === "error") {
      this.rejectReady(
        new Error(event.data.message)
      );
    }
  };

  async ready() {
    await this.readyPromise;
  }

  recognize(
    imageData: ImageData
  ): Promise<RecognitionResult> {
    return new Promise(
      async (resolve, reject) => {
        await this.ready();

        const handler = (
          event: MessageEvent
        ) => {
          if (event.data.type === "result") {
            this.worker.removeEventListener(
              "message",
              handler
            );

            resolve(event.data.result);
          }

          if (event.data.type === "error") {
            this.worker.removeEventListener(
              "message",
              handler
            );

            reject(
              new Error(event.data.message)
            );
          }
        };

        this.worker.addEventListener(
          "message",
          handler
        );

        this.worker.postMessage({
          type: "predict",
          imageData,
        });
      }
    );
  }

  dispose() {
    this.worker.terminate();
  }
}