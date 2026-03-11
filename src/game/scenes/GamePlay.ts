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
      .text(width / 2, height / 2, "GAMEPLAY\nPress ESC to pause\nPress E for MiniGame", {
        fontFamily: "Pixelify Sans",
        fontSize: "58px",
        color: "#70fdc2",
        align: "center",
      })
      .setOrigin(0.5);


    // -------- ESC (PAUSE MENU) --------

    const onEscPress = () => {
      console.log("[GamePlay] ESC pressed");

      if (!this.canOpenPause) {
        return;
      }

      this.canOpenPause = false;

      if (this.scene.isSleeping("PauseMenu")) {
        this.scene.wake("PauseMenu", { parentSceneKey: this.scene.key });
      } else {
        this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
      }

      this.scene.pause();
    };


    // -------- E (MINIGAME) --------

    const onEPress = () => {
      console.log("[GamePlay] Opening MiniGame");

      this.scene.start("MiniGame"); // cambia scena completamente
    };


    // -------- RESUME --------

    const onResume = () => {
      console.log("[GamePlay] resumed");
      this.canOpenPause = true;
      this.input.keyboard?.resetKeys();
    };


    // -------- CONTROLLI --------

    this.input.keyboard?.on("keydown-ESC", onEscPress);
    this.input.keyboard?.on("keydown-E", onEPress);

    this.events.on(Phaser.Scenes.Events.RESUME, onResume);


    // -------- CLEANUP --------

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {

      this.input.keyboard?.off("keydown-ESC", onEscPress);
      this.input.keyboard?.off("keydown-E", onEPress);

      this.events.off(Phaser.Scenes.Events.RESUME, onResume);

    });

  }

}