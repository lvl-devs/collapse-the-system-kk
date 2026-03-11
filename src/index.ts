import "phaser";
import { GameData } from "./GameData";

// scenes
import Preloader from "./game/scenes/Preloader";
import Boot from "./game/scenes/Boot";
import Menu from "./game/scenes/Menu";
import GamePlay from "./game/scenes/GamePlay";
import Options from "./game/scenes/Options";
import PauseMenu from "./game/scenes/PauseMenu";
// import MiniGame1 from "./game/scenes/MiniGame1";
// import MiniGame2 from "./game/scenes/MiniGame2";
import MiniGame3 from "./game/scenes/MiniGame3";
// import MiniGame4 from "./game/scenes/MiniGame4";
// import MiniGame5 from "./game/scenes/MiniGame5";
// import MiniGame6 from "./game/scenes/MiniGame6";
// import MiniGame7 from "./game/scenes/MiniGame7";
// import MiniGame8 from "./game/scenes/MiniGame8";
// import MiniGame9 from "./game/scenes/MiniGame9";

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
      Options,
      PauseMenu,
      // MiniGame1,
      // MiniGame2,
      MiniGame3,
      // MiniGame4,
      // MiniGame5,
      // MiniGame6,
      // MiniGame7,
      // MiniGame8,
      // MiniGame9
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

  new Phaser.Game(config); // game initializing according to configs
});
