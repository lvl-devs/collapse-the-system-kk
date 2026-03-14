import Phaser from "phaser";
import { GameData } from "../../GameData";

export default class Intro extends Phaser.Scene {
  constructor() {
    super({ key: "Intro" });
  }

  preload() {
    this.cameras.main.setBackgroundColor(GameData.globals.bgColor);
    
    // Temporarily reset the baseURL to load from the public root instead of /assets/
    const previousBaseURL = this.load.baseURL;
    this.load.setBaseURL("");
    this.load.setPath("");
    
    this.load.image("favicon", "favicon.png");
    
    this.load.once("complete", () => {
        this.load.setBaseURL(previousBaseURL);
    });
  }

  create() {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

    const logo = this.add.image(screenCenterX, screenCenterY, "favicon").setAlpha(0);

    // Scale down the favicon if it's too big, or scale it up if it's too small
    const targetScale = Math.min(this.cameras.main.width / logo.width, this.cameras.main.height / logo.height) * 0.4;
    logo.setScale(targetScale);

    this.tweens.add({
      targets: logo,
      alpha: 1,
      duration: 1000,
      ease: "Power2",
      yoyo: true,
      hold: 1000,
      onComplete: () => {
        this.scene.start("Preloader");
      }
    });
  }
}
