/**
 * TileMapping: tile constants and canvas-tileset fallback for procedural dungeons.
 * Calibrato su home.png (21×11 tiles, 32×32px).
 *
 * Struttura di ogni stanza (da sinistra):
 *
 *   cap  :  85  86  86  86  86  86  86  86  87  ← 85/87 sporgono di 1 tile a sx/dx del muro
 *   top  :      126   2   2   2   2   2   2  130  ← muro continuo agli estremi
 *   top+1:  126  23  23  23  23  23  23 130   ← parete TOP riga 2 (corpo grigio)
 *   ...     126  42  42  42  42  42  42 130   ← pavimento
 *   bottom: 169 170 170 170 170 170 170 171   ← parete BOTTOM (169/171 angoli, 170 centro)
 *
 *  Tile  2         : parete TOP riga 1 (centro, cap arancione)
 *  Tile 23         : parete TOP riga 2 (centro, corpo grigio)
 *  Tile 42         : pavimento
 *  Tile 85         : angolo superiore sinistro
 *  Tile 87         : angolo superiore destro
 *  Tile 86         : muro continuo superiore (cap, solo px r22-31)
 *  Tile 106        : curva verso l'interno superiore sinistro (frame porta)
 *  Tile 108        : curva verso l'interno superiore destro (frame porta)
 *  Tile 126        : muro continuo sinistro (full-height)
 *  Tile 130        : muro continuo destro (full-height)
 *  Tile 148        : curva verso l'interno inferiore sinistro (frame porta)
 *  Tile 150        : curva verso l'interno inferiore destro (frame porta)
 *  Tile 169        : angolo inferiore sinistro
 *  Tile 170        : muro continuo inferiore
 *  Tile 171        : angolo inferiore destro
 *  Tile 124        : scale (arancione)
 */

export interface TileWeight { index: number | number[]; weight: number }

export interface TileMap {
  BLANK: number;
  FLOOR: TileWeight[];
  WALL: {
    TOP_LEFT:      number;
    TOP_RIGHT:     number;
    TOP_LEFT_BODY: number;
    TOP_RIGHT_BODY: number;
    BOTTOM_RIGHT:  number;
    BOTTOM_LEFT:   number;
    TOP:           TileWeight[];
    TOP_BODY:      TileWeight[];
    BOTTOM:        TileWeight[];
    LEFT:          TileWeight[];
    RIGHT:         TileWeight[];
  };
  TOP_CAP: {
    LEFT:   number;
    CENTER: TileWeight[];
    RIGHT:  number;
    LEFT_CORNER:  number;
    RIGHT_CORNER: number;
  };
  DOOR: {
    TOP:         number[];
    TOP_BODY:    number[];
    BOTTOM:      number[];
    BOTTOM_BODY: number[];
    LEFT:   [number[], number[], number[], number[]];
    RIGHT:  [number[], number[], number[], number[]];
  };
  STAIRS: number;
  /* CHEST:  number; */
  FLOOR_INDICES: number[];
}

