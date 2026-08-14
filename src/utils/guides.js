import { shapeBounds, fmt } from './geometry'

// Given the dragged shape's tentative bounds (world mm) and every other
// shape, work out: (1) snap adjustments so edges/centers line up with other
// shapes, and (2) gap-distance labels to the nearest neighboring shape on
// each side. Used by CanvasStage while dragging to move a shape.
export function computeGuides(draggedBounds, others, scale, tolPx = 7) {
  const tolMm = tolPx / scale
  let snapDx = 0, snapDy = 0
  let bestX = null, bestY = null
  const dx = { minX: draggedBounds.minX, maxX: draggedBounds.maxX, cx: (draggedBounds.minX + draggedBounds.maxX) / 2 }
  const dy = { minY: draggedBounds.minY, maxY: draggedBounds.maxY, cy: (draggedBounds.minY + draggedBounds.maxY) / 2 }

  others.forEach(other => {
    const b = shapeBounds(other.shape)
    const ox = { minX: b.minX, maxX: b.maxX, cx: (b.minX + b.maxX) / 2 }
    const oy = { minY: b.minY, maxY: b.maxY, cy: (b.minY + b.maxY) / 2 };
    ['minX', 'maxX', 'cx'].forEach(dk => {
      ['minX', 'maxX', 'cx'].forEach(ok => {
        const diff = Math.abs(dx[dk] - ox[ok])
        if (diff < tolMm && (!bestX || diff < bestX.diff)) {
          bestX = { diff, delta: ox[ok] - dx[dk], pos: ox[ok], other, bound: b }
        }
      })
    });
    ['minY', 'maxY', 'cy'].forEach(dk => {
      ['minY', 'maxY', 'cy'].forEach(ok => {
        const diff = Math.abs(dy[dk] - oy[ok])
        if (diff < tolMm && (!bestY || diff < bestY.diff)) {
          bestY = { diff, delta: oy[ok] - dy[dk], pos: oy[ok], other, bound: b }
        }
      })
    })
  })

  if (bestX) snapDx = bestX.delta
  if (bestY) snapDy = bestY.delta

  const finalBounds = {
    minX: draggedBounds.minX + snapDx,
    maxX: draggedBounds.maxX + snapDx,
    minY: draggedBounds.minY + snapDy,
    maxY: draggedBounds.maxY + snapDy
  }

  const guides = []
  if (bestX) guides.push({ axis: 'v', pos: bestX.pos })
  if (bestY) guides.push({ axis: 'h', pos: bestY.pos })

  // Nearest-neighbor gap labels: for shapes whose vertical range overlaps
  // the dragged shape, find the closest one to the left and right; same for
  // horizontal neighbors vertically.
  let left = null, right = null, top = null, bottom = null
  others.forEach(other => {
    const b = shapeBounds(other.shape)
    const overlapsY = b.maxY > finalBounds.minY && b.minY < finalBounds.maxY
    const overlapsX = b.maxX > finalBounds.minX && b.minX < finalBounds.maxX
    if (overlapsY) {
      if (b.maxX <= finalBounds.minX + 0.001) {
        const gap = finalBounds.minX - b.maxX
        if (!left || gap < left.gap) left = { gap, bound: b }
      } else if (b.minX >= finalBounds.maxX - 0.001) {
        const gap = b.minX - finalBounds.maxX
        if (!right || gap < right.gap) right = { gap, bound: b }
      }
    }
    if (overlapsX) {
      if (b.maxY <= finalBounds.minY + 0.001) {
        const gap = finalBounds.minY - b.maxY
        if (!top || gap < top.gap) top = { gap, bound: b }
      } else if (b.minY >= finalBounds.maxY - 0.001) {
        const gap = b.minY - finalBounds.maxY
        if (!bottom || gap < bottom.gap) bottom = { gap, bound: b }
      }
    }
  })

  const gaps = []
  if (left) gaps.push({ side: 'left', gap: left.gap, y: (Math.max(left.bound.minY, finalBounds.minY) + Math.min(left.bound.maxY, finalBounds.maxY)) / 2, x1: left.bound.maxX, x2: finalBounds.minX })
  if (right) gaps.push({ side: 'right', gap: right.gap, y: (Math.max(right.bound.minY, finalBounds.minY) + Math.min(right.bound.maxY, finalBounds.maxY)) / 2, x1: finalBounds.maxX, x2: right.bound.minX })
  if (top) gaps.push({ side: 'top', gap: top.gap, x: (Math.max(top.bound.minX, finalBounds.minX) + Math.min(top.bound.maxX, finalBounds.maxX)) / 2, y1: top.bound.maxY, y2: finalBounds.minY })
  if (bottom) gaps.push({ side: 'bottom', gap: bottom.gap, x: (Math.max(bottom.bound.minX, finalBounds.minX) + Math.min(bottom.bound.maxX, finalBounds.maxX)) / 2, y1: finalBounds.maxY, y2: bottom.bound.minY })

  return { dx: snapDx, dy: snapDy, guides, gaps: gaps.filter(g => g.gap > 0.01 && g.gap < 2000) }
}

export { fmt }
