export class RecognitionScheduler<T> {
  private run: () => Promise<T>;
  private onResult: (result: T) => void;
  private onError: (error: unknown) => void;
  private delayMs: number;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private version = 0;

  constructor(
    run: () => Promise<T>,
    onResult: (result: T) => void,
    onError: (error: unknown) => void,
    delayMs = 600
  ) {
    this.run = run;
    this.onResult = onResult;
    this.onError = onError;
    this.delayMs = delayMs;
  }

  schedule() {
    this.clearTimer();
    this.version++;

    this.timer = setTimeout(
      () => void this.fire(),
      this.delayMs
    );
  }

  cancel() {
    this.clearTimer();
    this.version++;
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async fire() {
    this.timer = null;

    const mine = this.version;

    try {
      const result = await this.run();

      if (mine === this.version) {
        this.onResult(result);
      }
    } catch (error) {
      if (mine === this.version) {
        this.onError(error);
      }
    }
  }
}