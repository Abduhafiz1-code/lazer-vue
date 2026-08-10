<template>
  <div ref="wrap" class="relative flex-1 bg-[#141516] overflow-hidden" :class="cursorClass">
    <canvas ref="cv" @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp" @dblclick="onDblClick" @wheel.prevent="onWheel"></canvas>
    <div class="absolute bottom-2.5 left-2.5 text-[11px] text-text2 font-mono bg-panel/85 px-2 py-1 rounded-md pointer-events-none">
      X: {{ fmt(mouseWorld.x) }} mm &nbsp; Y: {{ fmt(mouseWorld.y) }} mm
    </div>
    <div class="absolute bottom-2.5 right-2.5 text-[11px] text-text2 font-mono bg-panel/85 px-2 py-1 rounded-md">
      {{ Math.round(store.scale / 4 * 100) }}%
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import { LAYER_COLOR, fmt, getHandles, distToSeg } from '../utils/geometry'

const store = useCanvasStore()
const wrap = ref(null)
const cv = ref(null)
let ctx = null
let drawing = null
let panning = null
const mouseWorld = ref({ x: 0, y: 0 })

const cursorClass = computed(() => {
  if (store.tool === 'pan') return 'cursor-grab'
  if (store.tool === 'select') return 'cursor-default'
  return 'cursor-crosshair'
})

function worldToScreen(x, y) { return { x: store.originX + x * store.scale, y: store.originY + y * store.scale } }
function screenToWorld(x, y) { return { x: (x - store.originX) / store.scale, y: (y - store.originY) / store.scale } }

function resize() {
  const r = wrap.value.getBoundingClientRect()
  cv.value.width = r.width * devicePixelRatio
  cv.value.height = r.height * devicePixelRatio
  cv.value.style.width = r.width + 'px'
  cv.value.style.height = r.height + 'px'
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  render()
}

function getMousePos(e) {
  const r = cv.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function drawGrid() {
  const r = wrap.value.getBoundingClientRect()
  let step = 10
  if (store.scale < 2) step = 50
  else if (store.scale < 5) step = 10
  else if (store.scale < 12) step = 5
  else step = 1
  const tl = screenToWorld(0, 0)
  const br = screenToWorld(r.width, r.height)
  const startX = Math.floor(tl.x / step) * step
  const startY = Math.floor(tl.y / step) * step
  for (let x = startX; x <= br.x; x += step) {
    const major = Math.round(x / step) % 10 === 0
    ctx.strokeStyle = major ? '#3a3d41' : '#26282b'
    const p = worldToScreen(x, 0)
    ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, r.height); ctx.stroke()
  }
  for (let y = startY; y <= br.y; y += step) {
    const major = Math.round(y / step) % 10 === 0
    ctx.strokeStyle = major ? '#3a3d41' : '#26282b'
    const p = worldToScreen(0, y)
    ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(r.width, p.y); ctx.stroke()
  }
  const o = worldToScreen(0, 0)
  ctx.strokeStyle = '#55585c'
  ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x, r.height); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(r.width, o.y); ctx.stroke()
}

function shapeColor(sh) { return LAYER_COLOR[sh.layer] || '#ccc' }

function drawShape(sh, selected) {
  ctx.strokeStyle = shapeColor(sh)
  ctx.lineWidth = selected ? 2.5 : 1.5
  ctx.beginPath()
  if (sh.type === 'line') {
    const a = worldToScreen(sh.x1, sh.y1), b = worldToScreen(sh.x2, sh.y2)
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
  } else if (sh.type === 'rect') {
    const a = worldToScreen(sh.x, sh.y)
    ctx.rect(a.x, a.y, sh.w * store.scale, sh.h * store.scale)
  } else if (sh.type === 'circle') {
    const c = worldToScreen(sh.cx, sh.cy)
    ctx.arc(c.x, c.y, sh.r * store.scale, 0, Math.PI * 2)
  } else if (sh.type === 'polyline') {
    sh.points.forEach((p, i) => {
      const s = worldToScreen(p[0], p[1])
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y)
    })
    if (sh.closed) ctx.closePath()
  }
  ctx.stroke()
  if (selected) {
    ctx.fillStyle = shapeColor(sh)
    getHandles(sh).forEach(h => {
      const s = worldToScreen(h.x, h.y)
      ctx.fillRect(s.x - 3, s.y - 3, 6, 6)
    })
  }
}

function drawDimText(x, y, text, angle) {
  ctx.save()
  ctx.translate(x, y)
  if (angle) ctx.rotate(angle)
  ctx.font = '11px ui-monospace, monospace'
  const w = ctx.measureText(text).width
  ctx.fillStyle = 'rgba(20,21,22,.85)'
  ctx.fillRect(-w / 2 - 3, -14, w + 6, 15)
  ctx.fillStyle = '#c9c9c5'
  ctx.textAlign = 'center'
  ctx.fillText(text, 0, -3)
  ctx.restore()
}

