<template>
  <div
    ref="wrap"
    class="relative flex-1 bg-[#141516] overflow-hidden"
    :class="cursorClass">
    <canvas
      ref="cv"
      @mousedown="onDown"
      @mousemove="onMove"
      @mouseup="onUp"
      @mouseleave="onUp"
      @dblclick="onDblClick"
      @wheel.prevent="onWheel"></canvas>
    <div
      class="absolute bottom-2.5 left-2.5 text-[11px] text-text2 font-mono bg-panel/85 px-2 py-1 rounded-md pointer-events-none">
      X: {{ fmt(mouseWorld.x) }} mm &nbsp; Y: {{ fmt(mouseWorld.y) }} mm
    </div>
    <div
      class="absolute bottom-2.5 right-2.5 text-[11px] text-text2 font-mono bg-panel/85 px-2 py-1 rounded-md flex items-center gap-2">
      <button
        class="hover:text-white"
        title="Kichraytirish"
        @click="zoomBy(0.85)">
        −
      </button>
      {{ Math.round((store.scale / 4) * 100) }}%
      <button
        class="hover:text-white"
        title="Kattalashtirish"
        @click="zoomBy(1.15)">
        +
      </button>
    </div>
    <div
      class="absolute top-2.5 left-1/2 -translate-x-1/2 text-[11px] text-text2 bg-panel/85 px-3 py-1.5 rounded-md pointer-events-none hidden md:block">
      {{ hint }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useCanvasStore } from "../stores/canvas";
import {
  LAYER_COLOR,
  fmt,
  getHandles,
  distToSeg,
  shapeBounds,
  moveShape,
  resizeShapeHandle,
  cloneShape,
  pointInPolygon,
  regularPolygonPoints,
  presetPoints,
  isPointsType,
  shapeCenter,
  rotateShape,
} from "../utils/geometry";
import { computeGuides } from "../utils/guides";

const store = useCanvasStore();
const wrap = ref(null);
const cv = ref(null);
let ctx = null;
let drawing = null;
let panning = null;
let erasing = null; // { lastX, lastY } while erasing mouse button is held
let dragState = null; // { mode: 'move'|'resize', id, handleIndex, orig, startWorld }
let activeGuides = { guides: [], gaps: [] };
let hoverHandle = false;
const mouseWorld = ref({ x: 0, y: 0 });

const cursorClass = computed(() => {
  if (store.tool === "pan" || panning) return "cursor-grab";
  if (store.tool === "eraser") return "cursor-none";
  if (store.tool === "select")
    return hoverHandle
      ? "cursor-nwse-resize"
      : dragState?.mode === "move"
        ? "cursor-grabbing"
        : "cursor-default";
  return "cursor-crosshair";
});

const hint = computed(() => {
  if (store.tool === "select")
    return "Bosing va torting: siljitish • Burchak nuqtalari: o'lchamini o'zgartirish • Alt+bosish: nuqtani o'chirish • 2 marta bosish: nuqta qo'shish";
  if (store.tool === "polyline")
    return "Nuqtalarni bosib chizing • Enter yoki 2 marta bosish: tugatish";
  if (store.tool === "polygon")
    return "Markazni bosing, keyin tortib o'lchamini belgilang";
  if (store.tool === "eraser")
    return "Bosib torting: chizilgan yo'l bo'ylab masofani o'chirish";
  return "Bosib torting, keyin qo'yib yuboring";
});

function worldToScreen(x, y) {
  return {
    x: store.originX + x * store.scale,
    y: store.originY + y * store.scale,
  };
}
function screenToWorld(x, y) {
  return {
    x: (x - store.originX) / store.scale,
    y: (y - store.originY) / store.scale,
  };
}

function resize() {
  const r = wrap.value.getBoundingClientRect();
  cv.value.width = r.width * devicePixelRatio;
  cv.value.height = r.height * devicePixelRatio;
  cv.value.style.width = r.width + "px";
  cv.value.style.height = r.height + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  render();
}

