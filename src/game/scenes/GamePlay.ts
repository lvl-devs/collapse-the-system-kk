export default class GamePlay extends Phaser.Scene {
  private canOpenPause = true; // Simple flag to control pause menu

  constructor() { super({ key: "GamePlay" }); }

  preload(){ }

  create(){
    console.log("[GamePlay] create() called");
    this.canOpenPause = true; // Reset flag on create
    
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, "GAMEPLAY\nPress ESC to pause", {
        fontFamily: "Pixelify Sans",
        fontSize: "58px",
        color: "#70fdc2",
        align: "center",
      })
      .setOrigin(0.5);

    const onEscPress = () => {
      console.log("[GamePlay] ESC pressed - canOpenPause:", this.canOpenPause);
      
      if (!this.canOpenPause) {
        console.log("[GamePlay] Pause disabled, ignoring ESC");
        return;
      }

      console.log("[GamePlay] Opening PauseMenu");
      this.canOpenPause = false; // Disable until resumed
      
      // Use wake if scene is sleeping, otherwise launch
      if (this.scene.isSleeping("PauseMenu")) {
        console.log("[GamePlay] Waking sleeping PauseMenu");
        this.scene.wake("PauseMenu", { parentSceneKey: this.scene.key });
      } else {
        console.log("[GamePlay] Launching new PauseMenu");
        this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
      }
      this.scene.pause();
    };

    const onResume = () => {
      console.log("[GamePlay] onResume - re-enabling pause");
      this.canOpenPause = true; // Re-enable pause menu
      this.input.keyboard?.resetKeys();
    };

    this.input.keyboard?.on("keydown-ESC", onEscPress);
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      console.log("[GamePlay] shutdown event - cleaning up");
      this.input.keyboard?.off("keydown-ESC", onEscPress);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
    });
  }

}
