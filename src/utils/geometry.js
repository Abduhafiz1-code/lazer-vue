export const LAYER_COLOR = {
  cut: "#e0413f",
  engrave: "#3f8fe0",
  mark: "#e0d13f",
};

export function fmt(v) {
  return (Math.round(v * 100) / 100).toString();
}

// 'polyline' (legacy) and 'path' (new, generalized editable shape) are both
// point-list shapes and are treated identically everywhere in the app.
export function isPointsType(sh) {
  return sh.type === "polyline" || sh.type === "path";
}

export function getHandles(sh) {
  if (sh.type === "line")
    return [
      { x: sh.x1, y: sh.y1 },
      { x: sh.x2, y: sh.y2 },
    ];
  if (sh.type === "rect")
    return [
      { x: sh.x, y: sh.y },
      { x: sh.x + sh.w, y: sh.y + sh.h },
    ];
  if (sh.type === "circle")
    return [
      { x: sh.cx, y: sh.cy },
      { x: sh.cx + sh.r, y: sh.cy, resize: true },
    ];
  if (sh.type === "ellipse")
    return [
      { x: sh.cx, y: sh.cy },
      { x: sh.cx + sh.rx, y: sh.cy, resize: true },
    ];
  if (sh.type === "semicircle")
    return [
      { x: sh.cx, y: sh.cy },
      { x: sh.cx + sh.r, y: sh.cy, resize: true },
    ];
  if (isPointsType(sh)) return sh.points.map((p) => ({ x: p[0], y: p[1] }));
  return [];
}

// Apply a drag on a specific handle index to reshape the shape in-place.
export function resizeShapeHandle(sh, index, wx, wy) {
  if (sh.type === "line") {
    if (index === 0) {
      sh.x1 = wx;
      sh.y1 = wy;
    } else {
      sh.x2 = wx;
      sh.y2 = wy;
    }
  } else if (sh.type === "rect") {
    if (index === 0) {
      const right = sh.x + sh.w,
        bottom = sh.y + sh.h;
      sh.x = wx;
      sh.y = wy;
      sh.w = Math.max(0.1, right - wx);
      sh.h = Math.max(0.1, bottom - wy);
    } else {
      sh.w = Math.max(0.1, wx - sh.x);
      sh.h = Math.max(0.1, wy - sh.y);
    }
  } else if (sh.type === "circle") {
    if (index === 0) {
      sh.cx = wx;
      sh.cy = wy;
    } else sh.r = Math.max(0.1, Math.hypot(wx - sh.cx, wy - sh.cy));
  } else if (sh.type === "ellipse") {
    if (index === 0) {
      sh.cx = wx;
      sh.cy = wy;
    } else {
      sh.rx = Math.max(0.1, Math.abs(wx - sh.cx));
      sh.ry = Math.max(0.1, Math.abs(wy - sh.cy));
    }
  } else if (sh.type === "semicircle") {
    if (index === 0) {
      sh.cx = wx;
      sh.cy = wy;
    } else sh.r = Math.max(0.1, Math.hypot(wx - sh.cx, wy - sh.cy));
  } else if (isPointsType(sh)) {
    if (sh.points[index]) sh.points[index] = [wx, wy];
  }
}

// --- Point-list helpers (used by rect/circle -> editable path conversion,
// the polygon tool, and the eraser) ---

