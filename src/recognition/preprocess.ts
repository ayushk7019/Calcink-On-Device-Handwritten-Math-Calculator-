import type { Stroke } from "../canvas/types";
import { squareBox } from "./geometry";

const SIZE = 100;
const PADDING_RATIO = 0.15;

export function strokesToImageData(
  strokes: readonly Stroke[],
  opts = { inkPx: 7, invert: false }
): ImageData | null {
  const box = squareBox(strokes);

  if (!box) {
    return null;
  }

  const canvas = document.createElement("canvas");

  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not create preprocessing canvas");
  }

  const bg = opts.invert ? "#000" : "#fff";
  const ink = opts.invert ? "#fff" : "#000";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const paddedSize =
    box.size * (1 + 2 * PADDING_RATIO);

  const centerX = box.x + box.size / 2;
  const centerY = box.y + box.size / 2;

  const paddedX =
    centerX - paddedSize / 2;

  const paddedY =
    centerY - paddedSize / 2;

  const scale = SIZE / paddedSize;

  ctx.setTransform(
    scale,
    0,
    0,
    scale,
    -paddedX * scale,
    -paddedY * scale
  );

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = opts.inkPx / scale;

  for (const stroke of strokes) {
    const p = stroke.points;

    if (p.length === 0) {
      continue;
    }

    if (p.length === 1) {
      ctx.beginPath();
      ctx.arc(
        p[0].x,
        p[0].y,
        ctx.lineWidth / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      continue;
    }

    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);

    for (let i = 1; i < p.length; i++) {
      ctx.lineTo(p[i].x, p[i].y);
    }

    ctx.stroke();
  }

  return ctx.getImageData(
    0,
    0,
    SIZE,
    SIZE
  );
}