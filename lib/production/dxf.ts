/**
 * DXF writer — lib/production/dxf.ts
 * ============================================================================
 * Writes a drawing (./drawing.ts) as ASCII DXF R12 (AC1009): the oldest,
 * most widely read version — AutoCAD, BricsCAD, SolidWorks, LibreCAD and CNC
 * software all open it. Lines, closed polylines and text, on named layers
 * with colours; dashed layers use a DASHED linetype. Units: millimetres.
 */

import { bounds, LAYERS, type Drawing, type Layer } from "./drawing";

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

/** DXF R12 text is plain ASCII; keep the common signs readable. */
const ascii = (s: string) => s
  .replace(/×/g, "x").replace(/[–—]/g, "-").replace(/°/g, "%%d").replace(/·/g, "-")
  .replace(/[^\x20-\x7e]/g, "?");

export function toDxf(d: Drawing): string {
  const out: string[] = [];
  const g = (code: number, value: string | number) => { out.push(String(code), typeof value === "number" ? n(value) : value); };
  const [x0, y0, x1, y1] = bounds(d.ents);

  g(0, "SECTION"); g(2, "HEADER");
  g(9, "$ACADVER"); g(1, "AC1009");
  g(9, "$INSBASE"); g(10, 0); g(20, 0); g(30, 0);
  g(9, "$EXTMIN"); g(10, x0); g(20, y0); g(30, 0);
  g(9, "$EXTMAX"); g(10, x1); g(20, y1); g(30, 0);
  g(9, "$LTSCALE"); g(40, 20);
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "TABLES");
  g(0, "TABLE"); g(2, "LTYPE"); g(70, 2);
  g(0, "LTYPE"); g(2, "CONTINUOUS"); g(70, 0); g(3, "Solid line"); g(72, 65); g(73, 0); g(40, 0);
  g(0, "LTYPE"); g(2, "DASHED"); g(70, 0); g(3, "Dashed __ __ __"); g(72, 65); g(73, 2); g(40, 0.75); g(49, 0.5); g(49, -0.25);
  g(0, "ENDTAB");
  const used = [...new Set(d.ents.map(e => e.layer))] as Layer[];
  g(0, "TABLE"); g(2, "LAYER"); g(70, used.length + 1);
  g(0, "LAYER"); g(2, "0"); g(70, 0); g(62, 7); g(6, "CONTINUOUS");
  for (const l of used) { g(0, "LAYER"); g(2, l); g(70, 0); g(62, LAYERS[l].color); g(6, LAYERS[l].dashed ? "DASHED" : "CONTINUOUS"); }
  g(0, "ENDTAB");
  g(0, "TABLE"); g(2, "STYLE"); g(70, 1);
  g(0, "STYLE"); g(2, "STANDARD"); g(70, 0); g(40, 0); g(41, 1); g(50, 0); g(71, 0); g(42, 2.5); g(3, "txt"); g(4, "");
  g(0, "ENDTAB");
  g(0, "ENDSEC");

  g(0, "SECTION"); g(2, "ENTITIES");
  for (const e of d.ents) {
    if (e.t === "line") {
      g(0, "LINE"); g(8, e.layer);
      g(10, e.a[0]); g(20, e.a[1]); g(30, 0); g(11, e.b[0]); g(21, e.b[1]); g(31, 0);
    } else if (e.t === "poly") {
      g(0, "POLYLINE"); g(8, e.layer); g(66, 1); g(10, 0); g(20, 0); g(30, 0); g(70, e.closed ? 1 : 0);
      for (const [x, y] of e.pts) { g(0, "VERTEX"); g(8, e.layer); g(10, x); g(20, y); g(30, 0); }
      g(0, "SEQEND"); g(8, e.layer);
    } else {
      g(0, "TEXT"); g(8, e.layer);
      g(10, e.at[0]); g(20, e.at[1]); g(30, 0); g(40, e.h); g(1, ascii(e.text));
      if (e.rot) g(50, e.rot);
      const h = e.align === "center" ? 1 : e.align === "right" ? 2 : 0;
      if (h) { g(72, h); g(11, e.at[0]); g(21, e.at[1]); g(31, 0); }
    }
  }
  g(0, "ENDSEC");
  g(0, "EOF");
  return out.join("\r\n") + "\r\n";
}
