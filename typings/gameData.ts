interface gameData {
  globals: {
    gameWidth: number,
    gameHeight: number,
    bgColor: string,
    debug: boolean,
    defaultFont: { key: string, path: string }
  },

  preloader: {
    loadingTextFont: string,
    loadingTextColor: string,
    loadingTextComplete: string,
    loadingTextY: number,
  },

  images?: Array<ImageAsset>,
  tilemaps?: Array<TilemapAsset>,
  atlas?: Array<AtlasAsset>,
  spritesheets?: Array<SpritesheetsAsset>,
  sounds?: Array<SoundAsset>,
  videos?: Array<VideoAsset>,
  scripts?: Array<ScriptAsset>,
  fonts?: Array<FontAsset>,
  webfonts?: Array<FontAsset>,
  bitmapfonts?: Array<FontAsset>,
}

interface ImageAsset { name: string; path: string; }
interface TilemapAsset { key: string; path: string; }
interface AtlasAsset { key: string; path: string; jsonpath: string; }
interface SpritesheetsAsset {
  name: string;
  path: string;
  width: number;
  height: number;
  frames: number;
  spacing?: number;
}
interface SoundAsset { name: string; paths: Array<string>; }
interface VideoAsset { name: string; path: string; }
interface ScriptAsset{ key: string; path: string; }
interface FontAsset {
  key: string;
  path?: string;
  imgpath?: string;
  xmlpath?: string;
}

// ─── Dungeon Generation ────────────────────────────────────────────────

/** Chiave che identifica un tema visivo dungeon */
type DungeonThemeKey = "cyber" | "cave" | "facility" | "void";

/** Indici tile all'interno di un tileset per un tema dungeon */
interface DungeonTileIndices {
  empty: number;
  floor: number;
  wall: number;
  wallTop: number;
  door: number;
  void: number;
}

/** Metadati visivi e tile-index di un tema dungeon */
interface DungeonThemeAsset {
  key: DungeonThemeKey;
  label: string;
  tilesetKey: string;
  tilesetPath: string;
  bgColor: string;
  tiles: DungeonTileIndices;
}

/** Configurazione di una singola stanza nella generazione */
interface DungeonRoomConfig {
  maxRooms: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

/** Configurazione completa passata al generatore di dungeon */
interface DungeonConfig {
  seed?: number;
  width: number;
  height: number;
  tileSize: number;
  theme: DungeonThemeKey;
  rooms: DungeonRoomConfig;
  spawnEnemies: boolean;
  spawnItems: boolean;
  spawnExit: boolean;
}

/** Stanza generata — coordinate in tile */
interface DungeonRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/** Risultato completo di una generazione dungeon */
interface DungeonMap {
  tiles: number[][];
  rooms: DungeonRoom[];
  playerSpawn: { x: number; y: number };
  exit: { x: number; y: number } | null;
  enemySpawns: { x: number; y: number }[];
  itemSpawns: { x: number; y: number }[];
  theme: DungeonThemeAsset;
  config: DungeonConfig;
  gridWidth: number;
  gridHeight: number;
}