export function rectPoints(x, y, w, h) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function circlePoints(cx, cy, r, segments = 48) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function ellipsePoints(cx, cy, rx, ry, segments = 48) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function semiCirclePoints(
  cx,
  cy,
  r,
  start = -Math.PI / 2,
  end = Math.PI / 2,
  segments = 48,
) {
  const pts = [];
  const total = end - start;
  for (let i = 0; i <= segments; i++) {
    const a = start + (i / segments) * total;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function regularPolygonPoints(cx, cy, r, sides) {
  const n = Math.max(3, Math.round(sides));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function shapeCenter(sh) {
  if (sh.type === "line") {
    return { x: (sh.x1 + sh.x2) / 2, y: (sh.y1 + sh.y2) / 2 };
  }
  if (sh.type === "rect") {
    return { x: sh.x + sh.w / 2, y: sh.y + sh.h / 2 };
  }
  if (
    sh.type === "circle" ||
    sh.type === "ellipse" ||
    sh.type === "semicircle"
  ) {
    return { x: sh.cx, y: sh.cy };
  }
  if (isPointsType(sh)) {
    const total = sh.points.reduce(
      (acc, p) => {
        acc.x += p[0];
        acc.y += p[1];
        return acc;
      },
      { x: 0, y: 0 },
    );
    const len = Math.max(1, sh.points.length);
    return { x: total.x / len, y: total.y / len };
  }
  return { x: 0, y: 0 };
}

export function rotatePointAround(x, y, cx, cy, angle) {
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

export function rotateShape(sh, angle, cx, cy) {
  const clone = cloneShape(sh);
  if (sh.type === "line") {
    const a1 = rotatePointAround(sh.x1, sh.y1, cx, cy, angle);
    const a2 = rotatePointAround(sh.x2, sh.y2, cx, cy, angle);
    clone.x1 = a1.x;
    clone.y1 = a1.y;
    clone.x2 = a2.x;
    clone.y2 = a2.y;
    return clone;
  }
  if (sh.type === "rect") {
    const pts = [
      [sh.x, sh.y],
      [sh.x + sh.w, sh.y],
      [sh.x + sh.w, sh.y + sh.h],
      [sh.x, sh.y + sh.h],
    ].map(([px, py]) => {
      const p = rotatePointAround(px, py, cx, cy, angle);
      return [p.x, p.y];
    });
    return { ...clone, type: "path", points: pts, closed: true };
  }
  if (sh.type === "circle") return clone;
  if (sh.type === "ellipse") {
    return clone;
  }
  if (sh.type === "semicircle") {
    const start = sh.start ?? -Math.PI / 2;
    const end = sh.end ?? Math.PI / 2;
    return {
      ...clone,
      type: "semicircle",
      start: start + angle,
      end: end + angle,
    };
  }
  if (isPointsType(sh)) {
    clone.points = sh.points.map(([px, py]) => {
      const p = rotatePointAround(px, py, cx, cy, angle);
      return [p.x, p.y];
    });
    return clone;
  }
  return clone;
}

// Convert ANY shape into a generic { points, closed } outline. This is what
// lets a rect or circle become a freely-editable point-by-point path (so a
// square's corner can be dragged round, etc.) and is also how the eraser
// works on every shape type uniformly.
export function shapeToPoints(sh, circleSegments = 48) {
  if (sh.type === "line")
    return {
      points: [
        [sh.x1, sh.y1],
        [sh.x2, sh.y2],
      ],
      closed: false,
    };
  if (sh.type === "rect")
    return { points: rectPoints(sh.x, sh.y, sh.w, sh.h), closed: true };
  if (sh.type === "circle")
    return {
      points: circlePoints(sh.cx, sh.cy, sh.r, circleSegments),
      closed: true,
    };
  if (sh.type === "ellipse")
    return {
      points: ellipsePoints(sh.cx, sh.cy, sh.rx, sh.ry, circleSegments),
      closed: true,
    };
  if (sh.type === "semicircle") {
    const start = sh.start ?? -Math.PI / 2;
    const end = sh.end ?? Math.PI / 2;
    return {
      points: semiCirclePoints(sh.cx, sh.cy, sh.r, start, end, circleSegments),
      closed: false,
    };
  }
  if (isPointsType(sh))
    return { points: sh.points.map((p) => [p[0], p[1]]), closed: !!sh.closed };
  return { points: [], closed: false };
}

export function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0],
      yi = points[i][1];
    const xj = points[j][0],
      yj = points[j][1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function shapeBounds(sh) {
  if (sh.type === "circle") {
    return {
      minX: sh.cx - sh.r,
      minY: sh.cy - sh.r,
      maxX: sh.cx + sh.r,
      maxY: sh.cy + sh.r,
    };
  }
  if (sh.type === "ellipse") {
    return {
      minX: sh.cx - sh.rx,
      minY: sh.cy - sh.ry,
      maxX: sh.cx + sh.rx,
      maxY: sh.cy + sh.ry,
    };
  }
  if (sh.type === "semicircle") {
    return {
      minX: sh.cx - sh.r,
      minY: sh.cy - sh.r,
      maxX: sh.cx + sh.r,
      maxY: sh.cy + sh.r,
    };
  }
  const handles = getHandles(sh);
  let minX = 1e9,
    minY = 1e9,
    maxX = -1e9,
    maxY = -1e9;
  handles.forEach((h) => {
    minX = Math.min(minX, h.x);
    maxX = Math.max(maxX, h.x);
    minY = Math.min(minY, h.y);
    maxY = Math.max(maxY, h.y);
  });
  return { minX, minY, maxX, maxY };
}

export function moveShape(sh, dx, dy) {
  if (sh.type === "line") {
    sh.x1 += dx;
    sh.y1 += dy;
    sh.x2 += dx;
    sh.y2 += dy;
  } else if (sh.type === "rect") {
    sh.x += dx;
    sh.y += dy;
  } else if (sh.type === "circle") {
    sh.cx += dx;
    sh.cy += dy;
  } else if (sh.type === "ellipse") {
    sh.cx += dx;
    sh.cy += dy;
  } else if (sh.type === "semicircle") {
    sh.cx += dx;
    sh.cy += dy;
  } else if (isPointsType(sh)) {
    sh.points.forEach((p) => {
      p[0] += dx;
      p[1] += dy;
    });
  }
}

export function cloneShape(sh) {
  return JSON.parse(JSON.stringify(sh));
}

export function getBounds(shapes) {
  let minX = 0,
    minY = 0,
    maxX = 100,
    maxY = 100;
  if (shapes.length) {
    minX = 1e9;
    minY = 1e9;
    maxX = -1e9;
    maxY = -1e9;
    shapes.forEach((sh) => {
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
  }
  minX = Math.min(minX, 0);
  minY = Math.min(minY, 0);
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}
