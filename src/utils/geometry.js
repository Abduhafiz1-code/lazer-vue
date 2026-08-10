export const LAYER_COLOR = { cut: '#e0413f', engrave: '#3f8fe0', mark: '#e0d13f' }

export function fmt(v) {
  return (Math.round(v * 100) / 100).toString()
}

export function getHandles(sh) {
  if (sh.type === 'line') return [{ x: sh.x1, y: sh.y1 }, { x: sh.x2, y: sh.y2 }]
  if (sh.type === 'rect') return [{ x: sh.x, y: sh.y }, { x: sh.x + sh.w, y: sh.y + sh.h }]
  if (sh.type === 'circle') return [{ x: sh.cx, y: sh.cy }]
  if (sh.type === 'polyline') return sh.points.map(p => ({ x: p[0], y: p[1] }))
  return []
}

export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
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
