import Phaser from "phaser";

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

type ButtonVisual = {
  sprite: Phaser.GameObjects.Sprite;
  idleFrame: number;
  pressedFrame: number;
  baseY: number;
};

export default class Minigame3 extends Phaser.Scene {
  private boardX!: number;
  private boardY!: number;
  private uiScale!: number;

  private monitorX!: number;
  private monitorY!: number;
  private monitorW!: number;
  private monitorH!: number;

  private rows = 3;
  private cols = 5;

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

  private screenCenterY = 0;

  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;
  private displayImage?: Phaser.GameObjects.Image;

  private deniedImage?: Phaser.GameObjects.Image;
  private grantedImage?: Phaser.GameObjects.Image;

  private titleText?: Phaser.GameObjects.Text;
private subtitleText?: Phaser.GameObjects.Text;
private progressBg?: Phaser.GameObjects.Rectangle;

  private buttonViews: Record<string, ButtonVisual> | null = null;

  constructor() {
    super("Minigame3");
  }

  preload() {
    this.load.image("min3_computer", "../assets/images/min3/4.png");
    this.load.image("min3_display", "../assets/images/min3/Display.png");
    this.load.image("min3_pad", "../assets/images/min3/5_4_2.png");
    this.load.image("min3_accessGranted", "../assets/images/min3/Access_granted.png");
    this.load.image("min3_topDeco", "../assets/images/min3/7_2.png");
    this.load.spritesheet("min3_buttons", "../assets/images/min3/Buttons.png", {
      frameWidth: 42,
      frameHeight: 42
    });
  }

  create() {
    const { width, height } = this.scale;

    this.scale.off("resize");
    this.scale.on("resize", () => {
      this.scene.restart();
    });



    this.computeResponsiveLayout(width, height);
    this.drawMachine();
    this.createCloseButton();
    this.createTexts();
    this.createProgressBar();
    this.createBitGrid();
    this.createCursor();
    this.createControls();

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.startRound();
  }

  private computeResponsiveLayout(width: number, height: number) {
  this.boardX = width / 2;
  this.boardY = height / 2;

  this.uiScale = Phaser.Math.Clamp(Math.min(width / 1366, height / 768), 0.78, 1.28);

  this.monitorX = this.boardX;
  this.monitorY = this.boardY - 55 * this.uiScale;

  this.monitorW = Math.min(width * 0.54, 700) * this.uiScale;
  this.monitorH = Math.min(height * 0.42, 360) * this.uiScale;

  // centro visivo della parte interattiva dentro lo schermo
  this.screenCenterY = this.monitorY - 4 * this.uiScale;
}
  private drawMachine() {
  const computer = this.add.image(
    this.boardX,
    this.boardY + 12 * this.uiScale,
    "min3_computer"
  );
  computer.setOrigin(0.5);
  computer.setScale(this.uiScale * 2.1);

  this.displayImage = this.add.image(this.monitorX, this.monitorY, "min3_display");
this.displayImage.setOrigin(0.5);
this.displayImage.setDisplaySize(
  this.monitorW * 0.5,
  this.monitorH * 0.5
);
}

  private createCloseButton() {
    const closeX = this.monitorX + this.monitorW / 2 + 112 * this.uiScale;
    const closeY = this.monitorY - this.monitorH / 2 - 42 * this.uiScale;

    const closeBg = this.add
      .circle(closeX, closeY, 18 * this.uiScale, 0x4a1847, 0.96)
      .setStrokeStyle(2, 0xff66d8, 0.8)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(closeX, closeY, "X", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(18, Math.round(22 * this.uiScale))}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const over = () => {
      closeBg.setScale(1.08);
      closeText.setScale(1.08);
    };

    const out = () => {
      closeBg.setScale(1);
      closeText.setScale(1);
    };

    const close = () => {
      this.input.keyboard?.off("keydown", this.handleKeyPress, this);
      this.scene.stop();
      this.scene.resume("GamePlay");
    };

    closeBg.on("pointerover", over);
    closeBg.on("pointerout", out);
    closeBg.on("pointerdown", close);

    closeText.on("pointerover", over);
    closeText.on("pointerout", out);
    closeText.on("pointerdown", close);
  }

