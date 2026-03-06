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
        if (door.y === 0)             groundLayer.putTilesAt(TILES.DOOR.TOP,    x + door.x - 1, y + door.y);
        else if (door.y === height - 1) groundLayer.putTilesAt(TILES.DOOR.BOTTOM, x + door.x - 1, y + door.y);
        else if (door.x === 0)          groundLayer.putTilesAt(TILES.DOOR.LEFT,   x + door.x, y + door.y - 1);
        else if (door.x === width - 1)  groundLayer.putTilesAt(TILES.DOOR.RIGHT,  x + door.x, y + door.y - 1);
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

    // Place stairs in end room
    stuffLayer.putTileAt(TILES.STAIRS, endRoom.centerX, endRoom.centerY);

    // Place chests in other rooms (30% chance)
    otherRooms.forEach((room) => {
      if (Math.random() <= 0.3) stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
    });

    stuffLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    // Calculate spawn position and setup camera/physics bounds
    const startX = (map.tileToWorldX(startRoom.centerX) ?? 0) + tileSize / 2;
    const startY = (map.tileToWorldY(startRoom.centerY) ?? 0) + tileSize / 2;

    scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    return { map, groundLayer, stuffLayer, dungeon, startRoom, endRoom, otherRooms, startX, startY };
  }
}

export default DungeonGenerator;