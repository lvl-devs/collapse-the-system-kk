import { GameData } from "../../GameData";

export default class Boot extends Phaser.Scene {

  constructor() { 
    super({ key: "Boot" }); 
  }

  private _loadingText!: Phaser.GameObjects.Text;
  private _percentText!: Phaser.GameObjects.Text;
  private _progressBar!: Phaser.GameObjects.Graphics;
  private _progressBox!: Phaser.GameObjects.Graphics;

  init() {

    const centerX = this.game.canvas.width / 2;
    const centerY = this.game.canvas.height / 2;

    // TESTO BOOT
    this._loadingText = this.add
      .text(centerX, GameData.preloader.loadingTextY, "BOOTING SYSTEM...")
      .setAlpha(1)
      .setDepth(1001)
      .setOrigin(0.5, 1)
      .setColor(GameData.preloader.loadingTextColor)
      .setFontSize(40)
      .setFontFamily(GameData.preloader.loadingTextFont);

    // BOX barra
    this._progressBox = this.add.graphics();
    this._progressBox.fillStyle(0x222222, 0.8);
    this._progressBox.fillRect(centerX - 160, centerY - 20, 320, 40);

    // BARRA
    this._progressBar = this.add.graphics();

    // TESTO %
    this._percentText = this.add
      .text(centerX, centerY + 5, "0%")
      .setOrigin(0.5)
      .setColor("#ffffff")
      .setFontSize(22);
  }

  create() {
    this.simulateLoading();
  }

  private simulateLoading() {

    let progress = 0;

    const timer = this.time.addEvent({
      delay: 60,
      callback: () => {

        progress += 2;

        this._progressBar.clear();
        this._progressBar.fillStyle(0x00ffff, 1);
        this._progressBar.fillRect(
          this.game.canvas.width / 2 - 150,
          this.game.canvas.height / 2 - 10,
          3 * progress,
          20
        );

        this._percentText.setText(progress + "%");

        if (progress >= 100) {
          timer.remove(false);
          this.triggerError();
        }

      },
      loop: true
    });
  }

  private triggerError() {

    // Delay prima del glitch
    this.time.delayedCall(500, () => {

      // Camera shake
      this.cameras.main.shake(500, 0.01);

      // Cambia testo
      this._loadingText.setText("SYSTEM FAILURE");

      // Scritta ERROR gigante
      const errorText = this.add.text(
        this.game.canvas.width / 2,
        this.game.canvas.height / 2 + 100,
        "ERROR",
        {
          fontSize: "72px",
          color: "#ff0033",
          fontStyle: "bold"
        }
      ).setOrigin(0.5);

      // Effetto glitch (tremolio)
      this.tweens.add({
        targets: errorText,
        x: errorText.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 25
      });

      this.time.delayedCall(2000, () => {
        this.scene.start("Menu");
      });

    });
  }

}