function getMousePos(e) {
  const r = cv.value.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function drawGrid() {
  const r = wrap.value.getBoundingClientRect();
  let step = 10;
  if (store.scale < 2) step = 50;
  else if (store.scale < 5) step = 10;
  else if (store.scale < 12) step = 5;
  else step = 1;
  const tl = screenToWorld(0, 0);
  const br = screenToWorld(r.width, r.height);
  const startX = Math.floor(tl.x / step) * step;
  const startY = Math.floor(tl.y / step) * step;
  for (let x = startX; x <= br.x; x += step) {
    const major = Math.round(x / step) % 10 === 0;
    ctx.strokeStyle = major ? "#3a3d41" : "#26282b";
    const p = worldToScreen(x, 0);
    ctx.beginPath();
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, r.height);
    ctx.stroke();
  }
  for (let y = startY; y <= br.y; y += step) {
    const major = Math.round(y / step) % 10 === 0;
    ctx.strokeStyle = major ? "#3a3d41" : "#26282b";
    const p = worldToScreen(0, y);
    ctx.beginPath();
    ctx.moveTo(0, p.y);
    ctx.lineTo(r.width, p.y);
    ctx.stroke();
  }
  const o = worldToScreen(0, 0);
  ctx.strokeStyle = "#55585c";
  ctx.beginPath();
  ctx.moveTo(o.x, 0);
  ctx.lineTo(o.x, r.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, o.y);
  ctx.lineTo(r.width, o.y);
  ctx.stroke();
}

function shapeColor(sh) {
  return LAYER_COLOR[sh.layer] || "#ccc";
}

function getRotateHandle(sh) {
  const center = shapeCenter(sh);
  const bounds = shapeBounds(sh);
  const radius = Math.max(
    15,
    (Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2) * 1.2,
  );
  return { x: center.x, y: center.y - radius };
}

