// Real "cuts a hole in the geometry" eraser. Works on every shape type
// (line, rect, circle, polyline, path) by treating the eraser as a small
// circle and either:
//   - subtracting it from closed shapes with proper polygon boolean
//     difference (so you really can erase just a corner of a square or half
//     of a circle, and the shape can even get split into separate pieces), or
//   - splitting open paths (lines / open polylines) at the points where the
//     eraser circle crosses them.
// Any shape actually touched is converted into a generic 'path' shape so its
// new, irregular outline can be stored and further edited point-by-point.
import polybool from "polybooljs";
import { distToSeg, pointInPolygon, shapeToPoints } from "./geometry";

const ERASER_CIRCLE_SEGMENTS = 40;

function eraserRing(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < ERASER_CIRCLE_SEGMENTS; i++) {
    const a = (i / ERASER_CIRCLE_SEGMENTS) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function minDistToPath(points, closed, cx, cy) {
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    min = Math.min(
      min,
      distToSeg(
        cx,
        cy,
        points[i][0],
        points[i][1],
        points[i + 1][0],
        points[i + 1][1],
      ),
    );
  }
  if (closed && points.length > 2) {
    const n = points.length;
    min = Math.min(
      min,
      distToSeg(
        cx,
        cy,
        points[n - 1][0],
        points[n - 1][1],
        points[0][0],
        points[0][1],
      ),
    );
  }
  return min;
}

function overlaps(points, closed, cx, cy, r) {
  if (points.length < 2) return false;
  if (minDistToPath(points, closed, cx, cy) <= r) return true;
  if (closed && pointInPolygon(cx, cy, points)) return true;
  return false;
}

// Subtract the eraser circle from one closed polygon. Returns an array of
// resulting point-rings (0 rings = fully erased away, 2+ rings = the shape
// got split into islands, or a hole was punched leaving an inner + outer ring).
function subtractCircle(points, cx, cy, r) {
  const subject = { regions: [points], inverted: false };
  const clip = { regions: [eraserRing(cx, cy, r)], inverted: false };
  let result;
  try {
    result = polybool.difference(subject, clip);
  } catch {
    return [points]; // degenerate geometry - leave shape untouched rather than crash
  }
  return result.regions.filter((region) => region.length >= 3);
}

// Erase the part of an open path within the eraser circle, splitting it into
// 0+ remaining open pieces.
function eraseOpenPath(points, cx, cy, r) {
  const pieces = [];
  let current = [];
  const inside = (p) => Math.hypot(p[0] - cx, p[1] - cy) <= r;

  function crossings(p1, p2) {
    const dx = p2[0] - p1[0],
      dy = p2[1] - p1[1];
    const fx = p1[0] - cx,
      fy = p1[1] - cy;
    const a = dx * dx + dy * dy;
    if (a === 0) return [];
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return [];
    const sq = Math.sqrt(disc);
    return [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]
      .filter((t) => t > 1e-9 && t < 1 - 1e-9)
      .sort((x, y) => x - y);
  }
  const lerp = (p1, p2, t) => [
    p1[0] + (p2[0] - p1[0]) * t,
    p1[1] + (p2[1] - p1[1]) * t,
  ];

  if (points.length && !inside(points[0])) current.push(points[0]);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1],
      p = points[i];
    const prevIn = inside(prev),
      pIn = inside(p);
    const cs = crossings(prev, p);

    if (!prevIn && !pIn && cs.length === 2) {
      current.push(lerp(prev, p, cs[0]));
      if (current.length >= 2) pieces.push(current);
      current = [lerp(prev, p, cs[1]), p];
    } else if (!prevIn && pIn) {
      current.push(lerp(prev, p, cs.length ? cs[0] : 0));
      if (current.length >= 2) pieces.push(current);
      current = [];
    } else if (prevIn && !pIn) {
      current = [lerp(prev, p, cs.length ? cs[0] : 1), p];
    } else if (!prevIn && !pIn) {
      current.push(p);
    }
    // else: both endpoints inside the eraser - segment fully dropped
  }
  if (current.length >= 2) pieces.push(current);
  return pieces;
}

// Erase at a single world-space point. `makeId` supplies fresh ids for any
// extra pieces a shape gets split into.
export function eraseAt(shapes, cx, cy, radius, makeId) {
  const out = [];
  for (const sh of shapes) {
    const { points, closed } = shapeToPoints(sh);
    if (points.length < 2) {
      out.push(sh);
      continue;
    }

    // cheap bbox reject before the precise (and for closed shapes, more
    // expensive) overlap test
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (
      cx + radius < minX ||
      cx - radius > maxX ||
      cy + radius < minY ||
      cy - radius > maxY
    ) {
      out.push(sh);
      continue;
    }
    if (!overlaps(points, closed, cx, cy, radius)) {
      out.push(sh);
      continue;
    }

    if (closed) {
      const rings = subtractCircle(points, cx, cy, radius);
      rings.forEach((ring, i) => {
        out.push({
          id: i === 0 ? sh.id : makeId(),
          layer: sh.layer,
          type: "path",
          points: ring,
          closed: true,
        });
      });
    } else {
      const pieces = eraseOpenPath(points, cx, cy, radius);
      pieces.forEach((pts, i) => {
        out.push({
          id: i === 0 ? sh.id : makeId(),
          layer: sh.layer,
          type: "path",
          points: pts,
          closed: false,
        });
      });
    }
  }
  return out;
}

// Erase along a stroke from (x1,y1) to (x2,y2), sampling intermediate points
// so a fast mouse drag doesn't leave un-erased gaps.
export function eraseAlong(shapes, x1, y1, x2, y2, radius, makeId) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const step = Math.max(radius * 0.5, 0.25);
  const steps = Math.max(1, Math.ceil(dist / step));
  let result = shapes;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    result = eraseAt(
      result,
      x1 + (x2 - x1) * t,
      y1 + (y2 - y1) * t,
      radius,
      makeId,
    );
  }
  return result;
}
