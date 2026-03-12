/**
 * DungeonGenerator: procedural dungeon generation for Phaser 3.
 * Based on Michael Hadley's guide and @mikewesthad/dungeon library.
 * https://github.com/mikewesthad/phaser-3-tilemap-blog-posts
 */

import Phaser from "phaser";
import Dungeon from "@mikewesthad/dungeon";
import type { Room } from "@mikewesthad/dungeon";
import { DEFAULT_TILES, createCanvasTileset } from "./TileMapping";

export type { Room };

export type DungeonThemeKey = "cyber" | "cave" | "facility" | "void";
export type DungeonRoomRole = "start" | "end" | "other";
export type DungeonWallSide = "top" | "bottom" | "left" | "right";

export interface DungeonTheme {
  key: DungeonThemeKey;
  label: string;
  tilesetKey: string;
  tilesetPath: string;
  bgColor: string;
}

export interface DungeonConfig {
  width: number;
  height: number;
  tileSize: number;
  theme: DungeonThemeKey;
  seed?: string;
  doorPadding?: number;
  roomGutter?: number;
  rooms: {
    width:  { min: number; max: number; onlyOdd?: boolean };
    height: { min: number; max: number; onlyOdd?: boolean };
    maxRooms?: number;
    maxArea?: number;
  };
  placement?: {
    stairs?: {
      tileIndex?: number;
      roomRole?: DungeonRoomRole;
    };
    objects?: Array<{
      id: string;
      tileIndex: number;
      tileIndexByWall?: Partial<Record<DungeonWallSide, number>>;
      tileVariants?: Array<{
        base: number;
        byWall?: Partial<Record<DungeonWallSide, number>>;
      }>;
      multiTile?: {
        tiles: number[];
        orientation?: "horizontal" | "vertical" | "auto";
      };
      roomRoles?: DungeonRoomRole[];
      chancePerRoom?: number;
      minCount?: number;
      maxCount?: number;
      avoidOccupiedRooms?: boolean;
      avoidOccupiedTiles?: boolean;
      countPerRoom?: {
        min?: number;
        max?: number;
      };
      position?: {
        mode?: "center" | "randomFloor" | "wallAttached";
        paddingFromWalls?: number;
        avoidCenter?: boolean;
        wallSides?: DungeonWallSide[];
      };
    }>;
  };
}

export interface DungeonBuildResult {
  map: Phaser.Tilemaps.Tilemap;
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  stuffLayer: Phaser.Tilemaps.TilemapLayer;
  dungeon: Dungeon;
  startRoom: Room;
  endRoom: Room;
  otherRooms: Room[];
  startX: number;
  startY: number;
}

export const DUNGEON_THEMES: Record<DungeonThemeKey, DungeonTheme> = {
  cyber:    { key: "cyber",    label: "Cyber Facility",      tilesetKey: "tileset-cyber",    tilesetPath: "tilemaps/home.png", bgColor: "#04040f" },
  cave:     { key: "cave",     label: "Underground Cave",    tilesetKey: "tileset-cave",     tilesetPath: "tilemaps/home.png", bgColor: "#060402" },
  facility: { key: "facility", label: "Abandoned Facility",  tilesetKey: "tileset-facility", tilesetPath: "tilemaps/home.png", bgColor: "#030605" },
  void:     { key: "void",     label: "The Void",            tilesetKey: "tileset-void",     tilesetPath: "tilemaps/home.png", bgColor: "#000000" },
};

