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
import Minigame1 from "./game/scenes/Minigame1";
import Minigame2 from "./game/scenes/Minigame2";
import Minigame3 from "./game/scenes/Minigame3";
import Minigame4 from "./game/scenes/Minigame4";
import Minigame5 from "./game/scenes/Minigame5";
import Minigame7 from "./game/scenes/Minigame7";
import Minigame9 from "./game/scenes/Minigame9";

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
      Minigame1,
      Minigame2,
      Minigame3,
      Minigame4,
      Minigame5,
      Minigame7,
      Minigame9,
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
