export const LAYER_COLOR = { cut: '#e0413f', engrave: '#3f8fe0', mark: '#e0d13f' }

export function fmt(v) {
  return (Math.round(v * 100) / 100).toString()
}

export function getHandles(sh) {
  if (sh.type === 'line') return [{ x: sh.x1, y: sh.y1 }, { x: sh.x2, y: sh.y2 }]
  if (sh.type === 'rect') return [{ x: sh.x, y: sh.y }, { x: sh.x + sh.w, y: sh.y + sh.h }]
  if (sh.type === 'circle') return [{ x: sh.cx, y: sh.cy }, { x: sh.cx + sh.r, y: sh.cy, resize: true }]
  if (sh.type === 'polyline') return sh.points.map(p => ({ x: p[0], y: p[1] }))
  return []
}

// Apply a drag on a specific handle index to reshape the shape in-place.
export function resizeShapeHandle(sh, index, wx, wy) {
  if (sh.type === 'line') {
    if (index === 0) { sh.x1 = wx; sh.y1 = wy } else { sh.x2 = wx; sh.y2 = wy }
  } else if (sh.type === 'rect') {
    if (index === 0) {
      const right = sh.x + sh.w, bottom = sh.y + sh.h
      sh.x = wx; sh.y = wy
      sh.w = Math.max(0.1, right - wx)
      sh.h = Math.max(0.1, bottom - wy)
    } else {
      sh.w = Math.max(0.1, wx - sh.x)
      sh.h = Math.max(0.1, wy - sh.y)
    }
  } else if (sh.type === 'circle') {
    if (index === 0) { sh.cx = wx; sh.cy = wy }
    else sh.r = Math.max(0.1, Math.hypot(wx - sh.cx, wy - sh.cy))
  } else if (sh.type === 'polyline') {
    if (sh.points[index]) sh.points[index] = [wx, wy]
  }
}

export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export function shapeBounds(sh) {
  if (sh.type === 'circle') {
    return { minX: sh.cx - sh.r, minY: sh.cy - sh.r, maxX: sh.cx + sh.r, maxY: sh.cy + sh.r }
  }
  const handles = getHandles(sh)
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
  handles.forEach(h => {
    minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x)
    minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y)
  })
  return { minX, minY, maxX, maxY }
}

export function moveShape(sh, dx, dy) {
  if (sh.type === 'line') {
    sh.x1 += dx; sh.y1 += dy; sh.x2 += dx; sh.y2 += dy
  } else if (sh.type === 'rect') {
    sh.x += dx; sh.y += dy
  } else if (sh.type === 'circle') {
    sh.cx += dx; sh.cy += dy
  } else if (sh.type === 'polyline') {
    sh.points.forEach(p => { p[0] += dx; p[1] += dy })
  }
}

export function cloneShape(sh) {
  return JSON.parse(JSON.stringify(sh))
}

export function getBounds(shapes) {
  let minX = 0, minY = 0, maxX = 100, maxY = 100
  if (shapes.length) {
    minX = 1e9; minY = 1e9; maxX = -1e9; maxY = -1e9
    shapes.forEach(sh => {
      getHandles(sh).forEach(h => {
        minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x)
        minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y)
      })
      if (sh.type === 'circle') {
        minX = Math.min(minX, sh.cx - sh.r); maxX = Math.max(maxX, sh.cx + sh.r)
        minY = Math.min(minY, sh.cy - sh.r); maxY = Math.max(maxY, sh.cy + sh.r)
      }
    })
  }
  minX = Math.min(minX, 0); minY = Math.min(minY, 0)
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}
