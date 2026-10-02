import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { RecognitionScheduler } from "../src/recognition/scheduler";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((r) => {
    resolve = r;
  });

  return {
    promise,
    resolve,
  };
};

function make(
  run: () => Promise<string>
) {
  const got: string[] = [];
  const errors: unknown[] = [];

  const scheduler =
    new RecognitionScheduler(
      run,
      (result) => got.push(result),
      (error) => errors.push(error),
      600
    );

  return {
    scheduler,
    got,
    errors,
  };
}

describe("RecognitionScheduler", () => {
  test(
    "runs once, after the debounce delay",
    async () => {
      const run = vi.fn(
        async () => "ok"
      );

      const {
        scheduler,
        got,
      } = make(run);

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        599
      );

      expect(run).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(
        1
      );

      expect(run).toHaveBeenCalledTimes(1);
      expect(got).toEqual(["ok"]);
    }
  );

  test(
    "rapid schedules collapse into a single run",
    async () => {
      const run = vi.fn(
        async () => "ok"
      );

      const { scheduler } = make(run);

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        300
      );

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        300
      );

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        700
      );

      expect(run).toHaveBeenCalledTimes(1);
    }
  );

  test(
    "a stale result that arrives after a newer run is dropped",
    async () => {
      const d1 = deferred<string>();
      const d2 = deferred<string>();

      const run = vi
        .fn()
        .mockReturnValueOnce(
          d1.promise
        )
        .mockReturnValueOnce(
          d2.promise
        );

      const {
        scheduler,
        got,
      } = make(run);

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        600
      );

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        600
      );

      d2.resolve("new");

      await vi.advanceTimersByTimeAsync(
        0
      );

      d1.resolve("old");

      await vi.advanceTimersByTimeAsync(
        0
      );

      expect(got).toEqual(["new"]);
    }
  );

  test(
    "cancel drops an in-flight result",
    async () => {
      const d = deferred<string>();

      const {
        scheduler,
        got,
      } = make(
        () => d.promise
      );

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        600
      );

      scheduler.cancel();

      d.resolve("late");

      await vi.advanceTimersByTimeAsync(
        0
      );

      expect(got).toEqual([]);
    }
  );

  test(
    "cancel stops a pending timer",
    async () => {
      const run = vi.fn(
        async () => "ok"
      );

      const { scheduler } = make(run);

      scheduler.schedule();
      scheduler.cancel();

      await vi.advanceTimersByTimeAsync(
        2000
      );

      expect(run).not.toHaveBeenCalled();
    }
  );

  test(
    "errors from the current run are reported, stale errors are not",
    async () => {
      const d1 = deferred<string>();

      const run = vi
        .fn()
        .mockReturnValueOnce(
          d1.promise
        )
        .mockRejectedValueOnce(
          new Error("boom")
        );

      const {
        scheduler,
        errors,
      } = make(run);

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        600
      );

      scheduler.schedule();

      await vi.advanceTimersByTimeAsync(
        600
      );

      expect(errors).toHaveLength(1);

      d1.promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(
        0
      );

      expect(errors).toHaveLength(1);
    }
  );
});