import "phaser";
import { GameData } from "./GameData";

import Preloader from "./game/scenes/Preloader";
import Boot from "./game/scenes/Boot";
import Menu from "./game/scenes/Menu";
import MenuBackdrop from "./game/scenes/MenuBackdrop";
import GamePlay from "./game/scenes/GamePlay";
import Options from "./game/scenes/Options";
import Credits from "./game/scenes/Credits";
import PauseMenu from "./game/scenes/PauseMenu";
import Introduction from "./game/scenes/CutScenes/Introduction";
import Scene1 from "./game/scenes/scene-1";
import Scene2 from "./game/scenes/scene-2";
import Scene3 from "./game/scenes/scene-3";
import Scene4 from "./game/scenes/scene-4";


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
      Preloader,
      Boot,
      MenuBackdrop,
      Menu,
      GamePlay,
      Options,
      Credits,
      PauseMenu,
      Introduction,
      Scene1,
      Scene2,
      Scene3,
      Scene4
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
