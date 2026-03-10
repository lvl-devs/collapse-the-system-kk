import Phaser from "phaser";

export default class GamePlay extends Phaser.Scene {

  private canOpenPause = true;

  constructor() {
    super("GamePlay");
  }

  create() {

    this.canOpenPause = true;

    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, "GAMEPLAY\nPress ESC to pause\nPress 1-9 for MiniGames\nPress 0 for GamePlay", {
        fontFamily: "Pixelify Sans",
        fontSize: "58px",
        color: "#70fdc2",
        align: "center",
      })
      .setOrigin(0.5);

    // -------- ESC (PAUSE MENU) --------

    const onEscPress = () => {

      if (!this.canOpenPause) return;

      this.canOpenPause = false;

      if (this.scene.isSleeping("PauseMenu")) {
        this.scene.wake("PauseMenu", { parentSceneKey: this.scene.key });
      } else {
        this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
      }

      this.scene.pause();
    };

    // -------- NUMBERS (MINIGAMES) --------

    const onNumberPress = (event: KeyboardEvent) => {

      const key = event.key;

      if (key === "0") {
        this.scene.start("GamePlay");
        return;
      }

      const sceneName = `MiniGame${key}`;

      if (this.scene.get(sceneName)) {
        console.log(`[GamePlay] Opening ${sceneName}`);
        this.scene.start(sceneName);
      }
    };

    // -------- RESUME --------

    const onResume = () => {
      this.canOpenPause = true;
      this.input.keyboard?.resetKeys();
    };

    // -------- CONTROLLI --------

    this.input.keyboard?.on("keydown-ESC", onEscPress);
    this.input.keyboard?.on("keydown", onNumberPress);

    this.events.on(Phaser.Scenes.Events.RESUME, onResume);

    // -------- CLEANUP --------

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {

      this.input.keyboard?.off("keydown-ESC", onEscPress);
      this.input.keyboard?.off("keydown", onNumberPress);

      this.events.off(Phaser.Scenes.Events.RESUME, onResume);

    });

  }

}