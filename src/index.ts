import "phaser";
import { GameData } from "./GameData";

// scenes
import Preloader from "./game/scenes/Preloader";
import Boot from "./game/scenes/Boot";
import Menu from "./game/scenes/Menu";
import GamePlay from "./game/scenes/GamePlay";
import Options from "./game/scenes/Options";


window.addEventListener("load", () => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: GameData.globals.bgColor,
    parent: "app",
    scale: {
      mode: Phaser.Scale.FIT,
      // width: GameData.globals.gameWidth,
      // height: GameData.globals.gameHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [
      Preloader,
      Boot,
      Menu,
      GamePlay,
      Options
    ],
    physics: {
      default: "arcade",
      arcade: { debug: false, }
    },
    input: {
      activePointers: 2,
      keyboard: true,
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
    loader: {
      baseURL: '/assets/',
    },
  };

  const game = new Phaser.Game(config); // game initializing according to configs
});