function drawDimensions(sh) {
  if (sh.type === 'line') {
    const len = Math.hypot(sh.x2 - sh.x1, sh.y2 - sh.y1)
    const mx = (sh.x1 + sh.x2) / 2, my = (sh.y1 + sh.y2) / 2
    const s = worldToScreen(mx, my)
    const ang = Math.atan2(sh.y2 - sh.y1, sh.x2 - sh.x1)
    drawDimText(s.x, s.y, fmt(len) + ' mm', ang)
  } else if (sh.type === 'rect') {
    const top = worldToScreen(sh.x + sh.w / 2, sh.y)
    const left = worldToScreen(sh.x, sh.y + sh.h / 2)
    drawDimText(top.x, top.y - 4, fmt(sh.w) + ' mm', 0)
    drawDimText(left.x + 4, left.y, fmt(sh.h) + ' mm', -Math.PI / 2)
  } else if (sh.type === 'circle') {
    const s = worldToScreen(sh.cx, sh.cy - sh.r)
    drawDimText(s.x, s.y - 4, 'r=' + fmt(sh.r) + ' mm', 0)
  } else if (sh.type === 'polyline') {
    for (let i = 0; i < sh.points.length - 1; i++) {
      const [x1, y1] = sh.points[i], [x2, y2] = sh.points[i + 1]
      const len = Math.hypot(x2 - x1, y2 - y1)
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const s = worldToScreen(mx, my)
      const ang = Math.atan2(y2 - y1, x2 - x1)
      drawDimText(s.x, s.y, fmt(len) + 'mm', ang)
    }
  }
}

function drawPreview() {
  ctx.strokeStyle = LAYER_COLOR[store.currentLayer]
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  if (drawing.type === 'line') {
    const a = worldToScreen(drawing.x1, drawing.y1), b = worldToScreen(mouseWorld.value.x, mouseWorld.value.y)
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    const len = Math.hypot(mouseWorld.value.x - drawing.x1, mouseWorld.value.y - drawing.y1)
    drawDimText((a.x + b.x) / 2, (a.y + b.y) / 2, fmt(len) + ' mm', 0)
  } else if (drawing.type === 'rect') {
    const a = worldToScreen(drawing.x1, drawing.y1)
    const w = (mouseWorld.value.x - drawing.x1) * store.scale, h = (mouseWorld.value.y - drawing.y1) * store.scale
    ctx.rect(a.x, a.y, w, h); ctx.stroke()
    drawDimText(a.x + w / 2, a.y - 6, fmt(Math.abs(mouseWorld.value.x - drawing.x1)) + ' x ' + fmt(Math.abs(mouseWorld.value.y - drawing.y1)) + ' mm', 0)
  } else if (drawing.type === 'circle') {
    const c = worldToScreen(drawing.cx, drawing.cy)
    const rad = Math.hypot(mouseWorld.value.x - drawing.cx, mouseWorld.value.y - drawing.cy) * store.scale
    ctx.arc(c.x, c.y, rad, 0, Math.PI * 2); ctx.stroke()
    drawDimText(c.x, c.y - rad - 8, 'r=' + fmt(rad / store.scale) + ' mm', 0)
  } else if (drawing.type === 'polyline') {
    drawing.points.forEach((p, i) => {
      const s = worldToScreen(p[0], p[1])
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y)
    })
    const last = worldToScreen(mouseWorld.value.x, mouseWorld.value.y)
    ctx.lineTo(last.x, last.y); ctx.stroke()
    const lp = drawing.points[drawing.points.length - 1]
    const len = Math.hypot(mouseWorld.value.x - lp[0], mouseWorld.value.y - lp[1])
    drawDimText(last.x, last.y - 14, fmt(len) + ' mm', 0)
  }
  ctx.setLineDash([])
}

function render() {
  const r = wrap.value.getBoundingClientRect()
  ctx.clearRect(0, 0, r.width, r.height)
  if (store.gridOn) drawGrid()
  store.shapes.forEach(sh => drawShape(sh, sh.id === store.selectedId))
  if (store.dimOn) store.shapes.forEach(sh => drawDimensions(sh))
  if (drawing) drawPreview()
}

