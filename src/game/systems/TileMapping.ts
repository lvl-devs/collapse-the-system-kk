/**
 * TileMapping: tile constants and canvas-tileset fallback for procedural dungeons.
 * Compatible with buch-tileset (home.png 21×11 tiles, 32×32px).
 * Based on Michael Hadley's guide: https://github.com/mikewesthad/phaser-3-tilemap-blog-posts
 */

export interface TileWeight { index: number | number[]; weight: number }

export interface TileMap {
  BLANK: number;
  FLOOR: TileWeight[];
  WALL: {
    TOP_LEFT:     number;
    TOP_RIGHT:    number;
    BOTTOM_RIGHT: number;
    BOTTOM_LEFT:  number;
    TOP:          TileWeight[];
    BOTTOM:       TileWeight[];
    LEFT:         TileWeight[];
    RIGHT:        TileWeight[];
  };
  DOOR: {
    TOP:    number[];
    BOTTOM: number[];
    LEFT:   [number[], number[], number[], number[]];
    RIGHT:  [number[], number[], number[], number[]];
  };
  STAIRS: number;
  CHEST:  number;
  FLOOR_INDICES: number[];
}

export const DEFAULT_TILES: TileMap = {
  BLANK: 128,
  FLOOR: [{ index: 42, weight: 1 }],

  WALL: {
    TOP_LEFT:     85,
    TOP_RIGHT:    87,
    BOTTOM_LEFT:  169,
    BOTTOM_RIGHT: 171,
    TOP:    [{ index: 86,  weight: 6 }, { index: [86, 86],   weight: 1 }],
    BOTTOM: [{ index: 170, weight: 4 }, { index: [170, 170], weight: 1 }],
    LEFT:   [{ index: 126, weight: 4 }, { index: [126, 126], weight: 1 }],
    RIGHT:  [{ index: 130, weight: 4 }, { index: [130, 130], weight: 1 }],
  },

  DOOR: {
    TOP:    [106, 42, 42, 108],
    BOTTOM: [148, 42, 42, 150],
    LEFT:   [[106], [42], [42], [148]],
    RIGHT:  [[108], [42], [42], [150]],
  },

  STAIRS: 124,
  CHEST: 157,
  FLOOR_INDICES: [42, 84, 88, 168, 172],
};

// Canvas tileset fallback (colored tiles matching home.png structure)
const COLS = 21;
const ROWS = 11;

const THEME_PALETTES: Record<string, {
  blank: string; floor: string; wallTop: string; wallSide: string;
  door: string; stairs: string; chest: string;
}> = {
  cyber:    { blank: "#04040f", floor: "#1a1a3e", wallTop: "#0088cc", wallSide: "#005588", door: "#00ffcc", stairs: "#ffcc00", chest: "#ff6600" },
  cave:     { blank: "#060402", floor: "#2a1a0e", wallTop: "#6b4226", wallSide: "#4a2c18", door: "#c8a96e", stairs: "#ffe066", chest: "#cc8833" },
  facility: { blank: "#030605", floor: "#0a1a0a", wallTop: "#144a14", wallSide: "#0c330c", door: "#44ff44", stairs: "#88ff88", chest: "#ffaa00" },
  void:     { blank: "#000000", floor: "#0d0d0d", wallTop: "#330033", wallSide: "#220022", door: "#cc00cc", stairs: "#ff00ff", chest: "#ffff00" },
};

function colorForIndex(idx: number, palette: typeof THEME_PALETTES[string]): string {
  if(idx === 42) return palette.floor;
  if(idx === 81) return palette.stairs;
  if(idx === 166) return palette.chest;
  if([84, 88, 168, 172].includes(idx)) return palette.blank;
  if([86, 170, 170].includes(idx)) return palette.wallTop;
  if([87, 105, 106, 107, 108, 109, 126, 127, 128, 129, 130, 147, 148, 149, 150, 169, 171].includes(idx)) return palette.wallSide;
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
