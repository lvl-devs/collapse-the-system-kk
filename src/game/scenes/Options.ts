import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";
import MusicManager from "../audio/MusicManager";

type SliderCfg = {
  cx: number;
  cy: number;
  w: number;
  initial: number; // 0..1
  onChange: (v: number) => void;
};

type SliderOut = {
  container: Phaser.GameObjects.Container;
  knob: Phaser.GameObjects.Rectangle;
};

export default class Options extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";

  private menuMusic?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  private rainSfx?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

  constructor() {
    super("Options");
  }

  preload() {
    this.load.image("bg_options", "../assets/images/bg_credits.png");
  }

  create() {
    this.sound.pauseOnBlur = false;

    // Audio (come già fai)
    this.menuMusic = MusicManager.start(this, Options.MENU_MUSIC_KEY, {
      loop: true,
      volume: GameData.musicVolume ?? 0.6,
    }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

    this.rainSfx = SfxManager.start(this, Options.RAIN_SFX_KEY, {
      loop: true,
      volume: GameData.sfxVolume ?? 0.35,
    }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

    const { width, height } = this.scale;

    // ===== BACKGROUND =====
    const bg = this.add.image(width / 2, height / 2, "bg_options");
    const bgScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(bgScale);
    bg.setAlpha(0.9);

    // Overlay scuro per leggibilità
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35);

    // ===== LAYOUT RESPONSIVE =====
    const uBase = Math.min(width, height);

    // fattore di “fit” quando l’altezza è poca (zoom alto / finestra bassa)
    const fit = Phaser.Math.Clamp(height / (uBase * 1.05), 0.72, 1);

    const u = uBase * fit;
    const neon = 0x70fdc2;

    const panelW = Phaser.Math.Clamp(u * 0.52, 360, 520);
    const panelH = Phaser.Math.Clamp(u * 0.70, 420, 640);

    const panelX = width / 2;
    const panelY = height / 2 + u * 0.02;

    const headerW = panelW * 0.78;
    const headerH = u * 0.10;

    // ===== HEADER =====
    const headerY = panelY - panelH / 2 - headerH * 0.75;
    const headerBox = this.drawHudBox(panelX, headerY, headerW, headerH, neon, true);

    const headerText = this.add
      .text(panelX, headerY, "SETTINGS", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.round(u * 0.07)}px`,
        color: "#70fdc2",
      })
      .setOrigin(0.5);

    // ===== MAIN PANEL =====
    const panelBox = this.drawHudPanel(panelX, panelY, panelW, panelH, neon);

    // ===== SLOT BOXES =====
    const slotW = panelW * 0.78;
    const slotH = u * 0.12;

    const slot1Y = panelY - panelH * 0.23;
    const slot2Y = panelY - panelH * 0.01;

    const slot1Box = this.drawHudBox(panelX, slot1Y, slotW, slotH, neon, false);
    const slot2Box = this.drawHudBox(panelX, slot2Y, slotW, slotH, neon, false);

    // ===== LABELS =====
    const labelSize = Math.round(u * 0.05);

    const sfxLabel = this.add
      .text(panelX, slot1Y, "SOUND EFFECTS", {
        fontFamily: "Pixelify Sans",
        fontSize: `${labelSize}px`,
        color: "#EFFFF9",
      })
      .setOrigin(0.5);

    const musicLabel = this.add
      .text(panelX, slot2Y, "MUSIC", {
        fontFamily: "Pixelify Sans",
        fontSize: `${labelSize}px`,
        color: "#EFFFF9",
      })
      .setOrigin(0.5);

    // ===== SLIDERS =====
    const sliderW = slotW * 0.82;
    const slider1Y = slot1Y + slotH * 0.65;
    const slider2Y = slot2Y + slotH * 0.65;

    const slider1 = this.createHudSlider({
      cx: panelX,
      cy: slider1Y,
      w: sliderW,
      initial: GameData.sfxVolume ?? 0.7,
      onChange: (v) => {
        GameData.sfxVolume = v;
        if (this.rainSfx) this.rainSfx.setVolume(v);
      },
    });

    const slider2 = this.createHudSlider({
      cx: panelX,
      cy: slider2Y,
      w: sliderW,
      initial: GameData.musicVolume ?? 0.6,
      onChange: (v) => {
        GameData.musicVolume = v;
        if (this.menuMusic) this.menuMusic.setVolume(v);
      },
    });

    // ===== BACK =====
    const backY = panelY + panelH * 0.32;

    const backText = this.add
      .text(panelX, backY, "BACK", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.round(u * 0.06)}px`,
        color: "#70fdc2",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backText.on("pointerover", () => {
      backText.setColor("#FFFFFF");
      backText.setScale(1.08);
    });

    backText.on("pointerout", () => {
      backText.setColor("#70fdc2");
      backText.setScale(1);
    });

    backText.on("pointerdown", () => {
      SfxManager.start(this, "ui_click", { volume: 0.6 });
      this.scene.start("Menu");
    });

    // ESC per tornare indietro
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey?.on("down", () => this.scene.start("Menu"));

    this.scale.on("resize", () => {
    this.scene.restart();
  });

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.scale.off("resize");
  });

    // ✅ INTRO (sempre, ogni volta che entri nella scena)
    this.playIntro([
      headerBox,
      headerText,
      panelBox,
      slot1Box,
      slot2Box,
      sfxLabel,
      musicLabel,
      slider1.container,
      slider2.container,
      backText,
    ]);
  }

  // ==============================
  // INTRO (fade + slide) stile Credits
  // ==============================
  private playIntro(objs: Phaser.GameObjects.GameObject[]) {
    // reset stato
    for (const o of objs) {
      // @ts-expect-error: setAlpha/setY esistono su quasi tutti i GameObjects usati qui
      if (o.setAlpha) o.setAlpha(0);

      // sposta un filo in basso per la slide-in
      if (typeof (o as any).y === "number") (o as any).y += 14;
    }

    // tween unico con stagger
    this.tweens.add({
      targets: objs as any,
      alpha: 1,
      y: (target: any) => (typeof target.y === "number" ? target.y - 14 : target.y),
      duration: 520,
      ease: "Sine.Out",
      delay: this.tweens.stagger(70, {}),
    });
  }

  // ==============================
  // PANEL PRINCIPALE con "notch"
  // ==============================
  private drawHudPanel(cx: number, cy: number, w: number, h: number, neon: number) {
    const g = this.add.graphics();
    const x = cx - w / 2;
    const y = cy - h / 2;

    g.fillStyle(0x000000, 0.14);
    g.fillRoundedRect(x, y, w, h, 10);

    g.lineStyle(3, neon, 0.95);
    g.strokeRoundedRect(x, y, w, h, 10);

    g.lineStyle(1, neon, 0.35);
    g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 8);

    g.lineStyle(2, neon, 0.7);
    g.beginPath();
    g.moveTo(x + w * 0.12, y);
    g.lineTo(x + w * 0.22, y);
    g.moveTo(x + w * 0.78, y);
    g.lineTo(x + w * 0.88, y);
    g.strokePath();

    const notchW = w * 0.18;
    const notchH = h * 0.05;
    g.lineStyle(2, neon, 0.85);
    g.strokeRoundedRect(cx - notchW / 2, y + h - notchH / 2, notchW, notchH, 6);

    g.lineStyle(2, neon, 0.55);
    g.beginPath();
    g.moveTo(x, y + h * 0.20);
    g.lineTo(x, y + h * 0.30);
    g.moveTo(x + w, y + h * 0.62);
    g.lineTo(x + w, y + h * 0.72);
    g.strokePath();

    return g;
  }

  // ==============================
  // BOX HUD (header / slot)
  // ==============================
  private drawHudBox(cx: number, cy: number, w: number, h: number, neon: number, isHeader: boolean) {
    const g = this.add.graphics();
    const x = cx - w / 2;
    const y = cy - h / 2;

    g.fillStyle(0x000000, isHeader ? 0.14 : 0.10);
    g.fillRoundedRect(x, y, w, h, 8);

    g.lineStyle(3, neon, 0.95);
    g.strokeRoundedRect(x, y, w, h, 8);

    g.lineStyle(1, neon, 0.35);
    g.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 7);

    g.lineStyle(2, neon, 0.6);
    g.beginPath();
    g.moveTo(x + 10, y);
    g.lineTo(x + 30, y);
    g.moveTo(x + w - 30, y + h);
    g.lineTo(x + w - 10, y + h);
    g.strokePath();

    return g;
  }

  // ==============================
  // SLIDER HUD (linea + knob) + HOLD-TO-DRAG SULLA LINEA
  // ==============================
  private createHudSlider(cfg: SliderCfg): SliderOut {
    const neon = 0x70fdc2;

    const minX = cfg.cx - cfg.w / 2;
    const maxX = cfg.cx + cfg.w / 2;

    const base = this.add.graphics();
    base.lineStyle(3, neon, 0.65);
    base.beginPath();
    base.moveTo(minX, cfg.cy);
    base.lineTo(maxX, cfg.cy);
    base.strokePath();

    const inner = this.add.graphics();
    inner.lineStyle(1, neon, 0.35);
    inner.beginPath();
    inner.moveTo(minX, cfg.cy + 3);
    inner.lineTo(maxX, cfg.cy + 3);
    inner.strokePath();

    const knobSize = 16;
    const knob = this.add
      .rectangle(0, 0, knobSize, knobSize, 0x000000, 0.25)
      .setStrokeStyle(2, neon, 1);

    const setValueFromX = (x: number) => {
      const clamped = Phaser.Math.Clamp(x, minX, maxX);
      knob.x = clamped;
      const v = (clamped - minX) / cfg.w;
      cfg.onChange(Phaser.Math.Clamp(v, 0, 1));
    };

    setValueFromX(minX + Phaser.Math.Clamp(cfg.initial, 0, 1) * cfg.w);
    knob.y = cfg.cy;

    // hit area
    const hit = this.add.rectangle(cfg.cx, cfg.cy, cfg.w + 60, 44, 0x000000, 0.001);
    hit.setInteractive({ useHandCursor: true });

    // drag knob
    knob.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(knob);
    knob.on("drag", (_p: any, dragX: number) => setValueFromX(dragX));

    let holding = false;

    hit.on("pointerdown", (p: Phaser.Input.Pointer) => {
      holding = true;
      setValueFromX(p.worldX);
    });

    hit.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!holding) return;
      setValueFromX(p.worldX);
    });

    const stopHolding = () => (holding = false);

    hit.on("pointerup", stopHolding);
    hit.on("pointerupoutside", stopHolding);
    hit.on("pointerout", () => {
      if (!this.input.activePointer.isDown) holding = false;
    });

    // feedback knob
    knob.on("pointerover", () => {
      knob.setScale(1.15);
      knob.setFillStyle(0x000000, 0.35);
    });

    knob.on("pointerout", () => {
      knob.setScale(1);
      knob.setFillStyle(0x000000, 0.25);
    });

    knob.on("pointerdown", () => knob.setScale(1.1));
    knob.on("pointerup", () => knob.setScale(1.15));

    // container per animare tutto insieme
    const container = this.add.container(0, 0, [base, inner, hit, knob]);

    return { container, knob };
  }
}