  private createTexts() {
  const topY = this.screenCenterY - 140 * this.uiScale;

  this.titleText = this.add
  .text(this.monitorX, topY, "FILE MODIFICATION", {
    fontFamily: "Pixelify Sans",
    fontSize: `${Math.max(35, Math.round(45 * this.uiScale))}px`,
    color: "#46ff88",
    fontStyle: "bold",
    stroke: "#09100c",
    strokeThickness: 4
  })
  .setOrigin(0.5);

  this.subtitleText = this.add
  .text(this.monitorX, topY + 34 * this.uiScale, "MEMORIZE THE BITS, THEN PATCH THE FILE", {
    fontFamily: "Pixelify Sans",
    fontSize: `${Math.max(15, Math.round(18 * this.uiScale))}px`,
    color: "#8de8ff",
    fontStyle: "bold"
  })
  .setOrigin(0.5);

  this.statusText = this.add
    .text(
      this.monitorX,
      this.screenCenterY + 100 * this.uiScale,
      "",
      {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(20 * this.uiScale))}px`,
        color: "#d7f8ff",
        fontStyle: "bold"
      }
    )
    .setOrigin(0.5)
    .setAlpha(0);

  this.grantedImage = this.add
    .image(this.monitorX, this.monitorY, "min3_accessGranted")
    .setOrigin(0.5)
    .setScale(this.uiScale * 1.2)
    .setAlpha(0);
}

  private createProgressBar() {
  const barW = this.monitorW * 0.54;
  const barH = Math.max(25, 35 * this.uiScale);
  const barY = this.screenCenterY - 65 * this.uiScale;

  this.progressBg = this.add
  .rectangle(this.monitorX, barY, barW, barH, 0x08111d, 0.96)
  .setStrokeStyle(2, 0x46ff88, 0.9)
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
      fontSize: `${Math.max(15, Math.round(20 * this.uiScale))}px`,
      color: "#ffffff",
      fontStyle: "bold"
    })
    .setOrigin(0.5);
}

  private createBitGrid() {
  const gridW = this.monitorW * 0.40;
  const gridH = this.monitorH * 0.36;

  this.cellW = gridW / this.cols;
  this.cellH = gridH / this.rows;

  this.gridStartX = this.monitorX - gridW / 2 + this.cellW / 2;
  this.gridStartY = this.screenCenterY + 20 * this.uiScale;

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
          this.cellH - 6 * this.uiScale,
          0x0d1723,
          0.94
        )
        .setStrokeStyle(2, 0x36ddff, 0.18)
        .setInteractive({ useHandCursor: true });

      const text = this.add
        .text(x, y, String(value), {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(12, Math.round(15 * this.uiScale))}px`,
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

  private createControls() {
  // PAD nel vuoto in basso a destra
  const padX = this.monitorX + this.monitorW / 2 - 168* this.uiScale;
  const padY = this.monitorY + this.monitorH / 2 + 105 * this.uiScale;

  const pad = this.add.image(padX, padY, "min3_pad");
  pad.setOrigin(0.5);
  pad.setScale(this.uiScale * 1.45);

  const up = this.add.sprite(
    padX,
    padY - 30 * this.uiScale,
    "min3_buttons",
    2
  );

  const left = this.add.sprite(
    padX - 35 * this.uiScale,
    padY + 8 * this.uiScale,
    "min3_buttons",
    0
  );

  const down = this.add.sprite(
    padX,
    padY + 45 * this.uiScale,
    "min3_buttons",
    6
  );

  const right = this.add.sprite(
    padX + 35 * this.uiScale,
    padY + 5 * this.uiScale,
    "min3_buttons",
    4
  );

  [up, left, down, right].forEach((s) => s.setScale(this.uiScale * 1.5));

  // pulsante separato, più vicino al pad e non sopra il monitor
  const actionBaseX = this.boardX - 170 * this.uiScale;
  const actionBaseY = this.boardY + 215 * this.uiScale;

  const actionBtn = this.add.sprite(
    actionBaseX,
    actionBaseY + 10 * this.uiScale,
    "min3_buttons",
    8
  );
  actionBtn.setScale(this.uiScale * 1.1);

  this.buttonViews = {
    LEFT: { sprite: left, idleFrame: 0, pressedFrame: 1, baseY: left.y },
    UP: { sprite: up, idleFrame: 2, pressedFrame: 3, baseY: up.y },
    RIGHT: { sprite: right, idleFrame: 4, pressedFrame: 5, baseY: right.y },
    DOWN: { sprite: down, idleFrame: 6, pressedFrame: 7, baseY: down.y },
    ACTION: { sprite: actionBtn, idleFrame: 8, pressedFrame: 9, baseY: actionBtn.y }
  };
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
    const allIndexes = Phaser.Utils.Array.NumberArray(0, this.cells.length - 1);
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
      this.pressVisualKey("UP");
      return;
    }

    if (event.code === "ArrowDown") {
      if (!this.acceptingInput) return;
      this.cursorRow = (this.cursorRow + 1) % this.rows;
      this.updateCursorPosition();
      this.pressVisualKey("DOWN");
      return;
    }

    if (event.code === "ArrowLeft") {
      if (!this.acceptingInput) return;
      this.cursorCol = (this.cursorCol - 1 + this.cols) % this.cols;
      this.updateCursorPosition();
      this.pressVisualKey("LEFT");
      return;
    }

    if (event.code === "ArrowRight") {
      if (!this.acceptingInput) return;
      this.cursorCol = (this.cursorCol + 1) % this.cols;
      this.updateCursorPosition();
      this.pressVisualKey("RIGHT");
      return;
    }

    if (event.code === "Space") {
      if (!this.acceptingInput) return;
      this.pressVisualKey("ACTION");
      this.toggleCurrentCell();
      return;
    }

    if (event.code === "Enter" || event.code === "NumpadEnter") {
      if (!this.acceptingInput) return;
      this.pressVisualKey("ACTION");
      this.toggleCurrentCell();
    }
  }

