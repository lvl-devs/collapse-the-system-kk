import Phaser from "phaser";

type ArrowKey = "UP" | "DOWN" | "LEFT" | "RIGHT";

type PadButton = {
  sprite: Phaser.GameObjects.Sprite;
  idleFrame: number;
  pressedFrame: number;
  baseScale: number;
  baseY: number;
};

export default class Minigame2 extends Phaser.Scene {
  private baseX = 0;
  private baseY = 0;
  private baseScale = 1;

  private readonly ASSET_W = 695;
  private readonly ASSET_H = 495;

  private readonly MONITOR_CX = 342;
  private readonly MONITOR_CY = 185;
  private readonly MONITOR_W = 360;
  private readonly MONITOR_H = 168;

  private readonly PAD_CX = 549;
  private readonly PAD_CY = 312;
  private readonly PAD_BTN_OFFSET_X = 25;
  private readonly PAD_BTN_OFFSET_Y = 23;

  private bg!: Phaser.GameObjects.Image;
  private computer!: Phaser.GameObjects.Image;

  private monitorBg!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;

  private folderLeft!: Phaser.GameObjects.Image;
  private folderRight!: Phaser.GameObjects.Image;

  private progressFill!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private progressSegments: Phaser.GameObjects.Rectangle[] = [];

  private statusText!: Phaser.GameObjects.Text;
  private alertImage?: Phaser.GameObjects.Image;

  private sequenceBoxes: Phaser.GameObjects.Rectangle[] = [];
  private sequenceIcons: Phaser.GameObjects.Sprite[] = [];

  private padButtons!: Record<ArrowKey, PadButton>;

  private progress = 0;
  private acceptingInput = true;

  private currentSequence: ArrowKey[] = [];
  private currentIndex = 0;
  private sequenceLength = 4;

  private readonly UI_SCALE = 0.82;

  constructor() {
    super("Minigame2");
  }