export const DEFAULT_TILES: TileMap = {
  BLANK: 128,

  // Pavimento: tile 42 uniforme
  FLOOR: [
    { index: 42, weight: 1 },
  ],

  WALL: {
    // Estremi riga 1: muro continuo (gli angoli 85/87 vanno nella cap row shiftati di 1)
    TOP_LEFT:      126,
    TOP_RIGHT:     130,
    // Angoli della riga 2 della parete superiore (corpo, usa muri laterali)
    TOP_LEFT_BODY:  126,
    TOP_RIGHT_BODY: 130,
    // Angoli inferiori: cap visibile solo nelle prime 13 righe pixel
    BOTTOM_LEFT:   169,
    BOTTOM_RIGHT:  171,
    // Parete superiore riga 1: tile con cap arancione
    TOP:      [{ index: 2, weight: 5 }, { index: 3, weight: 1 }],
    // Parete superiore riga 2: corpo grigio più chiaro
    TOP_BODY: [{ index: 23, weight: 1 }],
    // Parete inferiore: cap scuro (prime 13 righe) — centro usa solo 170 (diritto)
    BOTTOM: [{ index: 170, weight: 1 }],
    // Pareti laterali: full-height
    LEFT:   [{ index: 126, weight: 1 }],
    RIGHT:  [{ index: 130, weight: 1 }],
  },

  // Cap/ombra sopra la parete superiore (solo pixel inferiori r22-31 visibili)
  TOP_CAP: {
    LEFT:         86,   // cap continuo sopra il corner sinistro del muro (posizione left)
    CENTER:       [{ index: 86, weight: 1 }],  // muro continuo superiore
    RIGHT:        86,   // cap continuo sopra il corner destro del muro (posizione right)
    LEFT_CORNER:  85,   // angolo sinistro sporgente (posizione left-1)
    RIGHT_CORNER: 87,   // angolo destro sporgente (posizione right+1)
  },

  DOOR: {
    // Porta TOP: riga 1 — curve interne come frame, apertura = floor
    TOP:      [2, 42, 42, 2],
    // Porta TOP: riga 2 (body) — bordi = pareti laterali, apertura = floor
    TOP_BODY: [23, 42, 42, 23],
    // Porta BOTTOM: curve interne inferiori come frame, apertura = floor
    BOTTOM:      [148, 42, 42, 150],
    // Porta BOTTOM: riga interna — tutto pavimento (dentro la stanza, no post laterali)
    BOTTOM_BODY: [42, 42, 42, 42],
    // Porta LEFT: 4 righe verticali [top, mid1, mid2, bottom] — curve interne ai bordi
    LEFT:   [[106], [42], [42], [148]],
    // Porta RIGHT
    RIGHT:  [[108], [42], [42], [150]],
  },

  STAIRS: 124,
  // Tutti i tile calpestabili (pavimento + aperture porte)
  FLOOR_INDICES: [42],
};

// Canvas tileset fallback (colored tiles matching home.png structure)
const COLS = 21;
const ROWS = 11;

const THEME_PALETTES: Record<string, {
  blank: string; floor: string; wallTop: string; wallSide: string;
  door: string; stairs: string;
}> = {
  cyber:    { blank: "#04040f", floor: "#1a1a3e", wallTop: "#0088cc", wallSide: "#005588", door: "#00ffcc", stairs: "#ffcc00"},
  cave:     { blank: "#060402", floor: "#2a1a0e", wallTop: "#6b4226", wallSide: "#4a2c18", door: "#c8a96e", stairs: "#ffe066"},
  facility: { blank: "#030605", floor: "#0a1a0a", wallTop: "#144a14", wallSide: "#0c330c", door: "#44ff44", stairs: "#88ff88"},
  void:     { blank: "#000000", floor: "#0d0d0d", wallTop: "#330033", wallSide: "#220022", door: "#cc00cc", stairs: "#ff00ff"},
};

function colorForIndex(idx: number, palette: typeof THEME_PALETTES[string]): string {
  if ([42, 43, 44, 45, 46].includes(idx)) return palette.floor;
  if (idx === 124) return palette.stairs;
  /* if (idx === 157) return palette.chest; */
  // Parete TOP riga 1 (cap arancione)
  if ([2, 3, 4].includes(idx)) return palette.wallTop;
  // Parete TOP riga 2 (corpo grigio chiaro)
  if (idx === 23) return `${palette.wallSide}cc`;
  // Angoli, pareti laterali, cap, frame porte
  if ([0, 1, 85, 86, 87, 105, 106, 108, 109, 126, 130, 147, 148, 150, 151, 169, 170, 171].includes(idx)) return palette.wallSide;
  return palette.blank;
}

export function createCanvasTileset(tileSize: number, themeKey: string): HTMLCanvasElement {
  const palette = THEME_PALETTES[themeKey] ?? THEME_PALETTES.cyber;
  const canvas = document.createElement("canvas");
  canvas.width = COLS * tileSize;
  canvas.height = ROWS * tileSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      ctx.fillStyle = colorForIndex(idx, palette);
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(col * tileSize + 0.25, row * tileSize + 0.25, tileSize - 0.5, tileSize - 0.5);
    }
  }

  return canvas;
}
