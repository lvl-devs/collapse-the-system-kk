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
      rooms: {
        width: { min: config.rooms.width.min, max: config.rooms.width.max, onlyOdd: config.rooms.width.onlyOdd ?? true },
        height: { min: config.rooms.height.min, max: config.rooms.height.max, onlyOdd: config.rooms.height.onlyOdd ?? true },
        maxArea: config.rooms.maxArea,
        maxRooms: config.rooms.maxRooms,
      },
    });

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

    // Paint rooms
    dungeon.rooms.forEach((room) => {
      const { x, y, width, height, left, right, top, bottom } = room;

      groundLayer.weightedRandomize(TILES.FLOOR, x + 1, y + 1, width - 2, height - 2);

      groundLayer.weightedRandomize(TILES.WALL.TOP,    left + 1, top,    width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.BOTTOM, left + 1, bottom, width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.LEFT,   left,  top + 1, 1, height - 2);
      groundLayer.weightedRandomize(TILES.WALL.RIGHT,  right, top + 1, 1, height - 2);

      // Place doors
      const doors = room.getDoorLocations();
      for (const door of doors) {
        if (door.y === 0) {
          const startX = x + door.x - 1;
          const doorY = y + door.y;
          groundLayer.putTilesAt(TILES.DOOR.TOP, startX, doorY);

          for (let i = 0; i < TILES.DOOR.TOP.length; i++) {
            markBlocked(startX + i, doorY);
            markBlocked(startX + i, doorY + 1);
          }
        } else if (door.y === height - 1) {
          const startX = x + door.x - 1;
          const doorY = y + door.y;
          groundLayer.putTilesAt(TILES.DOOR.BOTTOM, startX, doorY);

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

      // Corners applied last so walls/doors can never overwrite them
      groundLayer.putTileAt(TILES.WALL.TOP_LEFT,     left,  top);
      groundLayer.putTileAt(TILES.WALL.TOP_RIGHT,    right, top);
      groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
      groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT,  left,  bottom);
    });

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

    // Configurable stairs placement (defaults to end room).
    const stairsRole = config.placement?.stairs?.roomRole ?? "end";
    const stairsTile = config.placement?.stairs?.tileIndex ?? TILES.STAIRS;
    const stairsCandidates = Phaser.Utils.Array.Shuffle(getRoomsByRole(stairsRole).slice()) as Room[];
    const stairsRoom = stairsCandidates[0] ?? endRoom;
    stuffLayer.putTileAt(stairsTile, stairsRoom.centerX, stairsRoom.centerY);
    occupiedRooms.add(roomKey(stairsRoom));
    occupiedTiles.add(tileKey(stairsRoom.centerX, stairsRoom.centerY));

    // Configurable object placement with defaults equivalent to previous chest behavior.
    const objectRules = config.placement?.objects ?? [{
      id: "chest",
      tileIndex: TILES.CHEST,
      roomRoles: ["other"] as DungeonRoomRole[],
      chancePerRoom: 0.3,
      avoidOccupiedRooms: true,
    }];

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
    let minY = room.y + wallPadding;
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