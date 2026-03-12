import { GameData } from "../../GameData";

export default class Boot extends Phaser.Scene {
  constructor(){ super({ key: "Boot" }); }
  private _loadingText: Phaser.GameObjects.Text;

  init(){
    this._loadingText = this.add
      .text(this.game.canvas.width / 2, GameData.preloader.loadingTextY, "")
      .setAlpha(1)
      .setDepth(1001)
      .setOrigin(0.5, 1)
      .setColor(GameData.preloader.loadingTextColor)
      .setFontSize(40)
      .setFontFamily(GameData.preloader.loadingTextFont);
  }

  create(){
    this._loadingText.setText(GameData.preloader.loadingTextComplete);
    this.input.keyboard!.on("keydown", () => {
        this.scene.stop(this);
        this.scene.start("Minigame1");
    });
  }

}