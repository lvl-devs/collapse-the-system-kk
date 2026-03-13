import type { DungeonThemeKey, DungeonConfig } from "./game/systems/DungeonGenerator";
export type { DungeonThemeKey, DungeonConfig };

export interface Settings {
  graphics: number;
  audio: number;
  invertY: boolean;
  vibration: boolean;
}

export interface Globals {
  gameWidth: number;
  gameHeight: number;
  gameTitle: string;
  bgColor: string;
  debug: boolean;
  defaultFont: {
    key: string;
    path: string;
  };
}

export interface Menu {
  items: {label: string, scene: string}[];
  font: string;
  align: string;
  fontSize: number;
}

export interface DungeonSettings {
  defaultTheme: DungeonThemeKey;
  availableThemes: DungeonThemeKey[];
  defaultConfig: Omit<DungeonConfig, "theme" | "seed">;
}

export interface PreloaderConfig {
  loadingTextFont: string;
  loadingTextColor: string;
  loadingTextComplete: string;
  loadingTextY: number;
}

export interface GameDataType {
  globals: Globals;
  menu: Menu;
  preloader: PreloaderConfig;
  settings: Settings;
  dungeon: DungeonSettings;
  sfxVolume?: number;
  musicVolume?: number;
  images: { name: string; path: string }[];
  tilemaps: any[];
  atlas: any[];
  spritesheets: any[];
  sounds: any[];
  videos: any[];
  scripts: any[];
  fonts: { key: string; path: string }[];
  webfonts: { key: string }[];
  bitmapfonts: any[];
}

import dungeonLayout from "./game/data/dungeon-layout.json";

export const GameData: GameDataType = {

  globals: {
    gameWidth: 1280,
    gameHeight: 800,
    gameTitle: "Collapse The System",
    bgColor: "#0a0a0f",
    debug: false,
    defaultFont: {
      key: "Pixelify Sans",
      path: "/fonts/PixelifySans.ttf"
    }
  },

  menu: {
    items: [
      { label: "Start Game", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" },
    ],
    font: "Pixelify Sans",
    align: 'left',
    fontSize: 50,
  },

  preloader: {
    loadingTextFont: "Pixelify Sans",
    loadingTextColor: "#00f5ff",
    loadingTextComplete: "Press any key to breach the system...",
    loadingTextY: 700,
  },

  settings: {
    graphics: 0.85,
    audio: 0.7,
    invertY: false,
    vibration: true
  },

  dungeon: {
    defaultTheme: "cyber",
    availableThemes: ["cyber", "cave", "facility", "void"],
    defaultConfig: {
      width: dungeonLayout.width || 100,
      height: dungeonLayout.height || 100,
      tileSize: 32,
      doorPadding: 2,
      roomGutter: 4,
      rooms: {
        width: { min: 7, max: 15 },
        height: { min: 7, max: 15 },
        maxRooms: 12,
        maxArea: 150,
      },
      fixedRooms: dungeonLayout.fixedRooms as any,
      fixedCorridors: dungeonLayout.corridors as any,
      doors: (dungeonLayout as any).doors,
      overlayRules: (dungeonLayout as any).overlayRules,
      placement: (dungeonLayout as any).placement || {
        stairs: {
          roomRole: "end",
        },
        objects: []
      },
    },
  },

  sfxVolume: 0.7,
  musicVolume: 0.6,

  images: [
    { name: "bg_logo", path: "/images/bg_logo.png" },
    { name: "title_img", path: "/images/title.png" },
    { name: "tileset-cyber", path: "/tilemaps/home.png" },
    { name: "tileset-cave", path: "/tilemaps/home.png" },
    { name: "tileset-facility", path: "/tilemaps/home.png" },
    { name: "tileset-void", path: "/tilemaps/home.png" },
    { name: "server-rack-open", path: "/tilemaps/other-objects/server-rack-open.png" },
    { name: "server-rack-closed", path: "/tilemaps/other-objects/server-rack-closed.png" },
    { name: "door", path: "/tilemaps/doors/door.png" },
    { name: "door-open", path: "/tilemaps/doors/door-open.png" },
    { name: "door-closed", path: "/tilemaps/doors/door-closed.png" },
  ],

  tilemaps: [],
  atlas: [],
  spritesheets: [
    { name: "hacker", path: "/spritesheets/hacker.png", width: 32, height: 45, frames: 12 },
    { name: "scientist", path: "/spritesheets/scientist.png", width: 32, height: 45, frames: 12 },
    { name: "policeman", path: "/spritesheets/policeman.png", width: 32, height: 45, frames: 12 }
  ],
  sounds: [
    { name: "menu-theme", paths: ["/music/menu.mp3"] },
    { name: "level-1-theme", paths: ["/music/level-1.mp3"] },
    { name: "rain-sfx", paths: ["/sounds/rain.mp3"] }
  ],
  videos: [
    { name: 'bg-menu', path: '/videos/bg-menu.mp4' }
  ],
  scripts: [],

  fonts: [
    { key: 'Boldonse', path: '/fonts/Boldonse.ttf' }
  ],

  webfonts: [
    { key: 'Roboto' },
    { key: 'Pixelify Sans' },
    { key: 'Bungee Tint' }
  ],

  bitmapfonts: [],
};

export default GameData;