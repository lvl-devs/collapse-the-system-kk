import Phaser from "phaser";
import GameData from "../../GameData";

export default class Menu extends Phaser.Scene {
  constructor(){ super({ key: "Menu" }); }

  preload() {
    this.load.image("bg_logo", "../assets/images/bg_logo.png");
    this.load.image("title_img", "../assets/images/title.png");
  }
  
  create() {
    const { width, height } = this.scale;
    const items = [
      { label: "Play", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" },
    ];
    const bg = this.add.image(width / 2, height / 2, "bg_logo");
    const scale = Math.max(width / bg.width, height / bg.height);
    
    bg.setScale(scale);
    this.add
      .text(width * 0.05, height * 0.05, GameData.globals.gameTitle, {
        color: "#70fdc2",
        wordWrap: { width: width * 0.8 },
      })
      .setFontSize(150)
      .setFontFamily(GameData.preloader.loadingTextFont)
      .setScale(Math.min(width / 1920, height / 1080) * 1.05);

    items.forEach((item, index) => {
      const baseX = width * 0.05;
      const baseY = height * 0.6;
      const gap = 80;
      const startY = baseY + index * gap;
      
      this.add
        .text(baseX, startY, item.label.toUpperCase(), {
          color: "#70fdc2",
        })
        .setFontSize(60)
        .setFontFamily(GameData.preloader.loadingTextFont)
        .setShadow(3, 3, "#001E17", 0, false, true);
    });
  }
}