  private pressVisualKey(key: string) {
    if (!this.buttonViews) return;

    const view = this.buttonViews[key];
    if (!view) return;

    this.tweens.killTweensOf(view.sprite);

    view.sprite.setFrame(view.pressedFrame);
    view.sprite.y = view.baseY + 4 * this.uiScale;

    this.time.delayedCall(90, () => {
      view.sprite.setFrame(view.idleFrame);
      view.sprite.y = view.baseY;
    });
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
  if (!this.progressFill || !this.progressText) return;

  const maxWidth = this.monitorW * 0.54 - 6 * this.uiScale;
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

  private showDenied(hold = 450) {
    if (!this.deniedImage) return;

    this.tweens.killTweensOf(this.deniedImage);
    this.deniedImage.setAlpha(1);

    this.tweens.add({
      targets: this.deniedImage,
      alpha: 0,
      duration: 450,
      delay: hold
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

  this.hideMonitorUI();



  if (this.grantedImage) {
    this.grantedImage.setOrigin(0.5);
    this.grantedImage.setPosition(this.monitorX, this.monitorY - 30);
    this.grantedImage.setAlpha(1);
    this.grantedImage.setScale(this.uiScale * 2.0);
    this.grantedImage.setDepth(1001);
  }

  this.time.delayedCall(2200, () => {
    this.scene.stop();
    this.scene.resume("GamePlay");
  });
}
}