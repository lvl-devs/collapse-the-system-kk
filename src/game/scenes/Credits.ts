import Phaser from "phaser";
import GameData from "../../GameData";
import MusicManager from "../audio/MusicManager";
import SfxManager from "../audio/SfxManager";

export default class Credits extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";

  private overlay?: Phaser.GameObjects.Rectangle;
  private scanlines?: Phaser.GameObjects.TileSprite;

  private title?: Phaser.GameObjects.Text;
  private leftText?: Phaser.GameObjects.Text;
  private rightText?: Phaser.GameObjects.Text;
  private backArrow?: Phaser.GameObjects.Text;

  private leftWrap?: Phaser.GameObjects.Container;
  private rightWrap?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "Credits" });
  }

  create() {
    this.sound.pauseOnBlur = false;

    if (!this.scene.isActive("MenuBackdrop") && !this.scene.isSleeping("MenuBackdrop")) {
      this.scene.launch("MenuBackdrop");
    } else if (this.scene.isSleeping("MenuBackdrop")) {
      this.scene.wake("MenuBackdrop");
    }
    this.scene.sendToBack("MenuBackdrop");

    MusicManager.start(this, Credits.MENU_MUSIC_KEY, {
      loop: true,
      volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6),
    });

    SfxManager.start(this, Credits.RAIN_SFX_KEY, {
      loop: true,
      volume: GameData.sfxVolume ?? 0.7,
    });

    // ===== BACKGROUND =====
    // overlay scuro per contrasto
    this.overlay = this.add.rectangle(0, 0, 10, 10, 0x000000, 0.32);

    // scanlines (texture generata)
    const texKey = "scanline_1px";
    if (!this.textures.exists(texKey)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x000000, 0.0);
      g.fillRect(0, 0, 2, 4);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(0, 0, 2, 1);
      g.fillStyle(0x000000, 0.0);
      g.fillRect(0, 1, 2, 3);
      g.generateTexture(texKey, 2, 4);
      g.destroy();
    }
    this.scanlines = this.add.tileSprite(0, 0, 10, 10, texKey);
    this.scanlines.setAlpha(0.25);

    // ===== TITLE =====
    this.title = this.add
      .text(0, 0, "C R E D I T S", {
        fontFamily: "Pixelify Sans",
        fontSize: "64px",
        color: "#70fdc2",
      })
      .setOrigin(0.5);

    this.title.setShadow(2, 2, "#000000", 0);

    // ===== CREDITS TEXT =====
    const leftCredits = ["GAME DESIGN", "pH@ntom, conan","", "PROGRAMMING", "mokkek, pH@ntom,", "conan, ndreW, pako"];

    const rightCredits = ["ART", "thatslory", "", "MUSIC & SOUND", "thatslory, pako"];

    this.leftText = this.add
      .text(0, 0, leftCredits, {
        fontFamily: "Pixelify Sans",
        fontSize: "30px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 12,
      })
      .setOrigin(0.5);

    this.rightText = this.add
      .text(0, 0, rightCredits, {
        fontFamily: "Pixelify Sans",
        fontSize: "30px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 12,
      })
      .setOrigin(0.5);

    this.leftWrap = this.add.container(0, 0, [this.leftText]);
    this.rightWrap = this.add.container(0, 0, [this.rightText]);

    // ===== BACK ARROW (STATICA) =====
    this.backArrow = this.add
      .text(0, 0, "<", {
        fontFamily: "Pixelify Sans",
        fontSize: "48px",
        color: "#70fdc2",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // ✅ niente hover color/scale: resta statica
    this.backArrow.on("pointerdown", () => {
      SfxManager.start(this, "ui_click", { volume: 0.6 });
      this.scene.start("Menu");
    });

    // layout iniziale + resize dinamico
    this.layout();
    this.scale.on("resize", this.layout, this);

    // ✅ animazione intro SEMPRE (ogni volta che entri in Credits)
    this.playIntro();

    // scanlines che scorrono (solo la texture, NON muove testi)
    this.time.addEvent({
      loop: true,
      delay: 30,
      callback: () => {
        if (this.scanlines) this.scanlines.tilePositionY += 0.35;
      },
    });

    // pulizia listener
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.layout, this);
    });

    // ESC per tornare indietro (+ anche BACKSPACE + freccia sinistra)
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const backKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    const leftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);

    const goBack = () => this.scene.start("Menu");

    escKey?.on("down", goBack);
    backKey?.on("down", goBack);
    leftKey?.on("down", goBack);
  }

  private layout() {
    const width = this.scale.width;
    const height = this.scale.height;

    const margin = Math.max(20, Math.round(Math.min(width, height) * 0.04));

    // overlay / scanlines full screen
    this.overlay?.setPosition(width / 2, height / 2).setSize(width, height);
    this.scanlines?.setPosition(width / 2, height / 2).setSize(width, height);

    // font sizes
    const titleSize = Phaser.Math.Clamp(Math.round(height * 0.09), 42, 90);
    const textSize = Phaser.Math.Clamp(Math.round(height * 0.045), 20, 40);
    const arrowSize = Phaser.Math.Clamp(Math.round(height * 0.07), 32, 60);

    this.title?.setFontSize(titleSize);
    this.leftText?.setFontSize(textSize);
    this.rightText?.setFontSize(textSize);
    this.backArrow?.setFontSize(arrowSize);

    // posizioni base
    const titleY = margin + titleSize * 0.6;
    this.title?.setPosition(width / 2, titleY);

    this.backArrow?.setPosition(margin + arrowSize * 0.35, margin + arrowSize * 0.35);

    // colonne
    const isNarrow = width < 750;

    if (isNarrow) {
      this.leftWrap?.setPosition(width / 2, height * 0.50);
      this.rightWrap?.setPosition(width / 2, height * 0.70);
    } else {
      this.leftWrap?.setPosition(width * 0.33, height * 0.50);
      this.rightWrap?.setPosition(width * 0.67, height * 0.50);
    }
  }

  // ✅ intro che parte ogni volta
  private playIntro() {
    if (!this.title || !this.leftWrap || !this.rightWrap) return;

    // stop eventuali tween vecchi (se rientri spesso)
    this.tweens.killTweensOf(this.title);
    this.tweens.killTweensOf(this.leftWrap);
    this.tweens.killTweensOf(this.rightWrap);

    // reset stato iniziale
    this.title.setAlpha(0);
    this.leftWrap.setAlpha(0);
    this.rightWrap.setAlpha(0);

    this.title.y -= 18;
    this.leftWrap.x -= 22;
    this.rightWrap.x += 22;

    // title in
    this.tweens.add({
      targets: this.title,
      alpha: 1,
      y: this.title.y + 18,
      duration: 520,
      ease: "Sine.Out",
    });

    // columns in
    this.tweens.add({
      targets: this.leftWrap,
      alpha: 1,
      x: this.leftWrap.x + 22,
      duration: 620,
      delay: 120,
      ease: "Sine.Out",
    });

    this.tweens.add({
      targets: this.rightWrap,
      alpha: 1,
      x: this.rightWrap.x - 22,
      duration: 620,
      delay: 160,
      ease: "Sine.Out",
    });
  }
}