function hitTest(px, py) {
  const w = screenToWorld(px, py)
  const tolMm = 5 / store.scale
  for (let i = store.shapes.length - 1; i >= 0; i--) {
    const sh = store.shapes[i]
    if (sh.type === 'rect') {
      if (w.x >= sh.x - tolMm && w.x <= sh.x + sh.w + tolMm && w.y >= sh.y - tolMm && w.y <= sh.y + sh.h + tolMm) return sh
    } else if (sh.type === 'circle') {
      const d = Math.hypot(w.x - sh.cx, w.y - sh.cy)
      if (Math.abs(d - sh.r) < tolMm + 2 || d < sh.r) return sh
    } else if (sh.type === 'line') {
      if (distToSeg(w.x, w.y, sh.x1, sh.y1, sh.x2, sh.y2) < tolMm) return sh
    } else if (sh.type === 'polyline') {
      for (let j = 0; j < sh.points.length - 1; j++) {
        if (distToSeg(w.x, w.y, sh.points[j][0], sh.points[j][1], sh.points[j + 1][0], sh.points[j + 1][1]) < tolMm) return sh
      }
    }
  }
  return null
}

function onDown(e) {
  const m = getMousePos(e)
  if (store.tool === 'pan' || e.button === 1) {
    panning = { sx: m.x, sy: m.y, ox: store.originX, oy: store.originY }
    return
  }
  const w = screenToWorld(m.x, m.y)
  const wx = store.snap(w.x), wy = store.snap(w.y)

  if (store.tool === 'select') {
    const hit = hitTest(m.x, m.y)
    store.selectShape(hit ? hit.id : null)
    render()
    return
  }
  if (store.tool === 'line') {
    if (!drawing) drawing = { type: 'line', x1: wx, y1: wy }
    else { store.addShape({ type: 'line', layer: store.currentLayer, x1: drawing.x1, y1: drawing.y1, x2: wx, y2: wy }); drawing = null }
  } else if (store.tool === 'rect') {
    if (!drawing) drawing = { type: 'rect', x1: wx, y1: wy }
    else {
      const x = Math.min(drawing.x1, wx), y = Math.min(drawing.y1, wy)
      const w2 = Math.abs(wx - drawing.x1), h2 = Math.abs(wy - drawing.y1)
      store.addShape({ type: 'rect', layer: store.currentLayer, x, y, w: w2, h: h2 })
      drawing = null
    }
  } else if (store.tool === 'circle') {
    if (!drawing) drawing = { type: 'circle', cx: wx, cy: wy }
    else {
      const rad = Math.hypot(wx - drawing.cx, wy - drawing.cy)
      store.addShape({ type: 'circle', layer: store.currentLayer, cx: drawing.cx, cy: drawing.cy, r: store.snap(rad) })
      drawing = null
    }
  } else if (store.tool === 'polyline') {
    if (!drawing) drawing = { type: 'polyline', points: [[wx, wy]] }
    else drawing.points.push([wx, wy])
  }
  render()
}

function onDblClick() {
  if (store.tool === 'polyline' && drawing && drawing.points.length >= 2) {
    store.addShape({ type: 'polyline', layer: store.currentLayer, points: drawing.points, closed: false })
    drawing = null
    render()
  }
}

function onMove(e) {
  const m = getMousePos(e)
  if (panning) {
    store.originX = panning.ox + (m.x - panning.sx)
    store.originY = panning.oy + (m.y - panning.sy)
    render()
    return
  }
  const w = screenToWorld(m.x, m.y)
  mouseWorld.value = { x: store.snap(w.x), y: store.snap(w.y) }
  if (drawing) render()
}

function onUp() { panning = null }

function onWheel(e) {
  const m = getMousePos(e)
  const before = screenToWorld(m.x, m.y)
  const factor = e.deltaY < 0 ? 1.1 : 0.9
  store.scale = Math.max(0.5, Math.min(60, store.scale * factor))
  const after = worldToScreen(before.x, before.y)
  store.originX += m.x - after.x
  store.originY += m.y - after.y
  render()
}

function onKeydown(e) {
  if (e.target.tagName === 'INPUT') return
  if (e.key === 'Escape') { drawing = null; render() }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedId) store.deleteShape(store.selectedId)
    render()
  }
  if (e.key === 'Enter' && drawing && drawing.type === 'polyline' && drawing.points.length >= 2) {
    store.addShape({ type: 'polyline', layer: store.currentLayer, points: drawing.points, closed: false })
    drawing = null
    render()
  }
  const map = { v: 'select', l: 'line', r: 'rect', c: 'circle', p: 'polyline' }
  if (map[e.key]) { store.setTool(map[e.key]); drawing = null }
}

defineExpose({ zoomFitViewport: () => {
  const r = wrap.value.getBoundingClientRect()
  store.zoomFit(r.width, r.height)
  render()
} })

onMounted(() => {
  ctx = cv.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  window.removeEventListener('keydown', onKeydown)
})

watch(() => [store.shapes, store.selectedId, store.gridOn, store.dimOn, store.scale, store.originX, store.originY], () => {
  render()
}, { deep: true })
</script>