function drawShape(sh, selected) {
  ctx.strokeStyle = shapeColor(sh);
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.beginPath();
  if (sh.type === "line") {
    const a = worldToScreen(sh.x1, sh.y1),
      b = worldToScreen(sh.x2, sh.y2);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  } else if (sh.type === "rect") {
    const a = worldToScreen(sh.x, sh.y);
    ctx.rect(a.x, a.y, sh.w * store.scale, sh.h * store.scale);
  } else if (sh.type === "circle") {
    const c = worldToScreen(sh.cx, sh.cy);
    ctx.arc(c.x, c.y, sh.r * store.scale, 0, Math.PI * 2);
  } else if (sh.type === "ellipse") {
    const c = worldToScreen(sh.cx, sh.cy);
    ctx.ellipse(
      c.x,
      c.y,
      Math.max(1, sh.rx * store.scale),
      Math.max(1, sh.ry * store.scale),
      0,
      0,
      Math.PI * 2,
    );
  } else if (sh.type === "semicircle") {
    const c = worldToScreen(sh.cx, sh.cy);
    const start = sh.start ?? -Math.PI / 2;
    const end = sh.end ?? Math.PI / 2;
    ctx.arc(c.x, c.y, Math.max(1, sh.r * store.scale), start, end);
  } else if (sh.type === "semiellipse") {
    const c = worldToScreen(sh.cx, sh.cy);
    const start = sh.start ?? -Math.PI / 2;
    const end = sh.end ?? Math.PI / 2;
    ctx.ellipse(
      c.x,
      c.y,
      Math.max(1, sh.rx * store.scale),
      Math.max(1, sh.ry * store.scale),
      0,
      start,
      end,
    );
  } else if (isPointsType(sh)) {
    sh.points.forEach((p, i) => {
      const s = worldToScreen(p[0], p[1]);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    if (sh.closed) ctx.closePath();
  }
  ctx.stroke();
  if (selected) {
    const center = worldToScreen(shapeCenter(sh).x, shapeCenter(sh).y);
    const handle = worldToScreen(getRotateHandle(sh).x, getRotateHandle(sh).y);
    ctx.strokeStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(handle.x, handle.y);
    ctx.stroke();
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 5, 0, Math.PI * 2);
    ctx.fill();
    getHandles(sh).forEach((h) => {
      const s = worldToScreen(h.x, h.y);
      ctx.fillStyle = h.resize ? "#e07a3f" : shapeColor(sh);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#141516";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
}

function drawDimText(x, y, text, angle) {
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.font = "11px ui-monospace, monospace";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(20,21,22,.85)";
  ctx.fillRect(-w / 2 - 3, -14, w + 6, 15);
  ctx.fillStyle = "#c9c9c5";
  ctx.textAlign = "center";
  ctx.fillText(text, 0, -3);
  ctx.restore();
}

function drawDimensions(sh) {
  if (sh.type === "line") {
    const len = Math.hypot(sh.x2 - sh.x1, sh.y2 - sh.y1);
    const mx = (sh.x1 + sh.x2) / 2,
      my = (sh.y1 + sh.y2) / 2;
    const s = worldToScreen(mx, my);
    const ang = Math.atan2(sh.y2 - sh.y1, sh.x2 - sh.x1);
    drawDimText(s.x, s.y, fmt(len) + " mm", ang);
  } else if (sh.type === "rect") {
    const top = worldToScreen(sh.x + sh.w / 2, sh.y);
    const left = worldToScreen(sh.x, sh.y + sh.h / 2);
    drawDimText(top.x, top.y - 4, fmt(sh.w) + " mm", 0);
    drawDimText(left.x + 4, left.y, fmt(sh.h) + " mm", -Math.PI / 2);
  } else if (sh.type === "circle") {
    const s = worldToScreen(sh.cx, sh.cy - sh.r);
    drawDimText(s.x, s.y - 4, "r=" + fmt(sh.r) + " mm", 0);
  } else if (sh.type === "ellipse") {
    const s = worldToScreen(sh.cx, sh.cy - sh.ry);
    drawDimText(
      s.x,
      s.y - 4,
      "rx=" + fmt(sh.rx) + ", ry=" + fmt(sh.ry) + " mm",
      0,
    );
  } else if (sh.type === "semicircle") {
    const s = worldToScreen(sh.cx, sh.cy - sh.r);
    drawDimText(s.x, s.y - 4, "r=" + fmt(sh.r) + " mm", 0);
  } else if (isPointsType(sh)) {
    for (let i = 0; i < sh.points.length - 1; i++) {
      const [x1, y1] = sh.points[i],
        [x2, y2] = sh.points[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const mx = (x1 + x2) / 2,
        my = (y1 + y2) / 2;
      const s = worldToScreen(mx, my);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      drawDimText(s.x, s.y, fmt(len) + "mm", ang);
    }
  }
}

function drawPreview() {
  ctx.strokeStyle = LAYER_COLOR[store.currentLayer];
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  if (drawing.type === "line") {
    const a = worldToScreen(drawing.x1, drawing.y1),
      b = worldToScreen(mouseWorld.value.x, mouseWorld.value.y);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    const len = Math.hypot(
      mouseWorld.value.x - drawing.x1,
      mouseWorld.value.y - drawing.y1,
    );
    drawDimText((a.x + b.x) / 2, (a.y + b.y) / 2, fmt(len) + " mm", 0);
  } else if (drawing.type === "rect") {
    const a = worldToScreen(drawing.x1, drawing.y1);
    const w = (mouseWorld.value.x - drawing.x1) * store.scale,
      h = (mouseWorld.value.y - drawing.y1) * store.scale;
    ctx.rect(a.x, a.y, w, h);
    ctx.stroke();
    drawDimText(
      a.x + w / 2,
      a.y - 6,
      fmt(Math.abs(mouseWorld.value.x - drawing.x1)) +
        " x " +
        fmt(Math.abs(mouseWorld.value.y - drawing.y1)) +
        " mm",
      0,
    );
  } else if (drawing.type === "circle") {
    const c = worldToScreen(drawing.cx, drawing.cy);
    const rad =
      Math.hypot(
        mouseWorld.value.x - drawing.cx,
        mouseWorld.value.y - drawing.cy,
      ) * store.scale;
    ctx.arc(c.x, c.y, rad, 0, Math.PI * 2);
    ctx.stroke();
    drawDimText(c.x, c.y - rad - 8, "r=" + fmt(rad / store.scale) + " mm", 0);
  } else if (drawing.type === "ellipse") {
    const c = worldToScreen(drawing.cx, drawing.cy);
    const rx = Math.abs(mouseWorld.value.x - drawing.cx) * store.scale;
    const ry = Math.abs(mouseWorld.value.y - drawing.cy) * store.scale;
    ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawDimText(
      c.x,
      c.y - ry - 8,
      "rx=" + fmt(rx / store.scale) + ", ry=" + fmt(ry / store.scale) + " mm",
      0,
    );
  } else if (drawing.type === "semicircle") {
    const c = worldToScreen(drawing.cx, drawing.cy);
    const rad =
      Math.hypot(
        mouseWorld.value.x - drawing.cx,
        mouseWorld.value.y - drawing.cy,
      ) * store.scale;
    const start = drawing.start ?? -Math.PI / 2;
    const end = drawing.end ?? Math.PI / 2;
    ctx.arc(c.x, c.y, rad, start, end);
    ctx.stroke();
    drawDimText(c.x, c.y - rad - 8, "r=" + fmt(rad / store.scale) + " mm", 0);
  } else if (drawing.type === "polyline") {
    drawing.points.forEach((p, i) => {
      const s = worldToScreen(p[0], p[1]);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    const last = worldToScreen(mouseWorld.value.x, mouseWorld.value.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    const lp = drawing.points[drawing.points.length - 1];
    const len = Math.hypot(
      mouseWorld.value.x - lp[0],
      mouseWorld.value.y - lp[1],
    );
    drawDimText(last.x, last.y - 14, fmt(len) + " mm", 0);
  } else if (drawing.type === "polygon") {
    const rad = Math.hypot(
      mouseWorld.value.x - drawing.cx,
      mouseWorld.value.y - drawing.cy,
    );
    const pts = regularPolygonPoints(
      drawing.cx,
      drawing.cy,
      rad,
      store.polygonSides,
    );
    pts.forEach((p, i) => {
      const s = worldToScreen(p[0], p[1]);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.stroke();
    const c = worldToScreen(drawing.cx, drawing.cy);
    drawDimText(c.x, c.y - rad * store.scale - 8, "r=" + fmt(rad) + " mm", 0);
  } else if (drawing.type === "preset") {
    const rad = Math.hypot(
      mouseWorld.value.x - drawing.cx,
      mouseWorld.value.y - drawing.cy,
    );
    const pts = presetPoints(drawing.cx, drawing.cy, rad, drawing.preset);
    pts.forEach((p, i) => {
      const s = worldToScreen(p[0], p[1]);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawEraserCursor() {
  if (!erasing) {
    const c = worldToScreen(mouseWorld.value.x, mouseWorld.value.y);
    ctx.save();
    ctx.strokeStyle = "#e07a3f";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(c.x - 6, c.y);
    ctx.lineTo(c.x + 6, c.y);
    ctx.moveTo(c.x, c.y - 6);
    ctx.lineTo(c.x, c.y + 6);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const a = worldToScreen(erasing.startX, erasing.startY);
  const b = worldToScreen(mouseWorld.value.x, mouseWorld.value.y);
  ctx.save();
  ctx.strokeStyle = "#e07a3f";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawGuides() {
  const r = wrap.value.getBoundingClientRect();
  ctx.save();
  ctx.strokeStyle = "#e07a3f";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  activeGuides.guides.forEach((g) => {
    ctx.beginPath();
    if (g.axis === "v") {
      const p = worldToScreen(g.pos, 0);
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, r.height);
    } else {
      const p = worldToScreen(0, g.pos);
      ctx.moveTo(0, p.y);
      ctx.lineTo(r.width, p.y);
    }
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();

  activeGuides.gaps.forEach((g) => {
    ctx.save();
    ctx.strokeStyle = "#e07a3f";
    ctx.lineWidth = 1;
    let mx, my, text;
    if (g.side === "left" || g.side === "right") {
      const a = worldToScreen(g.x1, g.y),
        b = worldToScreen(g.x2, g.y);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      mx = (a.x + b.x) / 2;
      my = a.y;
      text = fmt(g.gap) + " mm";
    } else {
      const a = worldToScreen(g.x, g.y1),
        b = worldToScreen(g.x, g.y2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      mx = a.x;
      my = (a.y + b.y) / 2;
      text = fmt(g.gap) + " mm";
    }
    ctx.font = "10px ui-monospace, monospace";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = "#e07a3f";
    ctx.fillRect(mx - w / 2 - 3, my - 7, w + 6, 14);
    ctx.fillStyle = "#141516";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, mx, my + 1);
    ctx.restore();
  });
}

function render() {
  const r = wrap.value.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  if (store.gridOn) drawGrid();
  store.shapes.forEach((sh) => drawShape(sh, sh.id === store.selectedId));
  if (store.dimOn) store.shapes.forEach((sh) => drawDimensions(sh));
  if (drawing) drawPreview();
  if (dragState && (activeGuides.guides.length || activeGuides.gaps.length))
    drawGuides();
  if (store.tool === "eraser") drawEraserCursor();
}

function hitTest(px, py) {
  const w = screenToWorld(px, py);
  const tolMm = 5 / store.scale;
  for (let i = store.shapes.length - 1; i >= 0; i--) {
    const sh = store.shapes[i];
    if (sh.type === "rect") {
      if (
        w.x >= sh.x - tolMm &&
        w.x <= sh.x + sh.w + tolMm &&
        w.y >= sh.y - tolMm &&
        w.y <= sh.y + sh.h + tolMm
      )
        return sh;
    } else if (sh.type === "circle") {
      const d = Math.hypot(w.x - sh.cx, w.y - sh.cy);
      if (Math.abs(d - sh.r) < tolMm + 2 || d < sh.r) return sh;
    } else if (sh.type === "ellipse") {
      const dx = w.x - sh.cx;
      const dy = w.y - sh.cy;
      const inside = (dx * dx) / (sh.rx * sh.rx) + (dy * dy) / (sh.ry * sh.ry);
      if (
        inside <=
        1 + (tolMm * tolMm) / (Math.min(sh.rx, sh.ry) * Math.min(sh.rx, sh.ry))
      )
        return sh;
    } else if (sh.type === "semicircle") {
      const dx = w.x - sh.cx;
      const dy = w.y - sh.cy;
      const d = Math.hypot(dx, dy);
      const start = sh.start ?? -Math.PI / 2;
      const end = sh.end ?? Math.PI / 2;
      const ang = Math.atan2(dy, dx);
      const normalized = (ang - start + Math.PI * 2) % (Math.PI * 2);
      const span = (end - start + Math.PI * 2) % (Math.PI * 2);
      const insideArc = normalized <= span + 1e-6 || span >= Math.PI * 2 - 1e-6;
      if (d <= sh.r + tolMm && insideArc) return sh;
    } else if (sh.type === "semiellipse") {
      const dx = w.x - sh.cx;
      const dy = w.y - sh.cy;
      const d = Math.hypot(dx / sh.rx, dy / sh.ry);
      const start = sh.start ?? -Math.PI / 2;
      const end = sh.end ?? Math.PI / 2;
      const ang = Math.atan2(dy / sh.ry, dx / sh.rx);
      const normalized = (ang - start + Math.PI * 2) % (Math.PI * 2);
      const span = (end - start + Math.PI * 2) % (Math.PI * 2);
      if (d <= 1 + tolMm / Math.min(sh.rx, sh.ry) && normalized <= span + 1e-6)
        return sh;
    } else if (sh.type === "line") {
      if (distToSeg(w.x, w.y, sh.x1, sh.y1, sh.x2, sh.y2) < tolMm) return sh;
    } else if (isPointsType(sh)) {
      let hitEdge = false;
      for (let j = 0; j < sh.points.length - 1; j++) {
        if (
          distToSeg(
            w.x,
            w.y,
            sh.points[j][0],
            sh.points[j][1],
            sh.points[j + 1][0],
            sh.points[j + 1][1],
          ) < tolMm
        ) {
          hitEdge = true;
          break;
        }
      }
      if (!hitEdge && sh.closed && sh.points.length > 2) {
        const n = sh.points.length;
        if (
          distToSeg(
            w.x,
            w.y,
            sh.points[n - 1][0],
            sh.points[n - 1][1],
            sh.points[0][0],
            sh.points[0][1],
          ) < tolMm
        )
          hitEdge = true;
      }
      if (hitEdge) return sh;
      if (sh.closed && pointInPolygon(w.x, w.y, sh.points)) return sh;
    }
  }
  return null;
}

function hitHandle(px, py) {
  const sh = store.selectedShape;
  if (!sh) return null;
  const tolPx = 8;
  const handles = getHandles(sh);
  for (let i = 0; i < handles.length; i++) {
    const s = worldToScreen(handles[i].x, handles[i].y);
    if (Math.hypot(s.x - px, s.y - py) <= tolPx) return { index: i };
  }
  return null;
}

function hitRotateHandle(px, py) {
  const sh = store.selectedShape;
  if (!sh) return false;
  const h = worldToScreen(getRotateHandle(sh).x, getRotateHandle(sh).y);
  return Math.hypot(h.x - px, h.y - py) <= 10;
}

function hitPathVertex(px, py, sh) {
  if (!sh || !isPointsType(sh)) return null;
  const tolPx = 8;
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < sh.points.length; i++) {
    const p = worldToScreen(sh.points[i][0], sh.points[i][1]);
    const d = Math.hypot(p.x - px, p.y - py);
    if (d <= tolPx && d < bestDist) {
      bestDist = d;
      best = { index: i };
    }
  }
  return best;
}

function onDown(e) {
  const m = getMousePos(e);
  if (store.tool === "pan" || e.button === 1) {
    panning = { sx: m.x, sy: m.y, ox: store.originX, oy: store.originY };
    return;
  }
  const w = screenToWorld(m.x, m.y);
  const wx = store.snap(w.x),
    wy = store.snap(w.y);

  if (store.tool === "select") {
    const handle = hitHandle(m.x, m.y);
    if (
      handle &&
      store.selectedShape &&
      e.altKey &&
      isPointsType(store.selectedShape)
    ) {
      store.removePathVertex(store.selectedShape.id, handle.index);
      render();
      return;
    }
    if (handle && store.selectedShape) {
      dragState = {
        mode: "resize",
        id: store.selectedShape.id,
        handleIndex: handle.index,
        orig: cloneShape(store.selectedShape),
      };
      return;
    }
    if (hitRotateHandle(m.x, m.y) && store.selectedShape) {
      const center = shapeCenter(store.selectedShape);
      const ang = Math.atan2(w.y - center.y, w.x - center.x);
      dragState = {
        mode: "rotate",
        id: store.selectedShape.id,
        orig: cloneShape(store.selectedShape),
        center,
        startAngle: ang,
      };
      return;
    }
    const hit = hitTest(m.x, m.y);
    if (hit) {
      store.selectShape(hit.id);
      dragState = {
        mode: "move",
        id: hit.id,
        orig: cloneShape(hit),
        startWorld: w,
      };
    } else {
      store.selectShape(null);
      dragState = null;
    }
    render();
    return;
  }
  if (store.tool === "eraser") {
    erasing = { startX: wx, startY: wy, lastX: wx, lastY: wy };
    render();
    return;
  }
  if (store.tool === "polygon") {
    if (!drawing) drawing = { type: "polygon", cx: wx, cy: wy };
    else {
      const rad = store.snap(Math.hypot(wx - drawing.cx, wy - drawing.cy));
      const pts = regularPolygonPoints(
        drawing.cx,
        drawing.cy,
        rad,
        store.polygonSides,
      );
      store.addShape({
        type: "path",
        layer: store.currentLayer,
        points: pts,
        closed: true,
      });
      drawing = null;
      finishShapeAndSelect();
    }
    render();
    return;
  }
  if (store.tool === "preset") {
    if (!drawing)
      drawing = { type: "preset", cx: wx, cy: wy, preset: store.presetShape };
    else {
      const rad = Math.max(
        0.1,
        store.snap(Math.hypot(wx - drawing.cx, wy - drawing.cy)),
      );
      store.addShape({
        type: "path",
        layer: store.currentLayer,
        points: presetPoints(drawing.cx, drawing.cy, rad, drawing.preset),
        closed: true,
        preset: drawing.preset,
      });
      drawing = null;
      finishShapeAndSelect();
    }
    render();
    return;
  }
  if (store.tool === "line") {
    if (!drawing) drawing = { type: "line", x1: wx, y1: wy };
    else {
      store.addShape({
        type: "line",
        layer: store.currentLayer,
        x1: drawing.x1,
        y1: drawing.y1,
        x2: wx,
        y2: wy,
      });
      drawing = null;
      finishShapeAndSelect();
    }
  } else if (store.tool === "rect") {
    if (!drawing) drawing = { type: "rect", x1: wx, y1: wy };
    else {
      const x = Math.min(drawing.x1, wx),
        y = Math.min(drawing.y1, wy);
      const w2 = Math.abs(wx - drawing.x1),
        h2 = Math.abs(wy - drawing.y1);
      store.addShape({
        type: "rect",
        layer: store.currentLayer,
        x,
        y,
        w: w2,
        h: h2,
      });
      drawing = null;
      finishShapeAndSelect();
    }
  } else if (store.tool === "circle") {
    if (!drawing) drawing = { type: "circle", cx: wx, cy: wy };
    else {
      const rad = Math.hypot(wx - drawing.cx, wy - drawing.cy);
      store.addShape({
        type: "circle",
        layer: store.currentLayer,
        cx: drawing.cx,
        cy: drawing.cy,
        r: store.snap(rad),
      });
      drawing = null;
      finishShapeAndSelect();
    }
  } else if (store.tool === "ellipse") {
    if (!drawing) drawing = { type: "ellipse", cx: wx, cy: wy };
    else {
      const rx = Math.max(0.1, Math.abs(wx - drawing.cx));
      const ry = Math.max(0.1, Math.abs(wy - drawing.cy));
      store.addShape({
        type: "ellipse",
        layer: store.currentLayer,
        cx: drawing.cx,
        cy: drawing.cy,
        rx: store.snap(rx),
        ry: store.snap(ry),
      });
      drawing = null;
      finishShapeAndSelect();
    }
  } else if (store.tool === "semicircle") {
    if (!drawing)
      drawing = {
        type: "semicircle",
        cx: wx,
        cy: wy,
        start: -Math.PI / 2,
        end: Math.PI / 2,
      };
    else {
      const rad = Math.hypot(wx - drawing.cx, wy - drawing.cy);
      store.addShape({
        type: "semicircle",
        layer: store.currentLayer,
        cx: drawing.cx,
        cy: drawing.cy,
        r: store.snap(rad),
        start: drawing.start,
        end: drawing.end,
      });
      drawing = null;
      finishShapeAndSelect();
    }
  } else if (store.tool === "polyline") {
    if (!drawing) drawing = { type: "polyline", points: [[wx, wy]] };
    else drawing.points.push([wx, wy]);
  }
  render();
}

// After finishing a shape, jump straight into the select tool with the new
// shape selected so it can immediately be grabbed and dragged — otherwise
// the user stays in "draw" mode and clicking on the shape just starts a
// brand new one instead of moving it.
function finishShapeAndSelect() {
  store.setTool("select");
}

function onDblClick(e) {
  if (store.tool === "polyline" && drawing && drawing.points.length >= 2) {
    store.addShape({
      type: "polyline",
      layer: store.currentLayer,
      points: drawing.points,
      closed: false,
    });
    drawing = null;
    finishShapeAndSelect();
    render();
    return;
  }
  // Double-click an edge of a selected path/polyline to add a vertex there,
  // so a shape can be reshaped with as much detail as needed.
  if (
    store.tool === "select" &&
    store.selectedShape &&
    isPointsType(store.selectedShape)
  ) {
    const sh = store.selectedShape;
    const m = getMousePos(e);
    const w = screenToWorld(m.x, m.y);
    const tolMm = 8 / store.scale;
    const n = sh.points.length;
    const segCount = sh.closed ? n : n - 1;
    let bestIdx = -1,
      bestDist = Infinity;
    for (let i = 0; i < segCount; i++) {
      const a = sh.points[i],
        b = sh.points[(i + 1) % n];
      const d = distToSeg(w.x, w.y, a[0], a[1], b[0], b[1]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1 && bestDist < tolMm) {
      store.addPathVertex(sh.id, bestIdx, [store.snap(w.x), store.snap(w.y)]);
      render();
    }
  }
}

function otherShapesFor(id) {
  return store.shapes.filter((s) => s.id !== id).map((s) => ({ shape: s }));
}

function onMove(e) {
  const m = getMousePos(e);
  if (panning) {
    store.originX = panning.ox + (m.x - panning.sx);
    store.originY = panning.oy + (m.y - panning.sy);
    render();
    return;
  }

  const w = screenToWorld(m.x, m.y);
  mouseWorld.value = { x: store.snap(w.x), y: store.snap(w.y) };

  if (erasing) {
    store.eraseAlong(erasing.lastX, erasing.lastY, w.x, w.y);
    erasing.lastX = w.x;
    erasing.lastY = w.y;
    render();
    return;
  }

  if (dragState) {
    const sh = store.shapes.find((s) => s.id === dragState.id);
    if (!sh) {
      dragState = null;
      return;
    }

    if (dragState.mode === "move") {
      const rawDx = w.x - dragState.startWorld.x;
      const rawDy = w.y - dragState.startWorld.y;
      const origBounds = shapeBounds(dragState.orig);
      let tentativeDx = store.snapOn
        ? store.snap(origBounds.minX + rawDx) - origBounds.minX
        : rawDx;
      let tentativeDy = store.snapOn
        ? store.snap(origBounds.minY + rawDy) - origBounds.minY
        : rawDy;

      let guideResult = { dx: 0, dy: 0, guides: [], gaps: [] };
      if (store.guidesOn) {
        const tentativeBounds = {
          minX: origBounds.minX + tentativeDx,
          maxX: origBounds.maxX + tentativeDx,
          minY: origBounds.minY + tentativeDy,
          maxY: origBounds.maxY + tentativeDy,
        };
        guideResult = computeGuides(
          tentativeBounds,
          otherShapesFor(dragState.id),
          store.scale,
        );
      }
      const finalDx = tentativeDx + guideResult.dx;
      const finalDy = tentativeDy + guideResult.dy;
      activeGuides = { guides: guideResult.guides, gaps: guideResult.gaps };

      const fresh = cloneShape(dragState.orig);
      fresh.id = sh.id;
      moveShape(fresh, finalDx, finalDy);
      Object.assign(sh, fresh);
      store.dirty = true;
    } else if (dragState.mode === "resize") {
      const fresh = cloneShape(dragState.orig);
      fresh.id = sh.id;
      resizeShapeHandle(
        fresh,
        dragState.handleIndex,
        store.snap(w.x),
        store.snap(w.y),
      );
      Object.assign(sh, fresh);
      store.dirty = true;
    } else if (dragState.mode === "rotate") {
      const center = dragState.center;
      const angle =
        Math.atan2(w.y - center.y, w.x - center.x) - dragState.startAngle;
      const rotated = rotateShape(dragState.orig, angle, center.x, center.y);
      rotated.id = sh.id;
      Object.assign(sh, rotated);
      store.dirty = true;
    } else if (dragState.mode === "path-edit" && sh.points) {
      const fresh = cloneShape(dragState.orig);
      fresh.id = sh.id;
      fresh.points[dragState.pointIndex] = [store.snap(w.x), store.snap(w.y)];
      Object.assign(sh, fresh);
      store.dirty = true;
    }
    render();
    return;
  }

  hoverHandle = store.tool === "select" && !!hitHandle(m.x, m.y);
  if (drawing || store.tool === "eraser") render();
}

function onUp() {
  panning = null;
  if (erasing) {
    erasing = null;
    store.commitErase();
    render();
  }
  if (dragState) {
    store.commitDrag();
    dragState = null;
    activeGuides = { guides: [], gaps: [] };
    render();
  }
}

function zoomBy(factor) {
  const r = wrap.value.getBoundingClientRect();
  const cx = r.width / 2,
    cy = r.height / 2;
  const before = screenToWorld(cx, cy);
  store.scale = Math.max(0.5, Math.min(60, store.scale * factor));
  const after = worldToScreen(before.x, before.y);
  store.originX += cx - after.x;
  store.originY += cy - after.y;
  render();
}

function onWheel(e) {
  const m = getMousePos(e);
  const before = screenToWorld(m.x, m.y);
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  store.scale = Math.max(0.5, Math.min(60, store.scale * factor));
  const after = worldToScreen(before.x, before.y);
  store.originX += m.x - after.x;
  store.originY += m.y - after.y;
  render();
}

function onKeydown(e) {
  if (e.target.tagName === "INPUT") return;
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) store.redo();
    else store.undo();
    return;
  }
  if (ctrl && e.key.toLowerCase() === "y") {
    e.preventDefault();
    store.redo();
    return;
  }
  if (ctrl && e.key.toLowerCase() === "d") {
    e.preventDefault();
    store.duplicateSelected();
    return;
  }
  if (ctrl && e.key.toLowerCase() === "c") {
    e.preventDefault();
    store.copySelected();
    return;
  }
  if (ctrl && e.key.toLowerCase() === "v") {
    e.preventDefault();
    store.pasteClipboard();
    return;
  }

  if (e.key === "Escape") {
    drawing = null;
    render();
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (store.selectedId) store.deleteShape(store.selectedId);
    render();
  }
  if (
    e.key === "Enter" &&
    drawing &&
    drawing.type === "polyline" &&
    drawing.points.length >= 2
  ) {
    store.addShape({
      type: "polyline",
      layer: store.currentLayer,
      points: drawing.points,
      closed: false,
    });
    drawing = null;
    render();
  }

  if (
    store.selectedId &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
  ) {
    e.preventDefault();
    const step = e.shiftKey ? (store.snapMm || 1) * 10 : store.snapMm || 1;
    const map = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const [dx, dy] = map[e.key];
    store.nudgeSelected(dx, dy);
    return;
  }

  const map = {
    v: "select",
    l: "line",
    r: "rect",
    c: "circle",
    p: "polyline",
    g: "polygon",
    e: "eraser",
  };
  if (map[e.key]) {
    store.setTool(map[e.key]);
    drawing = null;
  }
}

defineExpose({
  zoomFitViewport: () => {
    const r = wrap.value.getBoundingClientRect();
    store.zoomFit(r.width, r.height);
    render();
  },
});

onMounted(() => {
  ctx = cv.value.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", resize);
  window.removeEventListener("keydown", onKeydown);
});

watch(
  () => [
    store.shapes,
    store.selectedId,
    store.gridOn,
    store.dimOn,
    store.scale,
    store.originX,
    store.originY,
  ],
  () => {
    render();
  },
  { deep: true },
);
</script>
