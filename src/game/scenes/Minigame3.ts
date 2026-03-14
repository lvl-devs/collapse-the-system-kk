import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";
import LevelStorage from "../systems/LevelStorage";

type BitCell = {
  row: number;
  col: number;
  x: number;
  y: number;
  value: number;
  targetValue: number;
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

export default class Minigame3 extends Phaser.Scene {
  private uiScale!: number;

  private monitorX!: number;
  private monitorY!: number;
  private monitorW!: number;
  private monitorH!: number;

  private rows = 4;
  private cols = 8;

  private gridStartX = 0;
  private gridStartY = 0;
  private cellW = 0;
  private cellH = 0;

  private cells: BitCell[] = [];
  private targetIndexes: number[] = [];

  private cursorRow = 0;
  private cursorCol = 0;
  private cursorRect?: Phaser.GameObjects.Rectangle;

  private progress = 0;
  private acceptingInput = false;

  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private grantedImage?: Phaser.GameObjects.Image;

  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private progressBg?: Phaser.GameObjects.Rectangle;

  private bgImage?: Phaser.GameObjects.Image;

  // dimensioni originali del nuovo background
  private readonly BG_W = 1536;
  private readonly BG_H = 1024;

  // area interna dello schermo del laptop nel bg-laptop.png
  // valori ricavati dall'immagine allegata
  private readonly SCREEN_CX = 758;
  private readonly SCREEN_CY = 430;
  private readonly SCREEN_W = 875;
  private readonly SCREEN_H = 500;

  constructor() {
    super("Minigame3");
  }

  preload() {
    this.load.image("min3_bgLaptop", "../assets/images/min3/bg-laptop.png");
    this.load.image("min3_accessGranted", "../assets/images/min3/Access_granted.png");
    if (!this.cache.audio.exists("loading-complete")) {
      this.load.audio("loading-complete", "../assets/sounds/loading-complete.mp3");
    }
    if (!this.cache.audio.exists("error-1")) {
      this.load.audio("error-1", "../assets/sounds/minigame-3/error-1.mp3");
    }
  }

  private exitMinigame() {
  this.scene.stop();
  this.scene.resume("GamePlay");
}

  create() {
    const { width, height } = this.scale;

    this.input.keyboard?.on("keydown-ESC", () => {
  this.exitMinigame();
});

    this.scale.off("resize");
    this.scale.on("resize", () => {
      this.scene.restart();
    });

    this.computeResponsiveLayout(width, height);
    this.drawBackground();
    this.createCloseButton();
    this.createTexts();
    this.createProgressBar();
    this.createBitGrid();
    this.createCursor();

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.startRound();
  }

  private computeResponsiveLayout(width: number, height: number) {
    const bgScale = Math.min(width / this.BG_W, height / this.BG_H) * 1.18;
    const renderW = this.BG_W * bgScale;
    const renderH = this.BG_H * bgScale;
    const offsetX = (width - renderW) / 2;
    const offsetY = (height - renderH) / 2;

    this.uiScale = Phaser.Math.Clamp(bgScale, 0.7, 1.45);

    this.monitorX = offsetX + this.SCREEN_CX * bgScale;
    this.monitorY = offsetY + this.SCREEN_CY * bgScale;
    this.monitorW = this.SCREEN_W * bgScale;
    this.monitorH = this.SCREEN_H * bgScale;

  }

  private drawBackground() {
  const { width, height } = this.scale;

  const scale = Math.min(width / this.BG_W, height / this.BG_H) * 1.48; // zoom sfondo

  this.bgImage = this.add.image(width / 2, height / 2 - 20, "min3_bgLaptop");
  this.bgImage.setOrigin(0.5);
  this.bgImage.setScale(scale);

  this.add
    .rectangle(this.monitorX, this.monitorY, this.monitorW, this.monitorH, 0x000000, 0.14)
    .setOrigin(0.5);
}

  private createCloseButton() {
    const closeX = this.monitorX + this.monitorW / 2 + 46 * this.uiScale;
    const closeY = this.monitorY - this.monitorH / 2 + 27 * this.uiScale;

    const closeText = this.add
      .text(closeX, closeY, "X", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(20, Math.round(30 * this.uiScale))}px`,
        color: "#f2d8ff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeText.on("pointerover", () => closeText.setScale(1.08));
    closeText.on("pointerout", () => closeText.setScale(1));
    closeText.on("pointerdown", () => {
      this.input.keyboard?.off("keydown", this.handleKeyPress, this);
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }

  private createTexts() {
    const topY = this.monitorY - this.monitorH * 0.34;

    this.titleText = this.add
      .text(this.monitorX, topY - 20, "FILE MODIFICATION", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(30, Math.round(72 * this.uiScale))}px`,
        color: "#46ff88",
        fontStyle: "bold",
        stroke: "#08110d",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(this.monitorX, topY + 24 * this.uiScale, "MEMORIZE THE BITS, THEN PATCH THE FILE", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(14, Math.round(27 * this.uiScale))}px`,
        color: "#9feaff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(this.monitorX, this.monitorY + this.monitorH * 0.40, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(30 * this.uiScale))}px`,
        color: "#d7f8ff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.grantedImage = this.add
      .image(this.monitorX, this.monitorY, "min3_accessGranted")
      .setOrigin(0.5)
      .setScale(this.uiScale * 1.05)
      .setAlpha(0);
  }

  private createProgressBar() {
    const barW = this.monitorW * 0.65;
    const barH = Math.max(24, 40 * this.uiScale);
    const barY = this.monitorY - this.monitorH * 0.16;

    this.progressBg = this.add
      .rectangle(this.monitorX, barY, barW, barH, 0x07111b, 0.92)
      .setStrokeStyle(2, 0x46ff88, 0.95)
      .setOrigin(0.5);

    this.progressFill = this.add
      .rectangle(
        this.monitorX - barW / 2 + 3 * this.uiScale,
        barY,
        0,
        barH - 6,
        0x44ff88,
        0.95
      )
      .setOrigin(0, 0.5);

    this.progressText = this.add
      .text(this.monitorX, barY, "0%", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(15, Math.round(26 * this.uiScale))}px`,
        color: "#ffffff",
        //fontStyle: "bold"
      })
      .setOrigin(0.5);
  }

  private createBitGrid() {
    const gridW = this.monitorW * 0.62;
    const gridH = this.monitorH * 0.42;

    this.cellW = gridW / this.cols;
    this.cellH = gridH / this.rows;

    this.gridStartX = this.monitorX - gridW / 2 + this.cellW / 2;
    this.gridStartY = this.monitorY + this.monitorH * 0.12;

    this.cells = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.gridStartX + c * this.cellW;
        const y = this.gridStartY - gridH / 2 + this.cellH / 2 + r * this.cellH;

        const value = Phaser.Math.Between(0, 1);

        const rect = this.add
          .rectangle(
            x,
            y,
            this.cellW - 8 * this.uiScale,
            this.cellH - 8 * this.uiScale,
            0x0d1723,
            0.94
          )
          .setStrokeStyle(2, 0x36ddff, 0.25)
          .setInteractive({ useHandCursor: true });

        const text = this.add
          .text(x, y, String(value), {
            fontFamily: "Pixelify Sans",
            fontSize: `${Math.max(14, Math.round(18 * this.uiScale))}px`,
            color: value === 1 ? "#46ff88" : "#e0f9ff",
            fontStyle: "bold"
          })
          .setOrigin(0.5);

        const cell: BitCell = {
          row: r,
          col: c,
          x,
          y,
          value,
          targetValue: value,
          rect,
          text
        };

        rect.on("pointerdown", () => {
          if (!this.acceptingInput) return;
          this.cursorRow = r;
          this.cursorCol = c;
          this.updateCursorPosition();
          this.toggleCurrentCell();
        });

        this.cells.push(cell);
      }
    }
  }

  private createCursor() {
    this.cursorRect = this.add
      .rectangle(0, 0, this.cellW - 4 * this.uiScale, this.cellH - 4 * this.uiScale)
      .setStrokeStyle(2, 0xffd84a, 1)
      .setFillStyle(0xffffff, 0)
      .setOrigin(0.5);

    this.updateCursorPosition();
  }

  private startRound() {
    this.acceptingInput = false;
    this.progress = 0;
    this.updateProgressUI();

    this.generateTargets();
    this.updateGridVisuals(true);
    this.showStatus("MEMORIZE THE HIGHLIGHTED BITS", "#8de8ff");

    this.time.delayedCall(3200, () => {
      this.acceptingInput = true;
      this.updateGridVisuals(false);
      this.showStatus("EDIT THE FILE", "#46ff88");
    });
  }

  private generateTargets() {
    this.targetIndexes = [];

    for (const cell of this.cells) {
      cell.targetValue = cell.value;
    }

    const count = 4;
    const allIndexes = Phaser.Utils.Array.NumberArray(0, this.cells.length - 1) as number[];
    Phaser.Utils.Array.Shuffle(allIndexes);

    this.targetIndexes = allIndexes.slice(0, count);

    for (const index of this.targetIndexes) {
      const cell = this.cells[index];
      cell.targetValue = cell.value === 0 ? 1 : 0;
    }
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (event.code === "ArrowUp") {
      if (!this.acceptingInput) return;
      this.cursorRow = (this.cursorRow - 1 + this.rows) % this.rows;
      this.updateCursorPosition();
      return;
    }

    if (event.code === "ArrowDown") {
      if (!this.acceptingInput) return;
      this.cursorRow = (this.cursorRow + 1) % this.rows;
      this.updateCursorPosition();
      return;
    }

    if (event.code === "ArrowLeft") {
      if (!this.acceptingInput) return;
      this.cursorCol = (this.cursorCol - 1 + this.cols) % this.cols;
      this.updateCursorPosition();
      return;
    }

    if (event.code === "ArrowRight") {
      if (!this.acceptingInput) return;
      this.cursorCol = (this.cursorCol + 1) % this.cols;
      this.updateCursorPosition();
      return;
    }

    if (event.code === "Space" || event.code === "Enter" || event.code === "NumpadEnter") {
      if (!this.acceptingInput) return;
      this.toggleCurrentCell();
    }
  }

  private toggleCurrentCell() {
    const cell = this.getCell(this.cursorRow, this.cursorCol);
    if (!cell) return;

    cell.value = cell.value === 0 ? 1 : 0;
    cell.text.setText(String(cell.value));
    cell.text.setColor(cell.value === 1 ? "#46ff88" : "#e0f9ff");

    this.flashCell(cell);
    this.updateProgressFromState();

    if (cell.value === cell.targetValue) {
      this.updateGridVisuals(false);
      this.showStatus("BIT MODIFIED", "#46ff88");
    } else {
      this.showStatus("ERROR: WRONG BIT", "#ff4d6d");
      this.errorCell(cell);
      SfxManager.start(this, "error-1", {
        volume: GameData.sfxVolume ?? 0.7,
      });
    }

    if (this.isTaskCompleted()) {
      this.completeTask();
    }
  }

  private getCell(row: number, col: number) {
    return this.cells.find((cell) => cell.row === row && cell.col === col);
  }

  private updateCursorPosition() {
    if (!this.cursorRect) return;

    const cell = this.getCell(this.cursorRow, this.cursorCol);
    if (!cell) return;

    this.cursorRect.setPosition(cell.x, cell.y);
  }

  private updateGridVisuals(showTargets: boolean) {
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const isCursor = cell.row === this.cursorRow && cell.col === this.cursorCol;
      const isTarget = this.targetIndexes.includes(i);

      let fill = 0x0d1723;
      let stroke = 0x36ddff;
      let strokeAlpha = 0.22;

      if (showTargets && isTarget) {
        fill = 0x2a1030;
        stroke = 0xff57c7;
        strokeAlpha = 1;
      } else if (!showTargets && cell.value === cell.targetValue && isTarget) {
        fill = 0x12291d;
        stroke = 0x46ff88;
        strokeAlpha = 0.75;
      }

      if (isCursor) {
        stroke = 0xffd84a;
        strokeAlpha = 1;
      }

      cell.rect.setFillStyle(fill, 0.97);
      cell.rect.setStrokeStyle(2, stroke, strokeAlpha);
    }
  }

  private updateProgressFromState() {
    let correctTargets = 0;
    let wrongBits = 0;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const isTarget = this.targetIndexes.includes(i);

      if (isTarget && cell.value === cell.targetValue) {
        correctTargets++;
      }

      if (!isTarget && cell.value !== cell.targetValue) {
        wrongBits++;
      }
    }

    const step = 100 / this.targetIndexes.length;

    this.progress = Math.max(
      0,
      Math.min(100, Math.round(correctTargets * step - wrongBits * step))
    );

    this.updateProgressUI();
  }

  private updateProgressUI() {
    if (!this.progressFill || !this.progressText || !this.progressBg) return;

    const maxWidth = this.progressBg.width - 6 * this.uiScale;
    const targetWidth = (this.progress / 100) * maxWidth;

    this.tweens.add({
      targets: this.progressFill,
      width: targetWidth,
      duration: 180,
      ease: "Sine.Out"
    });

    this.progressText.setText(`${Math.round(this.progress)}%`);
  }

  private flashCell(cell: BitCell) {
    this.tweens.add({
      targets: cell.text,
      scaleX: 1.16,
      scaleY: 1.16,
      duration: 90,
      yoyo: true
    });
  }

  private errorCell(cell: BitCell) {
    cell.rect.setFillStyle(0x3a1010, 0.97);
    cell.rect.setStrokeStyle(2, 0xff4d6d, 1);
    cell.text.setColor("#ff8aa0");

    this.tweens.add({
      targets: [cell.rect, cell.text],
      x: "+=6",
      duration: 35,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        cell.text.setColor(cell.value === 1 ? "#46ff88" : "#e0f9ff");
        this.updateGridVisuals(false);
      }
    });
  }

  private showStatus(message: string, color: string) {
    if (!this.statusText) return;

    this.tweens.killTweensOf(this.statusText);

    this.statusText.setText(message);
    this.statusText.setColor(color);
    this.statusText.setAlpha(1);
    this.statusText.setScale(0.92);

    this.tweens.add({
      targets: this.statusText,
      scaleX: 1,
      scaleY: 1,
      duration: 100
    });

    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      duration: 350,
      delay: 700
    });
  }

  private isTaskCompleted() {
    for (const cell of this.cells) {
      if (cell.value !== cell.targetValue) return false;
    }
    return true;
  }

  private hideMonitorUI() {
    this.titleText?.setVisible(false);
    this.subtitleText?.setVisible(false);
    this.statusText?.setVisible(false);

    this.progressBg?.setVisible(false);
    this.progressFill?.setVisible(false);
    this.progressText?.setVisible(false);

    this.cursorRect?.setVisible(false);

    for (const cell of this.cells) {
      cell.rect.setVisible(false);
      cell.text.setVisible(false);
    }
  }

  private completeTask() {
    this.acceptingInput = false;
    this.input.keyboard?.off("keydown", this.handleKeyPress, this);

    this.progress = 100;
    this.updateProgressUI();
    this.registry.set("task3Completed", true);
    LevelStorage.advanceLevel();
    SfxManager.start(this, "loading-complete", {
      volume: GameData.sfxVolume ?? 0.7,
    });

    this.hideMonitorUI();

    if (this.grantedImage) {
      this.grantedImage.setPosition(this.monitorX, this.monitorY - 16);
      this.grantedImage.setAlpha(1);
      this.grantedImage.setScale(this.uiScale * 2.95);
      this.grantedImage.setDepth(1001);
    }

    this.time.delayedCall(2200, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }
}
