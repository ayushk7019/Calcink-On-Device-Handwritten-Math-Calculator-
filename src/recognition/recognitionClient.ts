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

  private pendingResolve: ((result: RecognitionResult) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;

  constructor() {
    this.worker = new Worker(
      new URL("../worker/recognition.worker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    this.worker.addEventListener("message", this.onMessage);

    this.worker.postMessage({
      type: "load",
    });
  }

  private onMessage = (event: MessageEvent) => {
    const data = event.data;

    if (data.type === "ready") {
      this.resolveReady();
      return;
    }

    if (data.type === "error") {
      const error = new Error(data.message);

      if (this.pendingReject) {
        this.pendingReject(error);
        this.pendingResolve = null;
        this.pendingReject = null;
      } else {
        this.rejectReady(error);
      }

      return;
    }

    if (data.type === "result") {
      if (this.pendingResolve) {
        this.pendingResolve(data.result);
        this.pendingResolve = null;
        this.pendingReject = null;
      }
    }
  };

  async ready(): Promise<void> {
    await this.readyPromise;
  }

  async recognize(imageData: ImageData): Promise<RecognitionResult> {
    await this.ready();

    return new Promise<RecognitionResult>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      this.worker.postMessage({
        type: "predict",
        imageData,
      });
    });
  }

  dispose() {
    this.worker.terminate();
  }
}