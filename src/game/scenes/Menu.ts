import Phaser from "phaser";
import { GameData } from '../../GameData';

export default class Menu extends Phaser.Scene {

  constructor(){ 
    super({ key: "Menu" }); 
  }

  preload() {  
    this.load.image("bg_logo", "../assets/images/bg_logo.png");
  }
  
  create() {

    const { width, height } = this.scale;

    // ===== BACKGROUND CENTRATO CORRETTAMENTE =====
    const bg = this.add.image(width / 2, height / 2, "bg_logo");

    // scala mantenendo proporzioni
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    // ===== TITOLO (ALTO SINISTRA) =====
    const title = this.add
      .text(40, 40, "Collapse the sistem", {
        fontFamily: GameData.preloader.loadingTextFont,
        fontSize: "72px", // ingrandito
        fontStyle: "bold",
        color: "#00f5ff"
      })
      .setOrigin(0)
      .setDepth(10);

    // glow leggero
    title.setShadow(0, 0, "#00f5ff", 20, true, true);

    // ===== MENU ITEMS (BASSO SINISTRA) =====
    const options = [
      { label: "Play", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" }
    ];

    const startY = height - 180;

    options.forEach((btn, index) => {

      const item = this.add
        .text(40, startY + index * 55, btn.label, {
          fontFamily: GameData.preloader.loadingTextFont,
          fontSize: "36px",
          color: "#ffffff"
        })
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      // Hover effect pulito
      item.on("pointerover", () => {
        item.setColor("#ff00ff");
        item.setScale(1.08);
      });

      item.on("pointerout", () => {
        item.setColor("#ffffff");
        item.setScale(1);
      });

      // Click
      item.on("pointerdown", () => {
        this.scene.start(btn.scene);
      });
    });
  }
}