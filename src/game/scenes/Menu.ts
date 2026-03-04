import Phaser from "phaser";
import GameData from "../../GameData";

export default class Menu extends Phaser.Scene {
  constructor() {
    super({ key: "Menu" });
  }

  preload(){ }

  create() {
    const { width, height } = this.scale;
    const items = [
      { label: "Play", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" },
    ];

    const bgVideo = this.add.video(width / 2, height / 2, "bg-menu");
    bgVideo.setOrigin(0.5);
    bgVideo.play(true); // loop
    const baseX = width * 0.055;
    const baseY = height * 0.6;
    const gap = 80;

    this.add
      .image(width * 0.01, height * 0.055, "title_img")
      .setOrigin(0, 0)
      .setScale(Math.min(width / 1920, height / 1080) * 1.05);

    items.forEach((item, index) => {
      const startY = baseY + index * gap;

      this.add
        .text(baseX, startY, item.label.toUpperCase(), {
          fontSize: "32px",
          color: "#70fdc2",
          resolution: 1,
        })
        .setFontSize(60)
        .setFontFamily(GameData.preloader.loadingTextFont)
        .setOrigin(0, 0.25)
        .setShadow(3, 3, "#001E17", 0, false, true);
    });
  }
}