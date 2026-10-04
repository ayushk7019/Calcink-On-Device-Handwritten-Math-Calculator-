import { screenToCanvas } from "./coordinates";
import { strokeHit } from "./hitTest";
import { erasePieces } from "./pixelErase";
import { StrokeHistory } from "./history";
import type { Annotation } from "../recognition/answerLayout";
import type { SymbolOverlay } from "../recognition/overlayLayout";
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
  private overlays: SymbolOverlay[] = [];
  private showOverlays = false;
  private nextId = 1;
  private strokeWidth = 3;
  private cssWidth = 0;
  private cssHeight = 0;

  private tool:
    | "pen"
    | "eraser"
    | "pixel" = "pen";

  private erasing = new Set<number>();
  private isErasing = false;
  private eraserRadius = 10;

  private pixelWork =
    new Map<number, Point[][]>();

  private lastEraser:
    | { x: number; y: number }
    | null = null;

  onChange:
    | ((kind: CanvasChangeKind) => void)
    | null = null;

  constructor(
    canvas: HTMLCanvasElement
  ) {
    this.canvas = canvas;

    const ctx =
      canvas.getContext("2d");

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

    this.canvas.width =
      Math.round(
        rect.width * dpr
      );

    this.canvas.height =
      Math.round(
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
    this.ctx.strokeStyle =
      "#1a1a1a";
    this.ctx.fillStyle =
      "#1a1a1a";
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
      event.getCoalescedEvents?.() ??
      [];

    const events =
      coalesced.length > 0
        ? coalesced
        : [event];

    const rect =
      this.canvas.getBoundingClientRect();

    return events.map((e) => {
      const pos =
        screenToCanvas(
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

  private eraseAt(
    event: PointerEvent
  ) {
    for (
      const point of this.getPoints(
        event
      )
    ) {
      for (
        const stroke of
        this.history.all
      ) {
        if (
          this.erasing.has(
            stroke.id
          )
        ) {
          continue;
        }

        if (
          strokeHit(
            stroke,
            point.x,
            point.y,
            this.eraserRadius
          )
        ) {
          this.erasing.add(
            stroke.id
          );
        }
      }
    }
  }

  private eraseStep(
    event: PointerEvent
  ) {
    if (
      this.tool === "eraser"
    ) {
      this.eraseAt(event);
    } else {
      this.eraseSweep(event);
    }
  }

  private eraseSweep(
    event: PointerEvent
  ) {
    for (
      const point of this.getPoints(
        event
      )
    ) {
      const from =
        this.lastEraser ?? {
          x: point.x,
          y: point.y,
        };

      const distance =
        Math.hypot(
          point.x - from.x,
          point.y - from.y
        );

      const steps =
        Math.max(
          1,
          Math.ceil(
            distance /
              (this.eraserRadius /
                2)
          )
        );

      for (
        let i = 1;
        i <= steps;
        i++
      ) {
        const t =
          i / steps;

        const x =
          from.x +
          (point.x -
            from.x) *
            t;

        const y =
          from.y +
          (point.y -
            from.y) *
            t;

        this.pixelEraseAt(
          x,
          y
        );
      }

      this.lastEraser = {
        x: point.x,
        y: point.y,
      };
    }
  }

  private pixelEraseAt(
    x: number,
    y: number
  ) {
    for (
      const stroke of
      this.history.all
    ) {
      const base =
        this.pixelWork.get(
          stroke.id
        ) ?? [stroke.points];

      const next: Point[][] =
        [];

      let changed = false;

      for (
        const piece of base
      ) {
        const out =
          erasePieces(
            piece,
            x,
            y,
            this.eraserRadius +
              stroke.width / 2
          );

        if (out === null) {
          next.push(piece);
        } else {
          changed = true;
          next.push(...out);
        }
      }

      if (changed) {
        this.pixelWork.set(
          stroke.id,
          next
        );
      }
    }
  }

  private commitPixelErase() {
    const replacements: {
      id: number;
      pieces: Stroke[];
    }[] = [];

    for (
      const stroke of
      this.history.all
    ) {
      const work =
        this.pixelWork.get(
          stroke.id
        );

      if (!work) {
        continue;
      }

      replacements.push({
        id: stroke.id,
        pieces:
          work.map(
            (points) => ({
              id:
                this.nextId++,
              width:
                stroke.width,
              points,
            })
          ),
      });
    }

    if (
      replacements.length > 0
    ) {
      this.history.replace(
        replacements
      );
    }
  }

  private onPointerDown = (
    event: PointerEvent
  ) => {
    if (!event.isPrimary) {
      return;
    }

    event.preventDefault();

    this.annotations = [];
    this.overlays = [];

    this.onChange?.("start");

    this.canvas.setPointerCapture(
      event.pointerId
    );

    if (
      this.tool !== "pen"
    ) {
      this.isErasing = true;
      this.erasing.clear();
      this.pixelWork.clear();
      this.lastEraser = null;

      this.eraseStep(event);
      this.render();

      return;
    }

    this.currentStroke = {
      id: this.nextId++,
      width: this.strokeWidth,
      points: this.getPoints(
        event
      ),
    };

    this.render();
  };

  private onPointerMove = (
    event: PointerEvent
  ) => {
    if (!event.isPrimary) {
      return;
    }

    if (this.isErasing) {
      event.preventDefault();

      this.eraseStep(event);
      this.render();

      return;
    }

    if (!this.currentStroke) {
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
    if (!event.isPrimary) {
      return;
    }

    if (this.isErasing) {
      event.preventDefault();

      this.isErasing = false;

      if (
        this.tool === "eraser"
      ) {
        this.history.erase(
          this.erasing
        );
      } else {
        this.commitPixelErase();
      }

      this.erasing.clear();
      this.pixelWork.clear();
      this.lastEraser = null;

      this.render();

      this.onChange?.("commit");

      return;
    }

    if (!this.currentStroke) {
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
    this.isErasing = false;
    this.erasing.clear();
    this.pixelWork.clear();
    this.lastEraser = null;

    this.annotations = [];
    this.overlays = [];
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
        (p[i].x +
          p[i + 1].x) /
        2;

      const midY =
        (p[i].y +
          p[i + 1].y) /
        2;

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

  private drawOverlays() {
    if (
      !this.showOverlays ||
      this.overlays.length === 0
    ) {
      return;
    }

    const colors = {
      high: "#2e7d32",
      medium: "#b26a00",
      low: "#b3261e",
    };

    this.ctx.save();

    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 3]);
    this.ctx.font =
      '11px system-ui, "Segoe UI", sans-serif';
    this.ctx.textBaseline =
      "bottom";

    for (
      const overlay of
      this.overlays
    ) {
      this.ctx.strokeStyle =
        colors[overlay.level];

      this.ctx.fillStyle =
        colors[overlay.level];

      this.ctx.strokeRect(
        overlay.x,
        overlay.y,
        overlay.w,
        overlay.h
      );

      const labelY =
        overlay.y < 14
          ? overlay.y +
            overlay.h +
            13
          : overlay.y - 2;

      this.ctx.fillText(
        overlay.text,
        overlay.x,
        labelY
      );
    }

    this.ctx.restore();

    this.applyStyle();
  }

  private drawAnnotations() {
    if (
      this.annotations.length ===
      0
    ) {
      return;
    }

    this.ctx.save();

    this.ctx.textBaseline =
      "middle";

    for (
      const annotation of
      this.annotations
    ) {
      this.ctx.font =
        `${annotation.size}px system-ui, "Segoe UI", sans-serif`;

      this.ctx.fillStyle =
        annotation.kind ===
        "answer"
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
      const stroke of
      this.history.all
    ) {
      if (
        this.erasing.has(
          stroke.id
        )
      ) {
        continue;
      }

      const work =
        this.pixelWork.get(
          stroke.id
        );

      if (work) {
        for (
          const points of work
        ) {
          this.drawStroke({
            id: stroke.id,
            width: stroke.width,
            points,
          });
        }
      } else {
        this.drawStroke(
          stroke
        );
      }
    }

    if (this.currentStroke) {
      this.drawStroke(
        this.currentStroke
      );
    }

    this.drawOverlays();
    this.drawAnnotations();
  }

  setAnnotations(
    annotations: Annotation[]
  ) {
    this.annotations =
      [...annotations];

    this.render();
  }

  setOverlays(
    overlays: SymbolOverlay[]
  ) {
    this.overlays =
      [...overlays];

    this.render();
  }

  setShowOverlays(
    on: boolean
  ) {
    this.showOverlays = on;
    this.render();
  }

  setTool(
    tool:
      | "pen"
      | "eraser"
      | "pixel"
  ) {
    this.tool = tool;

    this.canvas.style.cursor =
      tool === "pen"
        ? "default"
        : "crosshair";
  }

  undo() {
    if (this.history.undo()) {
      this.annotations = [];
      this.overlays = [];

      this.render();
      this.onChange?.("edit");
    }
  }

  redo() {
    if (this.history.redo()) {
      this.annotations = [];
      this.overlays = [];

      this.render();
      this.onChange?.("edit");
    }
  }

  clear() {
    this.annotations = [];
    this.overlays = [];
    this.history.clear();
    this.currentStroke = null;
    this.isErasing = false;
    this.erasing.clear();
    this.pixelWork.clear();
    this.lastEraser = null;

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