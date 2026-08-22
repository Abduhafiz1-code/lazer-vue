import { defineStore } from "pinia";
import {
  getHandles,
  moveShape,
  cloneShape,
  shapeToPoints,
  shapeBounds,
  presetPoints,
} from "../utils/geometry";
import { eraseAt, eraseAlong } from "../utils/eraser";

let idCounter = 1;
function newId() {
  return "sh" + idCounter++;
}

const MAX_HISTORY = 100;

export const useCanvasStore = defineStore("canvas", {
  state: () => ({
    projectId: null,
    projectName: "Chizma 1",
    shapes: [],
    currentLayer: "cut",
    tool: "select",
    selectedId: null,
    scale: 4,
    originX: 60,
    originY: 60,
    gridOn: true,
    snapOn: true,
    snapMm: 1,
    dimOn: true,
    guidesOn: true,
    suggestionsOn: true,
    eraserSize: 6, // mm, diameter
    polygonSides: 6,
    presetShape: "triangle",
    unit: "mm",
    dirty: false,
    clipboard: null,
    history: [],
    historyIndex: -1,
    _suspendHistory: false,
  }),
  getters: {
    selectedShape(state) {
      return state.shapes.find((s) => s.id === state.selectedId) || null;
    },
    unitLabel(state) {
      return state.unit;
    },
    canUndo(state) {
      return state.historyIndex > 0;
    },
    canRedo(state) {
      return (
        state.historyIndex >= 0 && state.historyIndex < state.history.length - 1
      );
    },
  },
  actions: {
    resetProject(name = "Chizma 1") {
      this.projectId = null;
      this.projectName = name;
      this.shapes = [];
      this.selectedId = null;
      this.dirty = false;
      this._resetHistory();
    },
    loadProject(id, name, shapes) {
      this.projectId = id;
      this.projectName = name;
      this.shapes = shapes || [];
      this.selectedId = null;
      this.dirty = false;
      this._resetHistory();
    },
    setTool(t) {
      this.tool = t;
    },
    setLayer(l) {
      this.currentLayer = l;
      if (this.selectedId) {
        const sh = this.shapes.find((s) => s.id === this.selectedId);
        if (sh) {
          sh.layer = l;
          this._commit();
        }
      }
    },
    addShape(data) {
      data.id = newId();
      this.shapes.push(data);
      this.selectedId = data.id;
      this._commit();
    },
    addPresetShape(preset) {
      const selected = this.selectedShape;
      const bounds = selected ? shapeBounds(selected) : null;
      const cx = bounds ? bounds.maxX + 35 : 60;
      const cy = bounds ? (bounds.minY + bounds.maxY) / 2 : 60;
      this.addShape({
        type: "path",
        layer: this.currentLayer,
        points: presetPoints(cx, cy, 18, preset),
        closed: true,
        preset,
      });
    },
    updateShape(id, patch) {
      const sh = this.shapes.find((s) => s.id === id);
      if (sh) {
        Object.assign(sh, patch);
        this._commit();
      }
    },
    deleteShape(id) {
      this.shapes = this.shapes.filter((s) => s.id !== id);
      if (this.selectedId === id) this.selectedId = null;
      this._commit();
    },
    selectShape(id) {
      this.selectedId = id;
    },
    snap(v) {
      return this.snapOn ? Math.round(v / this.snapMm) * this.snapMm : v;
    },

    // --- Drag / move (no history commit per-frame; call commitDrag() on mouseup) ---
    moveSelectedBy(dx, dy) {
      const sh = this.selectedShape;
      if (!sh) return;
      moveShape(sh, dx, dy);
      this.dirty = true;
    },
    commitDrag() {
      this._commit();
    },

    // --- Productivity features ---
    duplicateSelected() {
      const sh = this.selectedShape;
      if (!sh) return;
      const copy = cloneShape(sh);
      copy.id = newId();
      const offset = this.snapMm || 5;
      moveShape(copy, offset, offset);
      this.shapes.push(copy);
      this.selectedId = copy.id;
      this._commit();
    },
    copySelected() {
      const sh = this.selectedShape;
      if (!sh) return;
      this.clipboard = cloneShape(sh);
    },
    pasteClipboard() {
      if (!this.clipboard) return;
      const copy = cloneShape(this.clipboard);
      copy.id = newId();
      const offset = this.snapMm || 5;
      moveShape(copy, offset, offset);
      this.shapes.push(copy);
      this.selectedId = copy.id;
      this._commit();
    },
    nudgeSelected(dx, dy) {
      const sh = this.selectedShape;
      if (!sh) return;
      moveShape(sh, dx, dy);
      this._commit();
    },

    splitSelected() {
      const sh = this.selectedShape;
      if (!sh) return;
      const base = cloneShape(sh);
      if (sh.type === "circle") {
        this.shapes = this.shapes.filter((item) => item.id !== sh.id);
        this.shapes.push(
          {
            ...base,
            id: newId(),
            type: "semicircle",
            start: -Math.PI / 2,
            end: Math.PI / 2,
          },
          {
            ...base,
            id: newId(),
            type: "semicircle",
            start: Math.PI / 2,
            end: Math.PI * 1.5,
          },
        );
      } else if (sh.type === "ellipse") {
        this.shapes = this.shapes.filter((item) => item.id !== sh.id);
        this.shapes.push(
          {
            ...base,
            id: newId(),
            type: "semiellipse",
            start: -Math.PI / 2,
            end: Math.PI / 2,
          },
          {
            ...base,
            id: newId(),
            type: "semiellipse",
            start: Math.PI / 2,
            end: Math.PI * 1.5,
          },
        );
      } else if (sh.type === "semicircle" || sh.type === "semiellipse") {
        const start = sh.start ?? -Math.PI / 2;
        const end = sh.end ?? Math.PI / 2;
        const middle = start + (end - start) / 2;
        this.shapes = this.shapes.filter((item) => item.id !== sh.id);
        this.shapes.push(
          { ...base, id: newId(), start, end: middle },
          { ...base, id: newId(), start: middle, end },
        );
      } else if (sh.type === "rect") {
        this.shapes = this.shapes.filter((item) => item.id !== sh.id);
        this.shapes.push(
          { ...base, id: newId(), w: sh.w / 2 },
          { ...base, id: newId(), x: sh.x + sh.w / 2, w: sh.w / 2 },
        );
      } else if (sh.points?.length >= 4) {
        const bounds = shapeBounds(sh);
        const mid = (bounds.minX + bounds.maxX) / 2;
        const left = sh.points.filter(([x]) => x <= mid);
        const right = sh.points.filter(([x]) => x >= mid);
        if (left.length >= 2 && right.length >= 2) {
          this.shapes = this.shapes.filter((item) => item.id !== sh.id);
          this.shapes.push(
            { ...base, id: newId(), points: left, closed: false },
            { ...base, id: newId(), points: right, closed: false },
          );
        }
      }
      this.selectedId = this.shapes.at(-1)?.id || null;
      this._commit();
    },

    // --- Eraser: cuts real holes/gaps into shapes, no matter the type ---
    eraseAt(x, y) {
      const radius = Math.max(0.2, this.eraserSize / 8);
      this.shapes = eraseAt(this.shapes, x, y, radius, newId);
      if (this.selectedId && !this.shapes.find((s) => s.id === this.selectedId))
        this.selectedId = null;
      this.dirty = true;
    },
    eraseAlong(x1, y1, x2, y2) {
      const radius = Math.max(0.2, this.eraserSize / 10);
      this.shapes = eraseAlong(this.shapes, x1, y1, x2, y2, radius, newId);
      if (this.selectedId && !this.shapes.find((s) => s.id === this.selectedId))
        this.selectedId = null;
      this.dirty = true;
    },
    commitErase() {
      this._commit();
    },

    // --- Turn any rect/circle/line into a freely editable point-by-point
    // path, e.g. so a square's corner can be dragged round or a shape can
    // be reshaped however the user likes. ---
    convertToPath(id) {
      const idx = this.shapes.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const sh = this.shapes[idx];
      if (sh.type === "path") return;
      const { points, closed } = shapeToPoints(sh);
      this.shapes[idx] = {
        id: sh.id,
        layer: sh.layer,
        type: "path",
        points,
        closed,
      };
      this._commit();
    },
    addPathVertex(id, afterIndex, point) {
      const sh = this.shapes.find((s) => s.id === id);
      if (!sh || !sh.points) return;
      sh.points.splice(afterIndex + 1, 0, point);
      this._commit();
    },
    removePathVertex(id, index) {
      const sh = this.shapes.find((s) => s.id === id);
      if (!sh || !sh.points) return;
      const minPoints = sh.closed ? 3 : 2;
      if (sh.points.length <= minPoints) return;
      sh.points.splice(index, 1);
      this._commit();
    },

    // --- History (undo/redo) ---
    _resetHistory() {
      this.history = [JSON.stringify(this.shapes)];
      this.historyIndex = 0;
    },
    _commit() {
      this.dirty = true;
      if (this._suspendHistory) return;
      const snapshot = JSON.stringify(this.shapes);
      if (this.history[this.historyIndex] === snapshot) return;
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(snapshot);
      if (this.history.length > MAX_HISTORY) this.history.shift();
      this.historyIndex = this.history.length - 1;
    },
    undo() {
      if (!this.canUndo) return;
      this.historyIndex--;
      this._suspendHistory = true;
      this.shapes = JSON.parse(this.history[this.historyIndex]);
      this._suspendHistory = false;
      this.dirty = true;
      if (this.selectedId && !this.shapes.find((s) => s.id === this.selectedId))
        this.selectedId = null;
    },
    redo() {
      if (!this.canRedo) return;
      this.historyIndex++;
      this._suspendHistory = true;
      this.shapes = JSON.parse(this.history[this.historyIndex]);
      this._suspendHistory = false;
      this.dirty = true;
    },

    zoomFit(viewportW, viewportH) {
      if (this.shapes.length === 0) {
        this.scale = 4;
        this.originX = 60;
        this.originY = 60;
        return;
      }
      let minX = 1e9,
        minY = 1e9,
        maxX = -1e9,
        maxY = -1e9;
      this.shapes.forEach((sh) => {
        getHandles(sh).forEach((h) => {
          minX = Math.min(minX, h.x);
          maxX = Math.max(maxX, h.x);
          minY = Math.min(minY, h.y);
          maxY = Math.max(maxY, h.y);
        });
        if (sh.type === "circle") {
          minX = Math.min(minX, sh.cx - sh.r);
          maxX = Math.max(maxX, sh.cx + sh.r);
          minY = Math.min(minY, sh.cy - sh.r);
          maxY = Math.max(maxY, sh.cy + sh.r);
        }
      });
      const pad = 40;
      const sx = (viewportW - pad * 2) / (maxX - minX || 1);
      const sy = (viewportH - pad * 2) / (maxY - minY || 1);
      this.scale = Math.max(0.002, Math.min(200, Math.min(sx, sy)));
      this.originX = pad - minX * this.scale;
      this.originY = pad - minY * this.scale;
    },
  },
});
