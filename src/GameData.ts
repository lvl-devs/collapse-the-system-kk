

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
    bgColor: "#111518",
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

  sfxVolume: 0.7,
  musicVolume: 0.6,

  images: [
    { name: "bg_logo", path: "/images/bg_logo.png" },
    { name: "airport", path: "/tilemaps/airport.png" },
    { name: "home", path: "/tilemaps/home.png" },
    { name: "tileset-cyber", path: "/tilemaps/home.png" },
    { name: "tileset-cave", path: "/tilemaps/home.png" },
    { name: "tileset-facility", path: "/tilemaps/home.png" },
    { name: "tileset-void", path: "/tilemaps/home.png" },
    { name: "airport-desk", path: "/tilemaps/other-objects/airport-desk.png" },
    { name: "airport-fire-extinguisher", path: "/tilemaps/other-objects/airport-fire-extinguisher.png" },
    { name: "baggage-1", path: "/tilemaps/other-objects/baggage-1.png" },
    { name: "baggage-2", path: "/tilemaps/other-objects/baggage-2.png" },
    { name: "baggage-3", path: "/tilemaps/other-objects/baggage-3.png" },
    { name: "baggage-conveyor", path: "/tilemaps/other-objects/baggage-conveyor.png" },
    { name: "server-rack-closed", path: "/tilemaps/other-objects/server-rack-closed.png" },
    { name: "server-rack-open", path: "/tilemaps/other-objects/server-rack-open.png" },
    { name: "fire-extinguisher", path: "/tilemaps/other-objects/fire-extinguisher.png" },
    { name: "door-closed", path: "/tilemaps/doors/front/door-closed.png" },
    { name: "door-open", path: "/tilemaps/doors/front/door-open.png" },
    { name: "door", path: "/tilemaps/doors/front/door.png" },
    { name: "left-side-doors-closed", path: "/tilemaps/doors/side/left-side-doors-closed.png" },
    { name: "left-side-doors-open", path: "/tilemaps/doors/side/left-side-doors-open.png" },
    { name: "right-side-doors-closed", path: "/tilemaps/doors/side/right-side-doors-closed.png" },
    { name: "right-side-doors-open", path: "/tilemaps/doors/side/right-side-doors-open.png" },
    { name: "left-side-door-closed", path: "/tilemaps/doors/side/left-side-doors-closed.png" },
    { name: "left-side-door-open", path: "/tilemaps/doors/side/left-side-doors-open.png" },
    { name: "right-side-door-closed", path: "/tilemaps/doors/side/right-side-doors-closed.png" },
    { name: "right-side-door-open", path: "/tilemaps/doors/side/right-side-doors-open.png" },
  ],

  tilemaps: [
    { key: "static-map", path: "/tilemaps/map-agency.json" }
  ],
  atlas: [],
  spritesheets: [
    { name: "hacker", path: "/spritesheets/hacker.png", width: 32, height: 45, frames: 12 },
    { name: "scientist", path: "/spritesheets/scientist.png", width: 32, height: 45, frames: 12 },
    { name: "policeman", path: "/spritesheets/policeman.png", width: 32, height: 45, frames: 12 }
  ],
  sounds: [
    { name: "menu-theme", paths: ["/music/menu.mp3"] },
    { name: "level-1-theme", paths: ["/music/level-1.mp3"] },
    { name: "rain-sfx", paths: ["/sounds/rain.mp3"] },
    { name: "step-sfx", paths: ["/sounds/step.mp3"] }
  ],
  videos: [
    { name: 'bg-menu', path: '/videos/bg-menu.mp4' }
  ],
  scripts: [],

  fonts: [
    { key: 'Boldonse', path: '/fonts/Boldonse.ttf' },
    { key: 'DigitalDisco', path: '/fonts/DigitalDisco.ttf' }
  ],

  webfonts: [
    { key: 'Roboto' },
    { key: 'Pixelify Sans' },
    { key: 'Bungee Tint' }
  ],

  bitmapfonts: [],
};

export default GameData;
