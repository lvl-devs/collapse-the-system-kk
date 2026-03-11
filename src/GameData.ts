// =============================
// TYPE DEFINITIONS
// =============================

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

  // optional per-channel volumes (0..1)
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

// =============================
// GAME DATA OBJECT
// =============================

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

  sfxVolume: 0.7,
  musicVolume: 0.6,

  images: [
    { name: "bg_logo", path: "/images/bg_logo.png" },
    { name: "title_img", path: "/images/title.png" },
    { name: "button_1", path: "/images/1.png" },
    { name: "button_1_pressed", path: "/images/1_pressed.png" },
    { name: "button_2", path: "/images/2.png" },
    { name: "button_2_pressed", path: "/images/2_pressed.png" },
    { name: "button_3", path: "/images/3.png" },
    { name: "button_3_pressed", path: "/images/3_pressed.png" },
    { name: "button_4", path: "/images/4.png" },
    { name: "button_4_pressed", path: "/images/4_pressed.png" },
    { name: "button_5", path: "/images/5.png" },
    { name: "button_5_pressed", path: "/images/5_pressed.png" },
    { name: "button_6", path: "/images/6.png" },
    { name: "button_6_pressed", path: "/images/6_pressed.png" },
    { name: "button_7", path: "/images/7.png" },
    { name: "button_7_pressed", path: "/images/7_pressed.png" },
    { name: "button_8", path: "/images/8.png" },
    { name: "button_8_pressed", path: "/images/8_pressed.png" },
    { name: "button_9", path: "/images/9.png" },
    { name: "button_9_pressed", path: "/images/9_pressed.png" },
    { name: "button_0", path: "/images/0.png" },
    { name: "button_0_pressed", path: "/images/0_pressed.png" },
    { name: "button_c", path: "/images/c.png" },
    { name: "button_c_pressed", path: "/images/c_pressed.png" },
    { name: "button_ok", path: "/images/ok.png" },
    { name: "button_ok_pressed", path: "/images/ok_pressed.png" },
  ],

  tilemaps: [],
  atlas: [],
  spritesheets: [],
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
