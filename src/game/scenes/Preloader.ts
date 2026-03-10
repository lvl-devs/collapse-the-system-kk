import { GameData } from "../../GameData";
import AssetPipeline from "../systems/AssetPipeline";

export default class Preloader extends Phaser.Scene {
  constructor(){ super({ key: "Preloader" }); }
  private _loadingText: Phaser.GameObjects.Text;
  private _image: Phaser.GameObjects.Image;

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

  preload(){
    this.cameras.main.setBackgroundColor(GameData.globals.bgColor);
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    this.load.on('progress', (value: any) => this._loadingText.setText(`Loading: ${Math.round(value * 100)}%`) );
    this.loadAssets();

  }

  create(){
    this._image = this.add.image(this.game.canvas.width / 2, this.game.canvas.height / 2, "bg_logo").setAlpha(0).setScale(0.25);
    // Esempio di caricamento nel Preloader.ts

    this.tweens.add({
      targets: this._image,
      alpha: 1,
      duration: 500
    });
  }

  update(){ this._image.angle += 1; }

  loadAssets(){
    this.load.on("start", () => { });
    this.load.on("complete", () => {
      this.scene.stop(this);
      this.scene.start("Boot");
    });

    AssetPipeline.preloadCritical(this);

    // WEB FONTS
    if (GameData.webfonts != null) {
      GameData.webfonts.forEach((font) => {
        const googleFontUrl = `https://fonts.googleapis.com/css2?family=${font.key.replace(/ /g, '+')}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
        const fontStyle = document.createElement('link');
        fontStyle.rel = 'stylesheet';
        fontStyle.href = googleFontUrl;
        document.head.appendChild(fontStyle);
      });
    }
  }

}
