import Phaser from "phaser";
import { GameData } from "../../GameData"; // adattalo se il path è diverso
import SfxManager from "../audio/SfxManager";

type SliderConfig = {
  label: string;
  x: number;
  y: number;
  width: number;
  initial: number; // 0..1
  onChange: (v: number) => void;
};

export default class Options extends Phaser.Scene {
  constructor() {
    super("Options");
  }

  create() {
    SfxManager.init(this, GameData.sfxVolume ?? 0.7);

    const { width, height } = this.scale;

    // Background (leggermente “spento” come nello screenshot)
    const bg = this.add.image(width / 2, height / 2, "bg_logo");
    this.scaleToCover(bg, width, height);
    bg.setAlpha(0.75);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25);

    // Panel geometry (centrato)
    const panelW = Math.round(width * 0.28);
    const panelH = Math.round(height * 0.62);
    const panelX = Math.round(width * 0.50);
    const panelY = Math.round(height * 0.50);

    const neon = 0x4fffbf;

    // Panel outline
    const panel = this.add.graphics();
    panel.lineStyle(3, neon, 0.85);
    this.roundRectStroke(panel, panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 14);

    // Header box
    const headerH = Math.round(height * 0.085);
    const headerW = Math.round(panelW * 0.88);
    const headerY = panelY - panelH / 2 - Math.round(height * 0.01);

    const header = this.add.graphics();
    header.lineStyle(3, neon, 0.85);
    this.roundRectStroke(
      header,
      panelX - headerW / 2,
      headerY,
      headerW,
      headerH,
      10
    );

    const headerTxt = this.add
      .text(panelX, headerY + headerH / 2, "SETTINGS", {
        fontFamily: "monospace",
        fontSize: `${Math.round(height * 0.055)}px`,
        color: "#4fffbf",
      })
      .setOrigin(0.5);
    headerTxt.setShadow(2, 2, "#0b5b47", 0, true, true);

    // Inner “slots” (Sound Effects + Music) con box stile screenshot
    const slotW = Math.round(panelW * 0.78);
    const slotH = Math.round(height * 0.085);
    const slotX = panelX;
    const slot1Y = panelY - Math.round(panelH * 0.13);
    const slot2Y = panelY;

    this.drawSlot(slotX, slot1Y, slotW, slotH, "Sound Effects", neon, height);
    this.drawSlot(slotX, slot2Y, slotW, slotH, "Music", neon, height);

    // Slider bars
    const sliderW = Math.round(slotW * 0.78);
    const sliderX = panelX - sliderW / 2;
    const slider1Y = slot1Y + Math.round(slotH * 0.58);
    const slider2Y = slot2Y + Math.round(slotH * 0.58);

    this.createSlider({
      label: "sfx",
      x: sliderX,
      y: slider1Y,
      width: sliderW,
      initial: GameData.sfxVolume ?? 0.7,
      onChange: (v) => {
        GameData.sfxVolume = v;
        SfxManager.setVolume(v);
      },
    });

    this.createSlider({
      label: "music",
      x: sliderX,
      y: slider2Y,
      width: sliderW,
      initial: GameData.musicVolume ?? 0.6,
      onChange: (v) => {
        GameData.musicVolume = v;
        // Se avete un'istanza di musica:
        // GameData.music?.setVolume(v);
      },
    });

    // Back button (cerchio)
    const backR = Math.round(height * 0.05);
    const backCX = panelX;
    const backCY = panelY + Math.round(panelH * 0.32);

    const backG = this.add.graphics();
    backG.lineStyle(3, neon, 0.85);
    backG.strokeCircle(backCX, backCY, backR);

    const backTxt = this.add
      .text(backCX, backCY, "Back", {
        fontFamily: "monospace",
        fontSize: `${Math.round(height * 0.03)}px`,
        color: "#4fffbf",
      })
      .setOrigin(0.5);
    backTxt.setShadow(2, 2, "#0b5b47", 0, true, true);

    const backHit = this.add.circle(backCX, backCY, backR + 6, 0x000000, 0.001);
    backHit.setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        backTxt.setColor("#a9ffe2");
        backG.setAlpha(1);
      })
      .on("pointerout", () => {
        backTxt.setColor("#4fffbf");
        backG.setAlpha(0.85);
      })
      .on("pointerdown", () => {
        SfxManager.play("ui_click", { volume: 0.6 });
        this.scene.start("Menu");
      });

    // Responsivo
    this.scale.on("resize", () => this.scene.restart());
  }

  private drawSlot(cx: number, cy: number, w: number, h: number, label: string, neon: number, screenH: number) {
    const g = this.add.graphics();
    g.lineStyle(3, neon, 0.85);
    this.roundRectStroke(g, cx - w / 2, cy - h / 2, w, h, 10);

    const t = this.add.text(cx, cy, label, {
      fontFamily: "monospace",
      fontSize: `${Math.round(screenH * 0.035)}px`,
      color: "#e8fff7",
    }).setOrigin(0.5);

    t.setShadow(2, 2, "#0b5b47", 0, true, true);
  }

  private createSlider(cfg: SliderConfig) {
    const neon = 0x4fffbf;

    // dotted baseline
    const base = this.add.graphics();
    base.lineStyle(2, neon, 0.45);
    base.beginPath();
    base.moveTo(cfg.x, cfg.y);
    base.lineTo(cfg.x + cfg.width, cfg.y);
    base.strokePath();

    // small dots
    const dots = this.add.graphics();
    dots.fillStyle(neon, 0.35);
    const step = 12;
    for (let x = cfg.x; x <= cfg.x + cfg.width; x += step) {
      dots.fillRect(x, cfg.y - 1, 4, 2);
    }

    // knob (quadratino)
    const knobSize = 14;
    const knob = this.add.rectangle(0, 0, knobSize, knobSize, 0x000000, 0.0);
    knob.setStrokeStyle(3, neon, 0.9);

    const startX = cfg.x + Phaser.Math.Clamp(cfg.initial, 0, 1) * cfg.width;
    knob.setPosition(startX, cfg.y);

    knob.setInteractive({ draggable: true, useHandCursor: true });

    this.input.setDraggable(knob);

    const updateFromX = (px: number) => {
      const clamped = Phaser.Math.Clamp(px, cfg.x, cfg.x + cfg.width);
      knob.x = clamped;
      const v = (clamped - cfg.x) / cfg.width;
      cfg.onChange(Phaser.Math.Clamp(v, 0, 1));
    };

    knob.on("drag", (_p: any, dragX: number) => updateFromX(dragX));

    // anche click sulla linea
    const hit = this.add.rectangle(cfg.x + cfg.width / 2, cfg.y, cfg.width, 28, 0x000000, 0.001);
    hit.setInteractive({ useHandCursor: true }).on("pointerdown", (p: Phaser.Input.Pointer) => {
      updateFromX(p.worldX);
    });

    // init
    cfg.onChange(Phaser.Math.Clamp(cfg.initial, 0, 1));
  }

  private roundRectStroke(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number) {
    g.strokeRoundedRect(x, y, w, h, r);
    // piccole “tacche” decorative (simile frame HUD)
    g.lineStyle(2, 0x4fffbf, 0.5);
    g.beginPath();
    g.moveTo(x + 10, y);
    g.lineTo(x + 26, y);
    g.moveTo(x + w - 26, y + h);
    g.lineTo(x + w - 10, y + h);
    g.strokePath();
  }

  private scaleToCover(img: Phaser.GameObjects.Image, w: number, h: number) {
    const iw = img.width;
    const ih = img.height;
    const scale = Math.max(w / iw, h / ih);
    img.setScale(scale);
  }
}
