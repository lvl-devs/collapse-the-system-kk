import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";
import MusicManager from "../audio/MusicManager";
import SettingsStorage from "../systems/SettingsStorage";

type SliderConfig = {
  label: string;
  x: number;
  y: number;
  width: number;
  initial: number;
  onChange: (v: number) => void;
};

type SliderOut = {
  container: Phaser.GameObjects.Container;
  knob: Phaser.GameObjects.Rectangle;
};

export default class Options extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";

  private returnMode: "menu" | "pause" = "menu";
  private pauseMenuSceneKey = "PauseMenu";

  private menuMusic?: Phaser.Sound.BaseSound;
  private rainSfx?: Phaser.Sound.BaseSound;

  constructor() {
    super("Options");
  }

  preload() {
    this.load.image("bg_options", "../assets/images/bg_credits.png");
  }

  init(data: OptionsSceneData): void {
    this.returnMode = data.returnMode ?? "menu";
    this.pauseMenuSceneKey = data.pauseMenuSceneKey ?? "PauseMenu";
  }

  create() {
    SettingsStorage.loadVolumeSettings();
    this.sound.pauseOnBlur = false;

    if (this.returnMode === "menu") {
      this.menuMusic = MusicManager.start(this, Options.MENU_MUSIC_KEY, {
        loop: true,
        volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6),
      });

      this.rainSfx = SfxManager.start(this, Options.RAIN_SFX_KEY, {
        loop: true,
        volume: GameData.sfxVolume ?? 0.7,
      });
    }

    const { width, height } = this.scale;

    const bg = this.add.image(width / 2, height / 2, "bg_logo");
    this.scaleToCover(bg, width, height);
    bg.setAlpha(0.75);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25);

    const panelW = Math.round(width * 0.28);
    const panelH = Math.round(height * 0.62);
    const panelX = Math.round(width * 0.50);
    const panelY = Math.round(height * 0.50);

    const neon = 0x4fffbf;

    const panel = this.add.graphics();
    panel.lineStyle(3, neon, 0.85);
    this.roundRectStroke(panel, panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 14);

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

    const slotW = Math.round(panelW * 0.78);
    const slotH = Math.round(height * 0.085);
    const slotX = panelX;
    const slot1Y = panelY - Math.round(panelH * 0.13);
    const slot2Y = panelY;

    this.drawSlot(slotX, slot1Y, slotW, slotH, "Sound Effects", neon, height);
    this.drawSlot(slotX, slot2Y, slotW, slotH, "Music", neon, height);

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
        SettingsStorage.saveSfxVolume(v);

        if (this.returnMode === "menu") {
          if (this.rainSfx) this.rainSfx.setVolume(v);
          else SfxManager.setVolume(this, Options.RAIN_SFX_KEY, v);
        }
      },
    });

    const slider2 = this.createHudSlider({
      cx: panelX,
      cy: slider2Y,
      w: sliderW,
      initial: GameData.musicVolume ?? 0.6,
      onChange: (v) => {
        GameData.musicVolume = v;
      },
    });

    const backR = Math.round(height * 0.05);
    const backCX = panelX;
    const backCY = panelY + Math.round(panelH * 0.32);

    const backG = this.add.graphics();
    backG.lineStyle(3, neon, 0.85);
    backG.strokeCircle(backCX, backCY, backR);

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
      SfxManager.start(this, "ui_click", { volume: 0.6 * (GameData.sfxVolume ?? 0.7) });
      this.goBack();
    });

    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey?.on("down", this.goBack, this);

    this.scale.on("resize", () => {
      this.scene.restart();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escKey?.off("down", this.goBack, this);
      this.scale.off("resize");
    });

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

  private goBack(): void {
    if (this.returnMode === "pause") {
      this.scene.stop();
      this.scene.resume(this.pauseMenuSceneKey);
      this.input.keyboard?.resetKeys();
      return;
    }

    this.scene.start("Menu");
  }

  private playIntro(objs: Phaser.GameObjects.GameObject[]) {
    for (const o of objs) {
      if ((o as any).setAlpha) (o as any).setAlpha(0);
      if (typeof (o as any).y === "number") (o as any).y += 14;
    }

    this.tweens.add({
      targets: objs as any,
      alpha: 1,
      y: (target: any) => (typeof target.y === "number" ? target.y - 14 : target.y),
      duration: 520,
      ease: "Sine.Out",
      delay: this.tweens.stagger(70, {}),
    });
  }

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

    this.scale.on("resize", () => this.scene.restart());
  }

  private drawHudBox(cx: number, cy: number, w: number, h: number, neon: number, isHeader: boolean) {
    const g = this.add.graphics();
    const x = cx - w / 2;
    const y = cy - h / 2;

    g.fillStyle(0x000000, isHeader ? 0.14 : 0.1);
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

    const dots = this.add.graphics();
    dots.fillStyle(neon, 0.35);
    const step = 12;
    for (let x = cfg.x; x <= cfg.x + cfg.width; x += step) {
      dots.fillRect(x, cfg.y - 1, 4, 2);
    }

    const knobSize = 14;
    const knob = this.add.rectangle(0, 0, knobSize, knobSize, 0x000000, 0.0);
    knob.setStrokeStyle(3, neon, 0.9);

    const setValueFromX = (x: number) => {
      const clamped = Phaser.Math.Clamp(x, minX, maxX);
      knob.x = clamped;
      const v = (clamped - minX) / cfg.w;
      cfg.onChange(Phaser.Math.Clamp(v, 0, 1));
    };

    setValueFromX(minX + Phaser.Math.Clamp(cfg.initial, 0, 1) * cfg.w);
    knob.y = cfg.cy;

    const hit = this.add.rectangle(cfg.cx, cfg.cy, cfg.w + 60, 44, 0x000000, 0.001);
    hit.setInteractive({ useHandCursor: true });

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

    const stopHolding = () => {
      holding = false;
    };

    knob.on("drag", (_p: unknown, dragX: number) => updateFromX(dragX));

    const hit = this.add.rectangle(cfg.x + cfg.width / 2, cfg.y, cfg.width, 28, 0x000000, 0.001);
    hit.setInteractive({ useHandCursor: true }).on("pointerdown", (p: Phaser.Input.Pointer) => {
      updateFromX(p.worldX);
    });

    cfg.onChange(Phaser.Math.Clamp(cfg.initial, 0, 1));
  }

  private roundRectStroke(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number) {
    g.strokeRoundedRect(x, y, w, h, r);
    g.lineStyle(2, 0x4fffbf, 0.5);
    g.beginPath();
    g.moveTo(x + 10, y);
    g.lineTo(x + 26, y);
    g.moveTo(x + w - 26, y + h);
    g.lineTo(x + w - 10, y + h);
    g.strokePath();
  }

    const container = this.add.container(0, 0, [base, inner, hit, knob]);
    return { container, knob };
  }
}