export class DungeonGenerator {
  /**
   * Generates a procedural dungeon and builds all Phaser layers.
   * Uses @mikewesthad/dungeon for room/door generation and Phaser tilemaps for rendering.
   */
  static buildTilemap(scene: Phaser.Scene, config: DungeonConfig): DungeonBuildResult {

    const { tileSize, theme: themeKey } = config;
    const theme = DUNGEON_THEMES[themeKey] ?? DUNGEON_THEMES.cyber;
    const TILES = DEFAULT_TILES;

    // Generate dungeon layout with odd-sized rooms for centered objects
    const dungeon = new Dungeon({
      width: config.width,
      height: config.height,
      randomSeed: config.seed,
      doorPadding: config.doorPadding ?? 2,
      roomGutter: config.roomGutter ?? 0,
      rooms: {
        width: { min: config.rooms.width.min, max: config.rooms.width.max, onlyOdd: config.rooms.width.onlyOdd ?? true },
        height: { min: config.rooms.height.min, max: config.rooms.height.max, onlyOdd: config.rooms.height.onlyOdd ?? true },
        maxArea: config.rooms.maxArea,
        maxRooms: config.rooms.maxRooms,
      },
    } as any);

    // Choose tileset texture: prefer loaded image, fallback to canvas
    const tilesetKey = theme.tilesetKey;
    const canvasKey = `dungeon-canvas-${theme.key}`;
    const activeKey = scene.textures.exists(tilesetKey) ? tilesetKey : canvasKey;
    if (activeKey === canvasKey && !scene.textures.exists(canvasKey)) {
      scene.textures.addCanvas(canvasKey, createCanvasTileset(tileSize, theme.key));
    }

    // Create tilemap and tileset
    const map = scene.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: dungeon.width,
      height: dungeon.height,
    });

    const tileset = map.addTilesetImage(activeKey, activeKey, tileSize, tileSize, 0, 0);
    if (!tileset) throw new Error(`[DungeonGenerator] Tileset "${activeKey}" not available.`);

    // Create layers
    const groundLayer = map.createBlankLayer("Ground", tileset)!.setDepth(0);
    const stuffLayer = map.createBlankLayer("Stuff", tileset)!.setDepth(1);
    const blockedDoorTiles = new Set<string>();

    const markBlocked = (tx: number, ty: number): void => {
      if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) return;
      blockedDoorTiles.add(`${tx},${ty}`);
    };

    // Fill background with blank wall tiles
    groundLayer.fill(TILES.BLANK);

    // Pass 1: Paint floors and walls for ALL rooms before placing any doors.
    // This ensures no room's wall painting can overwrite another room's door tiles.
    dungeon.rooms.forEach((room) => {
      const { x, y, width, height, left, right, top, bottom } = room;

      // Floor: interior starts 2 rows below top (top wall is 2 rows tall)
      groundLayer.weightedRandomize(TILES.FLOOR, x + 1, y + 2, width - 2, height - 3);

      // Top wall - riga 1 (cap arancione)
      groundLayer.weightedRandomize(TILES.WALL.TOP,      left + 1, top,     width - 2, 1);
      // Top wall - riga 2 (corpo grigio)
      groundLayer.weightedRandomize(TILES.WALL.TOP_BODY, left + 1, top + 1, width - 2, 1);
      // Bottom wall
      groundLayer.weightedRandomize(TILES.WALL.BOTTOM, left + 1, bottom, width - 2, 1);
      // Side walls (from riga 2 of top down to bottom-1)
      groundLayer.weightedRandomize(TILES.WALL.LEFT,   left,  top + 2, 1, height - 3);
      groundLayer.weightedRandomize(TILES.WALL.RIGHT,  right, top + 2, 1, height - 3);
    });

    // Pass 2a: Place ALL doors and mark blocked tiles across every room.
    // Must run completely before Pass 2b so that adjacency checks see all doors.
    dungeon.rooms.forEach((room) => {
      const { x, y, width, height } = room;

      const doors = room.getDoorLocations();
      for (const door of doors) {
        if (door.y === 0) {
          const startX = x + door.x - 1;
          const doorY = y + door.y;
          groundLayer.putTilesAt(TILES.DOOR.TOP,      startX, doorY);
          groundLayer.putTilesAt(TILES.DOOR.TOP_BODY, startX, doorY + 1);

          for (let i = 0; i < TILES.DOOR.TOP.length; i++) {
            markBlocked(startX + i, doorY);
            markBlocked(startX + i, doorY + 1);
          }
        } else if (door.y === height - 1) {
          const startX = x + door.x - 1;
          const doorY = y + door.y;
          groundLayer.putTilesAt(TILES.DOOR.BOTTOM,      startX, doorY);
          groundLayer.putTilesAt(TILES.DOOR.BOTTOM_BODY, startX, doorY - 1);

          for (let i = 0; i < TILES.DOOR.BOTTOM.length; i++) {
            markBlocked(startX + i, doorY);
            markBlocked(startX + i, doorY - 1);
          }
        } else if (door.x === 0) {
          const doorX = x + door.x;
          const startY = y + door.y - 1;
          groundLayer.putTilesAt(TILES.DOOR.LEFT, doorX, startY);

          for (let i = 0; i < TILES.DOOR.LEFT.length; i++) {
            markBlocked(doorX, startY + i);
            markBlocked(doorX + 1, startY + i);
          }
        } else if (door.x === width - 1) {
          const doorX = x + door.x;
          const startY = y + door.y - 1;
          groundLayer.putTilesAt(TILES.DOOR.RIGHT, doorX, startY);

          for (let i = 0; i < TILES.DOOR.RIGHT.length; i++) {
            markBlocked(doorX, startY + i);
            markBlocked(doorX - 1, startY + i);
          }
        }
      }
    });

    // Pass 2a-fix: when the bottom of a LEFT door (210) is directly right of a RIGHT door bottom (150),
    // replace 210 with 148 to match the correct visual junction.
    // Also: when a BOTTOM door frame (148) is directly right of a RIGHT door frame (170),
    // replace 148 with 210 to match the correct visual junction.
    for (let ty = 0; ty < dungeon.height; ty++) {
      for (let tx = 0; tx < dungeon.width; tx++) {
        const t = groundLayer.getTileAt(tx, ty);
        if (t && t.index === 210) {
          const left = groundLayer.getTileAt(tx - 1, ty);
          if (left && left.index === 150) {
            groundLayer.putTileAt(148, tx, ty);
          }
        } else if (t && t.index === 148) {
          const left = groundLayer.getTileAt(tx - 1, ty);
          const right = groundLayer.getTileAt(tx + 1, ty);
          if (left && left.index === 170) {
            groundLayer.putTileAt(210, tx, ty);
          } else if (left && left.index === 189) {
            groundLayer.putTileAt(210, tx, ty);
          } else if (right && right.index === 73) {
            groundLayer.putTileAt(212, tx, ty);
            groundLayer.putTileAt(194, tx + 1, ty);
          }
        } else if (t && t.index === 170) {
          const below = groundLayer.getTileAt(tx, ty + 1);
          const right = groundLayer.getTileAt(tx + 1, ty);
          if (right && right.index === 210) {
            groundLayer.putTileAt(192, tx, ty);
          } else if (below && (below.index === 2 || below.index === 3 || below.index === 4)) {
            groundLayer.putTileAt(189, tx, ty);
          }
        } else if (t && t.index === 150) {
          const right = groundLayer.getTileAt(tx + 1, ty);
          if (right && right.index === 148) {
            // Frame destro di una porta (150) direttamente adiacente al frame sinistro di un'altra (148):
            // il 150 è spurio, sostituire con parete inferiore normale.
            groundLayer.putTileAt(170, tx, ty);
          } else if (right && right.index === 189) {
            groundLayer.putTileAt(212, tx, ty);
          } else if (right && right.index === 170) {
            const belowRight = groundLayer.getTileAt(tx + 1, ty + 1);
            if (belowRight && (belowRight.index === 2 || belowRight.index === 3 || belowRight.index === 4)) {
              groundLayer.putTileAt(212, tx, ty);
            }
          }
        } else if (t && t.index === 171) {
          const left = groundLayer.getTileAt(tx - 1, ty);
          if (left && left.index === 189) {
            groundLayer.putTileAt(194, tx, ty);
          }
        } else if (t && t.index === 73) {
          const left = groundLayer.getTileAt(tx - 1, ty);
          if (left && left.index === 148) {
            groundLayer.putTileAt(212, tx - 1, ty);
            groundLayer.putTileAt(194, tx, ty);
          }
        }
      }
    }

    // Pass 2b: Place corners and cap rows now that ALL door positions are known.
    dungeon.rooms.forEach((room) => {
      const { left, right, top, bottom } = room;

      // Propaga tile 4 dopo il primo tile 3 nel top wall row, saltando le aperture porta (42)
      // Gira qui (Pass 2b) in modo da vedere i tile di porta già piazzati da Pass 2a.
      let fillTop = false;
      for (let cx = left + 1; cx <= right - 1; cx++) {
        const t = groundLayer.getTileAt(cx, top);
        if (fillTop) {
          if (!t || t.index !== 42) { groundLayer.putTileAt(4, cx, top); }
        } else if (t && t.index === 3) {
          fillTop = true;
        }
      }

      // Corners
      groundLayer.putTileAt(TILES.WALL.TOP_LEFT,  left,  top);
      groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
      // Top body corners: se il vicino esterno è una door tile, usa DOOR.LEFT/RIGHT top post (106/108)
      const topLeftBodyTile  = blockedDoorTiles.has(`${left  - 1},${top + 1}`) ? TILES.DOOR.LEFT[0][0]  : TILES.WALL.TOP_LEFT_BODY;
      const topRightBodyTile = blockedDoorTiles.has(`${right + 1},${top + 1}`) ? TILES.DOOR.RIGHT[0][0] : TILES.WALL.TOP_RIGHT_BODY;
      groundLayer.putTileAt(topLeftBodyTile,  left,  top + 1);
      groundLayer.putTileAt(topRightBodyTile, right, top + 1);
      // Bottom corners: se il vicino esterno è una door tile, usa WALL.BOTTOM plain;
      // se il vicino interno (left+1) è una door tile, usa tile 214/210 o 194/212.
      // Se il corner stesso è già occupato da un tile di porta (blockedDoorTiles), non sovrascrivere.
      const bottomRightBlocked = blockedDoorTiles.has(`${right},${bottom}`);
      const bottomRightTile = bottomRightBlocked
                            ? null
                            : blockedDoorTiles.has(`${right + 1},${bottom}`) ? TILES.WALL.BOTTOM[0].index as number
                            : blockedDoorTiles.has(`${right - 1},${bottom}`) ? 194
                            : TILES.WALL.BOTTOM_RIGHT;
      const bottomLeftBlocked = blockedDoorTiles.has(`${left},${bottom}`);
      const bottomLeftTile  = bottomLeftBlocked
                            ? null
                            : blockedDoorTiles.has(`${left  - 1},${bottom}`) ? TILES.WALL.BOTTOM[0].index as number
                            : blockedDoorTiles.has(`${left  + 1},${bottom}`) ? 214
                            : TILES.WALL.BOTTOM_LEFT;
      if (bottomRightTile !== null) groundLayer.putTileAt(bottomRightTile, right, bottom);
      if (bottomLeftTile  !== null) groundLayer.putTileAt(bottomLeftTile,  left,  bottom);
      // Se il corner è diventato 214 (door interna a left+1), rimpiazzare anche quel door con 210
      if (bottomLeftTile === 214) {
        groundLayer.putTileAt(210, left + 1, bottom);
      }
      // Se il corner è diventato 194 (door interna a right-1), rimpiazzare anche quel door con 212
      if (bottomRightTile === 194) {
        groundLayer.putTileAt(212, right - 1, bottom);
      }
      // Se il corner è diventato 194 e right,bottom-1 è stato sporcato dal BOTTOM_BODY
      // (porta sul bordo inferiore con ultimo tile a x=right), ripristinare la parete destra.
      // Guard: se right,bottom-2 NON è bloccato, il 42 a right,bottom-1 è spillover di BOTTOM_BODY
      // (non un'apertura di porta RIGHT che coprirebbe anche bottom-2).
      if (bottomRightTile === 194 && !blockedDoorTiles.has(`${right},${bottom - 2}`)) {
        groundLayer.putTileAt(TILES.WALL.RIGHT[0].index as number, right, bottom - 1);
      }

      // Cap/shadow row above top wall (solo pixel r22-31 visibili, crea profondità)
      const capY = top - 1;
      if (capY >= 0) {
        for (let cx = left; cx <= right; cx++) {
          const existing = groundLayer.getTileAt(cx, capY);
          // Non sovrascrivere tile di altre stanze già piazzati
          if (existing && existing.index !== TILES.BLANK) continue;

          if (cx === left) {
            groundLayer.putTileAt(TILES.TOP_CAP.LEFT_CORNER, cx, capY);
          } else if (cx === right) {
            groundLayer.putTileAt(TILES.TOP_CAP.RIGHT_CORNER, cx, capY);
          } else {
            groundLayer.weightedRandomize(TILES.TOP_CAP.CENTER, cx, capY, 1, 1);
          }
        }
      }
    });

    // Draw corridors in gutter gaps between rooms
    const roomGutter = config.roomGutter ?? 0;
    if (roomGutter > 0) {
      const leftWallIdx  = TILES.WALL.LEFT[0].index as number;
      const rightWallIdx = TILES.WALL.RIGHT[0].index as number;
      const topBodyIdx   = TILES.WALL.TOP_BODY[0].index as number;
      const bottomIdx    = TILES.WALL.BOTTOM[0].index as number;

      // Place a tile only if the target cell is currently blank (don't overwrite room walls/floors)
      const putIfBlank = (tx: number, ty: number, tile: number): void => {
        if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) return;
        const existing = groundLayer.getTileAt(tx, ty);
        if (existing && existing.index !== TILES.BLANK) return;
        groundLayer.putTileAt(tile, tx, ty);
      };
      const putWallIfBlank = putIfBlank;

      dungeon.rooms.forEach((room) => {
        const doors = room.getDoorLocations();
        for (const door of doors) {
          const absX = room.x + door.x;
          const absY = room.y + door.y;
          if (door.y === 0) {
            // TOP door: corridoio verso l'alto — il door è largo 4 [FRAME,42,42,FRAME]
            // floor a absX e absX+1, pareti a absX-1 e absX+2
            for (let dy = 1; dy <= roomGutter; dy++) {
              const ty = absY - dy;
              if (ty >= 0) {
                putIfBlank(absX,     ty, TILES.FLOOR[0].index as number);
                putIfBlank(absX + 1, ty, TILES.FLOOR[0].index as number);
                putWallIfBlank(absX - 1, ty, leftWallIdx);
                putWallIfBlank(absX + 2, ty, rightWallIdx);
              }
            }
          } else if (door.y === room.height - 1) {
            // BOTTOM door: corridoio verso il basso — stesso schema
            for (let dy = 1; dy <= roomGutter; dy++) {
              const ty = absY + dy;
              if (ty < dungeon.height) {
                putIfBlank(absX,     ty, TILES.FLOOR[0].index as number);
                putIfBlank(absX + 1, ty, TILES.FLOOR[0].index as number);
                putWallIfBlank(absX - 1, ty, leftWallIdx);
                putWallIfBlank(absX + 2, ty, rightWallIdx);
              }
            }
          } else if (door.x === 0) {
            // LEFT door: corridoio verso sinistra — il door è alto 4 [FRAME,42,42,FRAME]
            // floor a absY e absY+1, pareti a absY-1 e absY+2
            for (let dx = 1; dx <= roomGutter; dx++) {
              const tx = absX - dx;
              if (tx >= 0) {
                putIfBlank(tx, absY,     TILES.FLOOR[0].index as number);
                putIfBlank(tx, absY + 1, TILES.FLOOR[0].index as number);
                putWallIfBlank(tx, absY - 1, topBodyIdx);
                putWallIfBlank(tx, absY + 2, bottomIdx);
              }
            }
          } else if (door.x === room.width - 1) {
            // RIGHT door: corridoio verso destra — stesso schema
            for (let dx = 1; dx <= roomGutter; dx++) {
              const tx = absX + dx;
              if (tx < dungeon.width) {
                putIfBlank(tx, absY,     TILES.FLOOR[0].index as number);
                putIfBlank(tx, absY + 1, TILES.FLOOR[0].index as number);
                putWallIfBlank(tx, absY - 1, topBodyIdx);
                putWallIfBlank(tx, absY + 2, bottomIdx);
              }
            }
          }
        }
      });
    }

    // Setup collisions
    groundLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    // Assign room roles
    const allRooms = dungeon.rooms.slice();
    const startRoom = allRooms.shift()!;
    const endRoom = Phaser.Utils.Array.RemoveRandomElement(allRooms) as Room;
    const otherRooms = (Phaser.Utils.Array.Shuffle(allRooms) as Room[]).slice(0, Math.floor(allRooms.length * 0.9));

    const getRoomsByRole = (role: DungeonRoomRole): Room[] => {
      if (role === "start") return [startRoom];
      if (role === "end") return [endRoom];
      return otherRooms;
    };

    const roomKey = (room: Room): string => `${room.centerX},${room.centerY}`;
    const tileKey = (x: number, y: number): string => `${x},${y}`;
    const occupiedRooms = new Set<string>();
    const occupiedTiles = new Set<string>();

    // Scale disabilitate. Placement oggetti attivo.
    const objectRules = config.placement?.objects ?? [];

    for (const rule of objectRules) {
      const roles = rule.roomRoles && rule.roomRoles.length > 0 ? rule.roomRoles : (["other"] as DungeonRoomRole[]);
      const candidateRooms = Phaser.Utils.Array.Shuffle(
        roles.flatMap((role) => getRoomsByRole(role))
      ) as Room[];

      const maxCount = Math.max(0, rule.maxCount ?? Number.MAX_SAFE_INTEGER);
      const minCount = Math.max(0, rule.minCount ?? 0);
      const chance = Phaser.Math.Clamp(rule.chancePerRoom ?? 1, 0, 1);
      const avoidOccupied = rule.avoidOccupiedRooms ?? true;
      const avoidOccupiedTiles = rule.avoidOccupiedTiles ?? true;
      const minPerRoom = Math.max(1, rule.countPerRoom?.min ?? 1);
      const maxPerRoom = Math.max(minPerRoom, rule.countPerRoom?.max ?? minPerRoom);
      const position = {
        mode: rule.position?.mode ?? "center",
        paddingFromWalls: rule.position?.paddingFromWalls ?? 1,
        avoidCenter: rule.position?.avoidCenter ?? false,
        wallSides: (rule.position?.wallSides && rule.position.wallSides.length > 0)
          ? rule.position.wallSides
          : (["top", "bottom", "left", "right"] as DungeonWallSide[]),
      };

      const tryPlaceInRoom = (room: Room, skipChance: boolean): number => {
        if (placed >= maxCount) return 0;
        if (avoidOccupied && occupiedRooms.has(roomKey(room))) return 0;
        if (!skipChance && Math.random() > chance) return 0;

        const requested = Phaser.Math.Between(minPerRoom, maxPerRoom);
        const slots = this.pickRoomPlacementTiles(room, requested, position, occupiedTiles, avoidOccupiedTiles, blockedDoorTiles);
        if (slots.length === 0) return 0;

        let placedInRoom = 0;
        for (const slot of slots) {
          if (placed >= maxCount) break;

          if (rule.multiTile && rule.multiTile.tiles.length > 0) {
            const orientation = rule.multiTile.orientation ?? "auto";
            const isHorizontal = orientation === "horizontal" || (orientation === "auto" && (slot.wallSide === "top" || slot.wallSide === "bottom"));
            const tiles = rule.multiTile.tiles;

            let allTilesValid = true;
            const cellsToPlace: Array<{x: number, y: number, tile: number}> = [];

            for (let i = 0; i < tiles.length; i++) {
              const tx = isHorizontal ? slot.x + i : slot.x;
              const ty = isHorizontal ? slot.y : slot.y + i;
              const key = tileKey(tx, ty);

              if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) {
                allTilesValid = false;
                break;
              }
              if (avoidOccupiedTiles && occupiedTiles.has(key)) {
                allTilesValid = false;
                break;
              }
              if (blockedDoorTiles.has(key)) {
                allTilesValid = false;
                break;
              }
              cellsToPlace.push({ x: tx, y: ty, tile: tiles[i] });
            }

            if (!allTilesValid) continue;

            for (const cell of cellsToPlace) {
              stuffLayer.putTileAt(cell.tile, cell.x, cell.y);
              if (avoidOccupiedTiles) occupiedTiles.add(tileKey(cell.x, cell.y));
            }
          } else {
            let tileForSlot = rule.tileIndex;
            if (rule.tileVariants && rule.tileVariants.length > 0) {
              const variant = Phaser.Utils.Array.GetRandom(rule.tileVariants);
              tileForSlot = slot.wallSide != null
                ? (variant.byWall?.[slot.wallSide] ?? variant.base)
                : variant.base;
            } else {
              tileForSlot = slot.wallSide != null
                ? (rule.tileIndexByWall?.[slot.wallSide] ?? rule.tileIndex)
                : rule.tileIndex;
            }

            stuffLayer.putTileAt(tileForSlot, slot.x, slot.y);
            if (avoidOccupiedTiles) occupiedTiles.add(tileKey(slot.x, slot.y));
          }

          placed++;
          placedInRoom++;
        }

        if (placedInRoom > 0 && avoidOccupied) {
          occupiedRooms.add(roomKey(room));
        }

        return placedInRoom;
      };

      let placed = 0;
      for (const room of candidateRooms) {
        if (placed >= maxCount) break;
        tryPlaceInRoom(room, false);
      }

      if (placed < minCount) {
        for (const room of candidateRooms) {
          if (placed >= minCount || placed >= maxCount) break;
          tryPlaceInRoom(room, true);
        }
      }
      }

    stuffLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    // Calculate spawn position and setup camera/physics bounds
    const startX = (map.tileToWorldX(startRoom.centerX) ?? 0) + tileSize / 2;
    const startY = (map.tileToWorldY(startRoom.centerY) ?? 0) + tileSize / 2;

    scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    return { map, groundLayer, stuffLayer, dungeon, startRoom, endRoom, otherRooms, startX, startY };
  }

  private static pickRoomPlacementTiles(
    room: Room,
    requestedCount: number,
    position: {
      mode: "center" | "randomFloor" | "wallAttached";
      paddingFromWalls: number;
      avoidCenter: boolean;
      wallSides: DungeonWallSide[];
    },
    occupiedTiles: Set<string>,
    avoidOccupiedTiles: boolean,
    blockedDoorTiles: Set<string>,
  ): Array<{ x: number; y: number; wallSide?: DungeonWallSide }> {
    const toKey = (x: number, y: number): string => `${x},${y}`;

    if (position.mode === "center") {
      const center = { x: room.centerX, y: room.centerY };
      if (avoidOccupiedTiles && occupiedTiles.has(toKey(center.x, center.y))) {
        return [];
      }
      return [center];
    }

    const wallPadding = Math.max(1, Math.floor(position.paddingFromWalls));
    let minX = room.x + wallPadding;
    let maxX = room.x + room.width - 1 - wallPadding;
    // Top wall is 2 rows tall, so floor starts at room.y+2 minimum
    let minY = room.y + Math.max(wallPadding, 2);
    let maxY = room.y + room.height - 1 - wallPadding;

    // Fallback for very small rooms: use full interior area.
    if (minX > maxX || minY > maxY) {
      minX = room.x + 1;
      maxX = room.x + room.width - 2;
      minY = room.y + 1;
      maxY = room.y + room.height - 2;
    }

    const candidates: Array<{ x: number; y: number; wallSide?: DungeonWallSide }> = [];

    if (position.mode === "wallAttached") {
      for (const side of position.wallSides) {
        if (side === "top") {
          const y = minY;
          for (let x = minX; x <= maxX; x++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "top" });
          }
        } else if (side === "bottom") {
          const y = maxY;
          for (let x = minX; x <= maxX; x++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "bottom" });
          }
        } else if (side === "left") {
          const x = minX;
          for (let y = minY; y <= maxY; y++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "left" });
          }
        } else if (side === "right") {
          const x = maxX;
          for (let y = minY; y <= maxY; y++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "right" });
          }
        }
      }
    } else {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
          candidates.push({ x, y });
        }
      }
    }

    const shuffled = Phaser.Utils.Array.Shuffle(candidates) as Array<{ x: number; y: number; wallSide?: DungeonWallSide }>;
    const result: Array<{ x: number; y: number; wallSide?: DungeonWallSide }> = [];

    for (const cell of shuffled) {
      if (result.length >= requestedCount) break;
      if (blockedDoorTiles.has(toKey(cell.x, cell.y))) continue;
      if (avoidOccupiedTiles && occupiedTiles.has(toKey(cell.x, cell.y))) continue;
      result.push(cell);
    }

    return result;
  }
}

export default DungeonGenerator;