  preload() {
    this.load.image("mg2_bg", "../assets/images/min2/bg-2-4.png");

    this.load.image("mg2_computer", "../assets/images/min2/monitor-with-speaker.png");
    this.load.image("mg2_folder1", "../assets/images/min2/Folder.png");
    this.load.image("mg2_folder2", "../assets/images/min2/Folder2.png");
    this.load.image("mg2_granted", "../assets/images/min2/Access_granted.png");

    this.load.image("mg2_display", "../assets/images/min2/Display.png");

    this.load.spritesheet("mg2_buttons", "../assets/images/min2/Buttons.png", {
      frameWidth: 42,
      frameHeight: 42
    });

    this.load.spritesheet("mg2_arrows", "../assets/images/min2/Arrows.png", {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create() {
    const { width, height } = this.scale;

    this.scale.off("resize");
    this.scale.on("resize", () => this.scene.restart());

    this.computeLayout(width, height);

    this.createBackground();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.10);

    this.createBaseArt();
    this.createMonitorUI();
    this.createPadButtons();
    this.createCloseButton();

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.generateSequence();
    this.updateSequenceUI();
    this.updateProgressUI();
    this.showStatus("AWAITING INPUT SEQUENCE");
  }

  private createBackground() {
    const { width, height } = this.scale;

    this.bg = this.add
      .image(width / 2, height / 2, "mg2_bg")
      .setDisplaySize(width, height)
      .setDepth(0);
  }

  private computeLayout(width: number, height: number) {
    const targetW = width * 1.27;
    const targetH = height * 1.27;

    this.baseScale = Math.min(targetW / this.ASSET_W, targetH / this.ASSET_H);
    this.baseScale = Phaser.Math.Clamp(this.baseScale, 0.9, 2.2);

    this.baseX = width / 2;
    this.baseY = height / 2;
  }

  private ax(px: number) {
    return this.baseX + (px - this.ASSET_W / 2) * this.baseScale;
  }

  private ay(py: number) {
    return this.baseY + (py - this.ASSET_H / 2) * this.baseScale;
  }

  private s(v: number) {
    return v * this.baseScale;
  }

  private ui(v: number) {
    return this.s(v) * this.UI_SCALE;
  }

  private createBaseArt() {
    this.computer = this.add
      .image(this.baseX, this.baseY, "mg2_computer")
      .setScale(this.baseScale)
      .setDepth(1);
  }

  private createMonitorUI() {
    const cx = this.ax(this.MONITOR_CX);
    const cy = this.ay(this.MONITOR_CY);
    const mw = this.s(this.MONITOR_W);
    const mh = this.s(this.MONITOR_H);

    this.titleText = this.add
      .text(cx, cy - this.ui(42), "AWAITING INPUT SEQUENCE", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(10, Math.round(this.ui(15)))}px`,
        color: "#f3f7fb",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.folderLeft = this.add
      .image(cx - this.ui(75), cy - this.ui(2), "mg2_folder1")
      .setScale(this.ui(1.1))
      .setDepth(3);

    this.folderRight = this.add
      .image(cx + this.ui(75), cy - this.ui(2), "mg2_folder2")
      .setScale(this.ui(1.1))
      .setDepth(3);

    this.createProgressBar(cx, cy, mw);
    this.createSequenceRow(cx, cy);
    this.createStatus(cx, cy);
  }

  private createProgressBar(cx: number, cy: number, mw: number) {
    const barY = cy + this.s(33);
    const barW = mw * 0.48;
    const barH = this.s(8);

    this.add
      .rectangle(cx, barY, barW + this.s(4), barH + this.s(4), 0x0d1320, 1)
      .setStrokeStyle(1.5, 0x6bdcff, 0.85)
      .setDepth(3);

    this.add
      .rectangle(cx, barY, barW, barH, 0x071018, 1)
      .setDepth(3);

    this.progressFill = this.add
  .rectangle(cx - barW / 2, barY, 0, 0, 0x72ef74, 0)
  .setOrigin(0, 0.5)
  .setDepth(4);

    this.progressText = this.add
      .text(cx + barW / 2 + this.s(18), barY, "0%", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(10, Math.round(this.s(10)))}px`,
        color: "#f2f4f9",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.progressSegments = [];

    const segCount = 16;
    const segGap = this.s(1.8);
    const usableW = barW - this.s(6);
    const segW = (usableW - segGap * (segCount - 1)) / segCount;
    const startX = cx - usableW / 2 + segW / 2;

    for (let i = 0; i < segCount; i++) {
      const seg = this.add
        .rectangle(
          startX + i * (segW + segGap),
          barY,
          segW,
          barH - this.s(2.5),
          0x1b2634,
          0.95
        )
        .setDepth(5)
        .setOrigin(0.5);

      this.progressSegments.push(seg);
    }
  }

  private createSequenceRow(cx: number, cy: number) {
  this.sequenceBoxes = [];
  this.sequenceIcons = [];

  const maxSlots = 6;
  const gap = this.ui(8);
  const iconSize = this.ui(26);
  const totalW = maxSlots * iconSize + (maxSlots - 1) * gap;
  const startX = 783 - totalW / 2 + iconSize / 2;
  const y = cy + this.ui(70);

  for (let i = 0; i < maxSlots; i++) {
    const x = startX + i * (iconSize + gap);

    const box = this.add
      .rectangle(x, y, 1, 1, 0x000000, 0)
      .setVisible(false);

    const icon = this.add
      .sprite(x, y, "mg2_arrows", 0)
      .setScale(this.ui(0.9))
      .setDepth(4)
      .setVisible(false);

    this.sequenceBoxes.push(box);
    this.sequenceIcons.push(icon);
  }
}

  private createStatus(cx: number, cy: number) {
    this.statusText = this.add
      .text(cx, cy + this.ui(96), "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(10, Math.round(this.ui(12)))}px`,
        color: "#ff8b8b",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  private createPadButtons() {
    const padCX = this.ax(this.PAD_CX);
    const padCY = this.ay(this.PAD_CY);

    const dx = this.s(this.PAD_BTN_OFFSET_X);
    const dy = this.s(this.PAD_BTN_OFFSET_Y);

    const scale = this.s(0.95);

    this.padButtons = {
      LEFT: this.makePadButton(padCX - dx, padCY, 0, 1, scale),
      UP: this.makePadButton(padCX, padCY - dy, 2, 3, scale),
      RIGHT: this.makePadButton(padCX + dx, padCY, 4, 5, scale),
      DOWN: this.makePadButton(padCX, padCY + dy, 6, 7, scale)
    };
  }

  private makePadButton(
    x: number,
    y: number,
    idleFrame: number,
    pressedFrame: number,
    scale: number
  ): PadButton {
    const sprite = this.add
      .sprite(x, y, "mg2_buttons", idleFrame)
      .setScale(scale)
      .setDepth(6);

    return {
      sprite,
      idleFrame,
      pressedFrame,
      baseScale: scale,
      baseY: y
    };
  }

  private createCloseButton() {
    const x = this.ax(652);
    const y = this.ay(40);

    const txt = this.add
      .text(x, y, "x", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(34, Math.round(this.s(14)))}px`,
        color: "#ffffff"
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    txt.on("pointerover", () => {
      txt.setScale(1.15);
    });

    txt.on("pointerout", () => {
      txt.setScale(1);
    });

    txt.on("pointerdown", () => {
      this.input.keyboard?.off("keydown", this.handleKeyPress, this);
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (!this.acceptingInput) return;

    let pressedKey: ArrowKey | null = null;

    if (event.code === "ArrowUp") pressedKey = "UP";
    else if (event.code === "ArrowDown") pressedKey = "DOWN";
    else if (event.code === "ArrowLeft") pressedKey = "LEFT";
    else if (event.code === "ArrowRight") pressedKey = "RIGHT";

    if (!pressedKey) return;

    this.animatePadButton(pressedKey);

    const expected = this.currentSequence[this.currentIndex];

    if (pressedKey === expected) {
      this.showCorrectButton(pressedKey);
      this.currentIndex++;
      this.updateSequenceUI();
      this.showStatus("");

      if (this.currentIndex >= this.currentSequence.length) {
        this.progress = Math.min(100, this.progress + 20);
        this.updateProgressUI();
        this.bumpFolders();

        if (this.progress >= 100) {
          this.completeTask();
          return;
        }

        this.time.delayedCall(220, () => {
          this.generateSequence();
          this.updateSequenceUI();
          this.showStatus("");
        });
      }
    } else {
      this.progress = Math.max(0, this.progress - 10);
      this.updateProgressUI();
      this.showStatus("ACCESS DENIED");
      this.cameras.main.shake(110, 0.0038);

      this.generateSequence();
      this.updateSequenceUI();
    }
  }

  private showCorrectButton(key: ArrowKey) {
    const btn = this.padButtons[key];
    if (!btn) return;

    this.tweens.killTweensOf(btn.sprite);

    btn.sprite.setFrame(btn.pressedFrame);
    btn.sprite.setScale(btn.baseScale * 0.9);
    btn.sprite.y = btn.baseY + this.s(2);

    this.time.delayedCall(120, () => {
      btn.sprite.setFrame(btn.idleFrame);
      btn.sprite.setScale(btn.baseScale);
      btn.sprite.y = btn.baseY;
    });
  }

  private animatePadButton(key: ArrowKey) {
    const btn = this.padButtons[key];
    if (!btn) return;

    this.tweens.killTweensOf(btn.sprite);

    btn.sprite.setFrame(btn.pressedFrame);
    btn.sprite.setScale(btn.baseScale * 0.9);
    btn.sprite.y = btn.baseY + this.s(2);

    this.time.delayedCall(90, () => {
      btn.sprite.setFrame(btn.idleFrame);
      btn.sprite.setScale(btn.baseScale);
      btn.sprite.y = btn.baseY;
    });
  }

  private generateSequence() {
    const keys: ArrowKey[] = ["UP", "DOWN", "LEFT", "RIGHT"];

    this.sequenceLength = 5;
    this.currentSequence = [];

    for (let i = 0; i < this.sequenceLength; i++) {
      this.currentSequence.push(Phaser.Utils.Array.GetRandom(keys));
    }

    this.currentIndex = 0;
  }

  private updateSequenceUI() {
    for (let i = 0; i < this.sequenceIcons.length; i++) {
      const box = this.sequenceBoxes[i];
      const icon = this.sequenceIcons[i];

      if (i >= this.currentSequence.length) {
        box.setVisible(false);
        icon.setVisible(false);
        continue;
      }

      box.setVisible(true);
      icon.setVisible(true);

      const key = this.currentSequence[i];
      const done = i < this.currentIndex;

      box.setVisible(false);

      icon.setFrame(this.getArrowFrame(key, done));
      icon.setAlpha(done ? 0.45 : 1);
    }
  }

  private getArrowFrame(key: ArrowKey, done: boolean) {
    const normal: Record<ArrowKey, number> = {
      UP: 0,
      RIGHT: 1,
      DOWN: 2,
      LEFT: 3
    };

    const green: Record<ArrowKey, number> = {
      UP: 4,
      RIGHT: 5,
      DOWN: 6,
      LEFT: 7
    };

    return done ? green[key] : normal[key];
  }

  private updateProgressUI() {

    this.progressText.setText(`${Math.round(this.progress)}%`);

    const filledSegments = Math.round(
      (this.progress / 100) * this.progressSegments.length
    );

    for (let i = 0; i < this.progressSegments.length; i++) {
      if (i < filledSegments) {
        this.progressSegments[i].setFillStyle(0x72ef74, 1);
      } else {
        this.progressSegments[i].setFillStyle(0x1b2634, 0.95);
      }
    }
  }

  private showStatus(message: string) {
    this.statusText.setText(message);
  }

  private bumpFolders() {
    this.tweens.add({
      targets: [this.folderLeft, this.folderRight],
      y: `-=${this.s(3)}`,
      duration: 70,
      yoyo: true
    });
  }

  private completeTask() {
    this.acceptingInput = false;
    this.input.keyboard?.off("keydown", this.handleKeyPress, this);

    if (this.alertImage) {
      this.alertImage.destroy();
      this.alertImage = undefined;
    }

    const cx = this.ax(this.MONITOR_CX);
    const cy = this.ay(this.MONITOR_CY);

    this.registry.set("task2Completed", true);

    const display = this.add
      .image(cx, cy + this.s(12), "mg2_display")
      .setScale(this.s(0.95))
      .setDepth(20)
      .setAlpha(0);

    const granted = this.add
      .image(cx, cy + this.s(23), "mg2_granted")
      .setScale(this.s(0.8))
      .setDepth(21)
      .setAlpha(0);

    this.tweens.add({
      targets: display,
      alpha: 1,
      duration: 200,
      ease: "Sine.Out"
    });

    this.tweens.add({
      targets: granted,
      alpha: 1,
      duration: 300,
      delay: 150,
      ease: "Sine.Out"
    });

    this.time.delayedCall(2200, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }
}