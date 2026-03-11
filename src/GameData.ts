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
      width: 100,
      height: 100,
      tileSize: 32,
      doorPadding: 2,
      roomGutter: 4,
      rooms: {
        width: { min: 7, max: 15, onlyOdd: true },
        height: { min: 7, max: 15, onlyOdd: true },
        maxRooms: 12,
        maxArea: 150,
      },
      placement: {
        stairs: {
          roomRole: "end",
        },
        /* objects: [
          {
            id: "chairs",
            tileIndex: 52,
            tileVariants: [
              {
                base: 52,
                byWall: {
                  top: 52,
                  left: 73,
                  right: 94,
                  bottom: 115
                },
              },
              {
                base: 53,
                byWall: {
                  top: 53,
                  left: 74,
                  right: 95,
                  bottom: 116 
                },
              },
            ],
            roomRoles: ["other"],
            chancePerRoom: 0.7,
            countPerRoom: {
              min: 3,
              max: 5,
            },
            position: {
              mode: "wallAttached",
              wallSides: ["top", "left", "right"],
              avoidCenter: true,
              paddingFromWalls: 1,
            },
            avoidOccupiedRooms: false,
            avoidOccupiedTiles: true,
          },
        ], */
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