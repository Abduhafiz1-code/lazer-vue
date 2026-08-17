import { LAYER_COLOR, fmt, getBounds } from "./geometry";

export function toSvg(shapes) {
  const b = getBounds(shapes);
  const w = Math.max(1, b.w),
    h = Math.max(1, b.h);
  const parts = [];
  shapes.forEach((sh) => {
    const col = LAYER_COLOR[sh.layer];
    const cls = sh.layer;
    if (sh.type === "line") {
      parts.push(
        `<line x1="${fmt(sh.x1 - b.minX)}" y1="${fmt(sh.y1 - b.minY)}" x2="${fmt(sh.x2 - b.minX)}" y2="${fmt(sh.y2 - b.minY)}" stroke="${col}" stroke-width="0.1" fill="none" data-layer="${cls}"/>`,
      );
    } else if (sh.type === "rect") {
      parts.push(
        `<rect x="${fmt(sh.x - b.minX)}" y="${fmt(sh.y - b.minY)}" width="${fmt(sh.w)}" height="${fmt(sh.h)}" stroke="${col}" stroke-width="0.1" fill="none" data-layer="${cls}"/>`,
      );
    } else if (sh.type === "circle") {
      parts.push(
        `<circle cx="${fmt(sh.cx - b.minX)}" cy="${fmt(sh.cy - b.minY)}" r="${fmt(sh.r)}" stroke="${col}" stroke-width="0.1" fill="none" data-layer="${cls}"/>`,
      );
    } else if (sh.type === "ellipse") {
      parts.push(
        `<ellipse cx="${fmt(sh.cx - b.minX)}" cy="${fmt(sh.cy - b.minY)}" rx="${fmt(sh.rx)}" ry="${fmt(sh.ry)}" stroke="${col}" stroke-width="0.1" fill="none" data-layer="${cls}"/>`,
      );
    } else if (sh.type === "semicircle") {
      const pts = [];
      const segments = 40;
      for (let i = 0; i <= segments; i++) {
        const a =
          (sh.start ?? -Math.PI / 2) +
          ((sh.end ?? Math.PI / 2) - (sh.start ?? -Math.PI / 2)) *
            (i / segments);
        pts.push(
          `${fmt(sh.cx + Math.cos(a) * sh.r - b.minX)},${fmt(sh.cy + Math.sin(a) * sh.r - b.minY)}`,
        );
      }
      parts.push(
        `<polyline points="${pts.join(" ")}" stroke="${col}" stroke-width="0.1" fill="none" data-layer="${cls}"/>`,
      );
    } else if (sh.type === "polyline" || sh.type === "path") {
      const pts = sh.points
        .map((p) => fmt(p[0] - b.minX) + "," + fmt(p[1] - b.minY))
        .join(" ");
      const tag = sh.closed ? "polygon" : "polyline";
      parts.push(
        `<${tag} points="${pts}" stroke="${col}" stroke-width="0.1" fill="none" data-layer="${cls}"/>`,
      );
    }
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(w)}mm" height="${fmt(h)}mm" viewBox="0 0 ${fmt(w)} ${fmt(h)}">
${parts.join("\n")}
</svg>`;
}

export function toDxf(shapes) {
  const b = getBounds(shapes);
  const H = b.h;
  const flipY = (y) => fmt(H - (y - b.minY));
  const fx = (x) => fmt(x - b.minX);
  const layerColor = { cut: 1, engrave: 5, mark: 2 };
  const ents = [];
  shapes.forEach((sh) => {
    const ly = sh.layer.toUpperCase();
    if (sh.type === "line") {
      ents.push(
        `0\nLINE\n8\n${ly}\n10\n${fx(sh.x1)}\n20\n${flipY(sh.y1)}\n11\n${fx(sh.x2)}\n21\n${flipY(sh.y2)}`,
      );
    } else if (sh.type === "circle") {
      ents.push(
        `0\nCIRCLE\n8\n${ly}\n10\n${fx(sh.cx)}\n20\n${flipY(sh.cy)}\n40\n${fmt(sh.r)}`,
      );
    } else if (sh.type === "ellipse") {
      ents.push(
        `0\nELLIPSE\n8\n${ly}\n10\n${fx(sh.cx)}\n20\n${flipY(sh.cy)}\n11\n${fmt(sh.rx)}\n21\n${fmt(sh.ry)}\n40\n0`,
      );
    } else if (sh.type === "semicircle") {
      const pts = [];
      const segs = 40;
      const start = sh.start ?? -Math.PI / 2;
      const end = sh.end ?? Math.PI / 2;
      for (let i = 0; i <= segs; i++) {
        const a = start + ((end - start) * i) / segs;
        pts.push([sh.cx + Math.cos(a) * sh.r, sh.cy + Math.sin(a) * sh.r]);
      }
      const body = pts
        .map((p) => `10\n${fx(p[0])}\n20\n${flipY(p[1])}`)
        .join("\n");
      ents.push(`0\nLWPOLYLINE\n8\n${ly}\n90\n${pts.length}\n70\n0\n${body}`);
    } else if (sh.type === "rect") {
      const pts = [
        [sh.x, sh.y],
        [sh.x + sh.w, sh.y],
        [sh.x + sh.w, sh.y + sh.h],
        [sh.x, sh.y + sh.h],
      ];
      const body = pts
        .map((p) => `10\n${fx(p[0])}\n20\n${flipY(p[1])}`)
        .join("\n");
      ents.push(`0\nLWPOLYLINE\n8\n${ly}\n90\n4\n70\n1\n${body}`);
    } else if (sh.type === "polyline" || sh.type === "path") {
      const body = sh.points
        .map((p) => `10\n${fx(p[0])}\n20\n${flipY(p[1])}`)
        .join("\n");
      ents.push(
        `0\nLWPOLYLINE\n8\n${ly}\n90\n${sh.points.length}\n70\n${sh.closed ? 1 : 0}\n${body}`,
      );
    }
  });
  const layerDefs = Object.keys(layerColor)
    .map(
      (k) =>
        `0\nLAYER\n2\n${k.toUpperCase()}\n70\n0\n62\n${layerColor[k]}\n6\nCONTINUOUS`,
    )
    .join("\n");
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n3\n${layerDefs}\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${ents.join("\n")}\n0\nENDSEC\n0\nEOF`;
}

export function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
