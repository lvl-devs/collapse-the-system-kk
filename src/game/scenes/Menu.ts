import Phaser from "phaser";

export default class Menu extends Phaser.Scene {

  constructor() { 
    super({ key: "Menu" }); 
  }

  preload() {  
    this.load.image("bg_logo", "../assets/images/bg_logo.png");
    this.load.image("title_img", "../assets/images/title.png");
  }
  
  create() {

    const { width, height } = this.scale;

    // ===== SFONDO =====
    const bg = this.add.image(width / 2, height / 2, "bg_logo");
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale);

    // Colori neon
    const mainGreen = "#70fdc2";
    const shadowGreen = "#001E17";

    // ===== TITOLO =====
    const title = this.add.image(
      width * 0.01,
      height * 0.055,
      "title_img"
    )
    .setOrigin(0, 0)
    .setScale(
      Math.min(width / 1920, height / 1080) * 1.05
    );

    // ===== MENU =====
    const items = [
      { label: "Play", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" }
    ];

    const baseX = width * 0.055;
    const baseY = height * 0.60;
    const gap = 80;

    items.forEach((item, index) => {

  const startY = baseY + index * gap;

  const txt = this.add.text(
    baseX,
    startY,
    item.label.toUpperCase(),
    {
      fontFamily: '"Press Start 2P"',
      fontSize: "32px",
      color: "#70fdc2",
      resolution: 1
    }
  );

  txt.setOrigin(0, 0.5);

  // Ombra pixel dura (no blur)
  txt.setShadow(3, 3, "#001E17", 0, false, true);

  // ===== MOVIMENTO PIXEL SU/GIÙ (a step) =====
  this.tweens.add({
    targets: txt,
    y: startY - 3,
    duration: 1200,
    yoyo: true,
    repeat: -1,
    ease: "Linear"   // niente easing moderno
  });

  let vibrateEvent: Phaser.Time.TimerEvent | null = null;

  txt.setInteractive({ useHandCursor: true })

    .on("pointerover", () => {

      txt.setTint(0xffffff);

      // ===== VIBRAZIONE PIXEL ORIZZONTALE (a scatti) =====
      vibrateEvent = this.time.addEvent({
        delay: 40,
        loop: true,
        callback: () => {
          txt.x = baseX + (Math.random() > 0.5 ? 2 : -2);
        }
      });

    })

    .on("pointerout", () => {

      txt.clearTint();

      if (vibrateEvent) {
        vibrateEvent.remove();
        vibrateEvent = null;
      }

      txt.x = baseX;
    })

    .on("pointerdown", () => {

      this.tweens.add({
        targets: txt,
        scale: 0.9,
        duration: 80,
        yoyo: true,
        ease: "Linear"
      });

      this.cameras.main.fadeOut(200, 0, 0, 0);

      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start(item.scene);
      });
    });
});
  }
}
