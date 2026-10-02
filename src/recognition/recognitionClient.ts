export type RecognitionResult = {
  label: string;
  index: number;
  confidence: number;
  elapsedMs: number;
};

type PendingRequest = {
  resolve: (result: RecognitionResult) => void;
  reject: (error: Error) => void;
};

export class RecognitionClient {
  private worker: Worker;

  private readyPromise: Promise<void>;

  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;

  private nextId = 1;

  private pending = new Map<
    number,
    PendingRequest
  >();

  private disposed = false;

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

    this.readyPromise =
      new Promise<void>(
        (resolve, reject) => {
          this.resolveReady = resolve;
          this.rejectReady = reject;
        }
      );

    this.worker.addEventListener(
      "message",
      this.onMessage
    );

    this.worker.addEventListener(
      "error",
      this.onWorkerError
    );

    this.worker.postMessage({
      type: "load",
    });
  }

  private onMessage = (
    event: MessageEvent
  ) => {
    const data = event.data;

    if (data.type === "ready") {
      this.resolveReady();
      return;
    }

    if (data.type === "error") {
      const error = new Error(
        data.message
      );

      if (
        typeof data.id === "number"
      ) {
        const pending =
          this.pending.get(data.id);

        if (!pending) {
          return;
        }

        this.pending.delete(data.id);

        pending.reject(error);

        return;
      }

      this.rejectReady(error);

      return;
    }

    if (data.type === "result") {
      if (
        typeof data.id !== "number"
      ) {
        return;
      }

      const pending =
        this.pending.get(data.id);

      if (!pending) {
        return;
      }

      this.pending.delete(data.id);

      pending.resolve(
        data.result
      );
    }
  };

  private onWorkerError = (
    event: ErrorEvent
  ) => {
    const error = new Error(
      event.message ||
        "Recognition worker failed"
    );

    this.rejectReady(error);

    for (const pending of this.pending.values()) {
      pending.reject(error);
    }

    this.pending.clear();
  };

  async ready(): Promise<void> {
    await this.readyPromise;
  }

  async recognize(
    imageData: ImageData
  ): Promise<RecognitionResult> {
    await this.ready();

    if (this.disposed) {
      throw new Error(
        "Recognition client is disposed"
      );
    }

    const id = this.nextId++;

    return new Promise<RecognitionResult>(
      (resolve, reject) => {
        this.pending.set(id, {
          resolve,
          reject,
        });

        try {
          this.worker.postMessage({
            type: "predict",
            id,
            imageData,
          });
        } catch (error) {
          this.pending.delete(id);

          reject(
            error instanceof Error
              ? error
              : new Error(String(error))
          );
        }
      }
    );
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    const error = new Error(
      "Recognition client disposed"
    );

    for (const pending of this.pending.values()) {
      pending.reject(error);
    }

    this.pending.clear();

    this.worker.terminate();
  }
}