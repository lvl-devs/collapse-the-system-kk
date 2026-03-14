import "phaser";
import { GameData } from "./GameData";

import Intro from "./game/scenes/Intro";
import Preloader from "./game/scenes/Preloader";
import Boot from "./game/scenes/Boot";
import Menu from "./game/scenes/Menu";
import MenuBackdrop from "./game/scenes/MenuBackdrop";
import GamePlay from "./game/scenes/GamePlay";
import Options from "./game/scenes/Options";
import Credits from "./game/scenes/Credits";
import PauseMenu from "./game/scenes/PauseMenu";

window.addEventListener("load", () => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: GameData.globals.bgColor,
    parent: "app",
    scale: {
      mode: Phaser.Scale.FIT,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    scene: [
      Intro,
      Preloader,
      Boot,
      MenuBackdrop,
      Menu,
      GamePlay,
      Options,
      Credits,
      PauseMenu,
    ],
    physics: {
      default: "arcade",
      arcade: { debug: false }
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
      baseURL: "/assets/"
    }
  };

  new Phaser.Game(config);
});
