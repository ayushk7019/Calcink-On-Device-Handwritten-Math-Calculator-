import { screenToCanvas } from "./coordinates";
import { StrokeHistory } from "./history";
import type { Annotation } from "../recognition/answerLayout";
import type { Point, Stroke } from "./types";

export type CanvasChangeKind =
  | "start"
  | "commit"
  | "edit";

export class DrawingCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private history = new StrokeHistory();
  private currentStroke: Stroke | null = null;
  private annotations: Annotation[] = [];
  private nextId = 1;
  private strokeWidth = 3;
  private cssWidth = 0;
  private cssHeight = 0;

  onChange:
    | ((kind: CanvasChangeKind) => void)
    | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Could not get canvas context"
      );
    }

    this.ctx = ctx;

    this.attachEvents();
    this.resize();
  }

  private resize = () => {
    const rect =
      this.canvas.getBoundingClientRect();

    const dpr =
      window.devicePixelRatio || 1;

    this.cssWidth = rect.width;
    this.cssHeight = rect.height;

    this.canvas.width = Math.round(
      rect.width * dpr
    );

    this.canvas.height = Math.round(
      rect.height * dpr
    );

    this.ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    this.applyStyle();
    this.render();
  };

  private applyStyle() {
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = "#1a1a1a";
    this.ctx.fillStyle = "#1a1a1a";
  }

  private attachEvents() {
    this.canvas.addEventListener(
      "pointerdown",
      this.onPointerDown
    );

    this.canvas.addEventListener(
      "pointermove",
      this.onPointerMove
    );

    this.canvas.addEventListener(
      "pointerup",
      this.onPointerUp
    );

    this.canvas.addEventListener(
      "pointercancel",
      this.onPointerCancel
    );

    window.addEventListener(
      "resize",
      this.resize
    );
  }

  private getPoints(
    event: PointerEvent
  ): Point[] {
    const coalesced =
      event.getCoalescedEvents?.() ?? [];

    const events =
      coalesced.length > 0
        ? coalesced
        : [event];

    const rect =
      this.canvas.getBoundingClientRect();

    return events.map((e) => {
      const pos = screenToCanvas(
        e.clientX,
        e.clientY,
        rect
      );

      return {
        x: pos.x,
        y: pos.y,
        time: e.timeStamp,
      };
    });
  }

  private onPointerDown = (
    event: PointerEvent
  ) => {
    if (!event.isPrimary) {
      return;
    }

    event.preventDefault();

    this.annotations = [];

    this.onChange?.("start");

    this.canvas.setPointerCapture(
      event.pointerId
    );

    this.currentStroke = {
      id: this.nextId++,
      width: this.strokeWidth,
      points: this.getPoints(event),
    };

    this.render();
  };

  private onPointerMove = (
    event: PointerEvent
  ) => {
    if (
      !this.currentStroke ||
      !event.isPrimary
    ) {
      return;
    }

    event.preventDefault();

    this.currentStroke.points.push(
      ...this.getPoints(event)
    );

    this.render();
  };

  private onPointerUp = (
    event: PointerEvent
  ) => {
    if (
      !this.currentStroke ||
      !event.isPrimary
    ) {
      return;
    }

    event.preventDefault();

    this.history.commit(
      this.currentStroke
    );

    this.currentStroke = null;

    this.render();

    this.onChange?.("commit");
  };

  private onPointerCancel = () => {
    this.annotations = [];
    this.currentStroke = null;

    this.render();

    this.onChange?.("edit");
  };

  private drawStroke(
    stroke: Stroke
  ) {
    const p = stroke.points;

    if (p.length === 0) {
      return;
    }

    this.ctx.lineWidth =
      stroke.width;

    if (p.length === 1) {
      this.ctx.beginPath();

      this.ctx.arc(
        p[0].x,
        p[0].y,
        stroke.width / 2,
        0,
        Math.PI * 2
      );

      this.ctx.fill();

      return;
    }

    this.ctx.beginPath();

    this.ctx.moveTo(
      p[0].x,
      p[0].y
    );

    for (
      let i = 1;
      i < p.length - 1;
      i++
    ) {
      const midX =
        (p[i].x + p[i + 1].x) / 2;

      const midY =
        (p[i].y + p[i + 1].y) / 2;

      this.ctx.quadraticCurveTo(
        p[i].x,
        p[i].y,
        midX,
        midY
      );
    }

    const last =
      p[p.length - 1];

    this.ctx.lineTo(
      last.x,
      last.y
    );

    this.ctx.stroke();
  }

  private drawAnnotations() {
    if (
      this.annotations.length === 0
    ) {
      return;
    }

    this.ctx.save();

    this.ctx.textBaseline = "middle";

    for (
      const annotation of this.annotations
    ) {
      this.ctx.font =
        `${annotation.size}px system-ui, "Segoe UI", sans-serif`;

      this.ctx.fillStyle =
        annotation.kind === "answer"
          ? "#1a5fb4"
          : "#b3261e";

      this.ctx.fillText(
        annotation.text,
        annotation.x,
        annotation.y
      );
    }

    this.ctx.restore();

    this.applyStyle();
  }

  private render() {
    this.ctx.clearRect(
      0,
      0,
      this.cssWidth,
      this.cssHeight
    );

    this.applyStyle();

    for (
      const stroke of this.history.all
    ) {
      this.drawStroke(stroke);
    }

    if (this.currentStroke) {
      this.drawStroke(
        this.currentStroke
      );
    }

    this.drawAnnotations();
  }

  setAnnotations(
    annotations: Annotation[]
  ) {
    this.annotations =
      [...annotations];

    this.render();
  }

  undo() {
    if (this.history.undo()) {
      this.annotations = [];
      this.render();
      this.onChange?.("edit");
    }
  }

  redo() {
    if (this.history.redo()) {
      this.annotations = [];
      this.render();
      this.onChange?.("edit");
    }
  }

  clear() {
    this.annotations = [];
    this.history.clear();
    this.currentStroke = null;

    this.render();

    this.onChange?.("edit");
  }

  setStrokeWidth(
    width: number
  ) {
    this.strokeWidth = width;
  }

  getStrokes(): readonly Stroke[] {
    return this.history.all;
  }
}