import Phaser from "phaser";

type Side = "left" | "right";

type WireColor = {
  name: string;
  hex: number;
};

type WireState = {
  color: WireColor;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  connected: boolean;
  activeGlow: boolean;
  plug: Phaser.GameObjects.Container;
  plugGfx: Phaser.GameObjects.Graphics;
  cable: Phaser.GameObjects.Graphics;
  startSide: Side;
};

type SocketData = {
  x: number;
  y: number;
  side: Side;
  color: WireColor;
  container: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
};

export default class Minigame1 extends Phaser.Scene {
  private wires: WireState[] = [];
  private sockets: SocketData[] = [];

  private boardX!: number;
  private boardY!: number;
  private boardW!: number;
  private boardH!: number;

  private screenX!: number;
  private screenY!: number;
  private screenW!: number;
  private screenH!: number;

  private uiScale!: number;

  private alertText?: Phaser.GameObjects.Text;
  private alertBg?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("Minigame1");
  }

  create() {
    const { width, height } = this.scale;

    this.scale.off("resize");
    this.scale.on("resize", () => {
      this.scene.restart();
    });

    this.wires = [];
    this.sockets = [];

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    this.computeResponsiveLayout(width, height);
    this.drawTablet();
    this.createCloseButton();
    this.createHeaderTexts();
    this.createAlerts();
    this.createSocketsAndWires();
  }

  private computeResponsiveLayout(width: number, height: number) {
    const maxW = width * 0.92;
    const maxH = height * 0.84;
    const tabletRatio = 1.68;

    this.boardW = Math.min(maxW, maxH * tabletRatio, 1260);
    this.boardH = this.boardW / tabletRatio;

    if (this.boardH > maxH) {
      this.boardH = maxH;
      this.boardW = this.boardH * tabletRatio;
    }

    this.boardX = width / 2;
    this.boardY = height / 2;

    this.screenW = this.boardW * 0.88;
    this.screenH = this.boardH * 0.74;
    this.screenX = this.boardX;
    this.screenY = this.boardY + this.boardH * 0.02;

    this.uiScale = Phaser.Math.Clamp(this.boardW / 1200, 0.72, 1.05);
  }

  private createHeaderTexts() {
    const titleSize = Math.round(28 * this.uiScale);

    const title = this.add
      .text(
        this.boardX,
        this.boardY - this.boardH / 2 - 18 * this.uiScale,
        "SYSTEM HACKING",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${titleSize}px`,
          color: "#61ff7c",
          fontStyle: "bold",
          stroke: "#0e2f12",
          strokeThickness: Math.max(3, Math.round(5 * this.uiScale))
        }
      )
      .setOrigin(0.5);


    const hintY = this.screenY - this.screenH / 2 + this.screenH * 0.095;

    const hintBg = this.add
      .rectangle(
        this.screenX,
        hintY,
        this.screenW * 0.64,
        Math.max(34, 38 * this.uiScale),
        0x10202a,
        0.88
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x39f4ff, 0.35);

    const hintText = this.add
      .text(
        this.screenX,
        hintY,
        "RESTORE THE CIRCUIT BY MATCHING EVERY WIRE CORRECTLY",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(12, Math.round(16 * this.uiScale))}px`,
          color: "#bafcff",
          fontStyle: "bold",
          align: "center"
        }
      )
      .setOrigin(0.5);

    hintBg.setAlpha(0);
    hintText.setAlpha(0);

    this.tweens.add({
      targets: [hintBg, hintText],
      alpha: 1,
      duration: 250,
      ease: "Sine.Out"
    });

    this.tweens.add({
      targets: [hintBg, hintText],
      alpha: 0,
      duration: 500,
      delay: 1900,
      ease: "Sine.In"
    });
  }

  private createAlerts() {
    const alertY = this.screenY - this.screenH / 2 + this.screenH * 0.055;

    this.alertBg = this.add
      .rectangle(
        this.screenX,
        alertY,
        this.screenW * 0.30,
        Math.max(24, 30 * this.uiScale),
        0xff2f3d,
        0.92
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.18)
      .setAlpha(0);

    this.alertText = this.add
      .text(this.screenX, alertY, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(12, Math.round(16 * this.uiScale))}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private createCloseButton() {
    const closeBtnSize = Math.max(18, 20 * this.uiScale);
    const closeX = this.boardX + this.boardW / 2 - 38 * this.uiScale;
    const closeY = this.boardY - this.boardH / 2 + 38 * this.uiScale;

    const closeBg = this.add
      .circle(closeX, closeY, 14 * this.uiScale, 0x1a2230, 0.95)
      .setStrokeStyle(2, 0x8df6ff, 0.45)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(closeX, closeY, "X", {
        fontFamily: "Pixelify Sans",
        fontSize: `${closeBtnSize}px`,
        color: "#d7faff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const over = () => {
      closeBg.setFillStyle(0x243247, 1);
      closeText.setScale(1.08);
    };

    const out = () => {
      closeBg.setFillStyle(0x1a2230, 0.95);
      closeText.setScale(1);
    };

    const close = () => {
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

  private createSocketsAndWires() {
    const colors: WireColor[] = [
      { name: "cyan", hex: 0x63f3ff },
      { name: "green", hex: 0x89ff75 },
      { name: "yellow", hex: 0xffdc6b },
      { name: "pink", hex: 0xff7ceb }
    ];

    const leftX = this.screenX - this.screenW / 2 + this.screenW * 0.13;
    const rightX = this.screenX + this.screenW / 2 - this.screenW * 0.13;

    const ys = [
      this.screenY - this.screenH * 0.23,
      this.screenY - this.screenH * 0.07,
      this.screenY + this.screenH * 0.09,
      this.screenY + this.screenH * 0.25
    ];

    const shuffledLeft = Phaser.Utils.Array.Shuffle([...colors]);
    const shuffledRight = Phaser.Utils.Array.Shuffle([...colors]);

    const directions: Side[] = ["left", "right", "left", "right"];

    for (let i = 0; i < colors.length; i++) {
      const leftSocket = this.createSocket(leftX, ys[i], shuffledLeft[i], "left");
      const rightSocket = this.createSocket(rightX, ys[i], shuffledRight[i], "right");
      this.sockets.push(leftSocket, rightSocket);
    }

    for (let i = 0; i < colors.length; i++) {
      this.createWire(colors[i], directions[i]);
    }
  }

  private createWire(color: WireColor, startSide: Side) {
    const startSocket = this.findSocketByColorAndSide(color.name, startSide);
    if (!startSocket) return;

    const plug = this.add.container(startSocket.x, startSocket.y);
    const plugGfx = this.add.graphics();
    plug.add(plugGfx);

    // plug iniziale sempre colorato
    this.drawPlugGraphic(plugGfx, color.hex, startSide, true);

    const cable = this.add.graphics();

    const state: WireState = {
      color,
      startX: startSocket.x,
      startY: startSocket.y,
      endX: startSocket.x,
      endY: startSocket.y,
      connected: false,
      activeGlow: false,
      plug,
      plugGfx,
      cable,
      startSide
    };

    this.wires.push(state);
    this.redrawCable(state);

    plug.setInteractive(
      new Phaser.Geom.Rectangle(-46, -46, 92, 92),
      Phaser.Geom.Rectangle.Contains
    );

    this.input.setDraggable(plug);

    plug.on("dragstart", () => {
      if (state.connected) return;
      plug.setScale(1.06);
    });

    plug.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (state.connected) return;

      state.endX = Phaser.Math.Clamp(
        dragX,
        this.screenX - this.screenW / 2 + this.screenW * 0.04,
        this.screenX + this.screenW / 2 - this.screenW * 0.04
      );

      state.endY = Phaser.Math.Clamp(
        dragY,
        this.screenY - this.screenH / 2 + this.screenH * 0.05,
        this.screenY + this.screenH / 2 - this.screenH * 0.05
      );

      plug.x = state.endX;
      plug.y = state.endY;

      this.redrawCable(state);
    });

    plug.on("dragend", () => {
      if (state.connected) return;
      plug.setScale(1);
      this.tryConnect(state);
    });
  }

  private drawTablet() {
    const g = this.add.graphics();

    const x = this.boardX - this.boardW / 2;
    const y = this.boardY - this.boardH / 2;

    g.fillStyle(0x3e4454, 1);
    g.fillRoundedRect(x, y, this.boardW, this.boardH, 24 * this.uiScale);

    g.fillStyle(0x555e70, 1);
    g.fillRoundedRect(
      x + 8 * this.uiScale,
      y + 8 * this.uiScale,
      this.boardW - 16 * this.uiScale,
      this.boardH - 16 * this.uiScale,
      20 * this.uiScale
    );

    g.lineStyle(Math.max(3, 5 * this.uiScale), 0x1c212b, 1);
    g.strokeRoundedRect(
      x + 4 * this.uiScale,
      y + 4 * this.uiScale,
      this.boardW - 8 * this.uiScale,
      this.boardH - 8 * this.uiScale,
      22 * this.uiScale
    );

    g.lineStyle(2, 0xa8b3bf, 0.22);
    g.strokeRoundedRect(
      x + 10 * this.uiScale,
      y + 10 * this.uiScale,
      this.boardW - 20 * this.uiScale,
      this.boardH - 20 * this.uiScale,
      18 * this.uiScale
    );

    const topBarY = y + 16 * this.uiScale;
    const slotH = 20 * this.uiScale;
    const slotGap = 14 * this.uiScale;
    const slotCount = 6;
    const availableW = this.boardW - 50 * this.uiScale - slotGap * (slotCount - 1);
    const slotW = availableW / slotCount;

    for (let i = 0; i < slotCount; i++) {
      const sx = x + 25 * this.uiScale + i * (slotW + slotGap);

      g.fillStyle(i % 2 === 0 ? 0x676f7d : 0x5f6876, 1);
      g.fillRoundedRect(sx, topBarY, slotW, slotH, 4 * this.uiScale);

      g.lineStyle(1, 0x444c59, 1);
      g.strokeRoundedRect(sx, topBarY, slotW, slotH, 4 * this.uiScale);
    }

    const screenOuterX = this.screenX - this.screenW / 2 - 18 * this.uiScale;
    const screenOuterY = this.screenY - this.screenH / 2 - 18 * this.uiScale;
    const screenOuterW = this.screenW + 36 * this.uiScale;
    const screenOuterH = this.screenH + 36 * this.uiScale;

    g.fillStyle(0x7e8791, 1);
    g.fillRoundedRect(
      screenOuterX,
      screenOuterY,
      screenOuterW,
      screenOuterH,
      20 * this.uiScale
    );

    g.lineStyle(Math.max(2, 4 * this.uiScale), 0x4a525b, 1);
    g.strokeRoundedRect(
      screenOuterX,
      screenOuterY,
      screenOuterW,
      screenOuterH,
      20 * this.uiScale
    );

    g.fillStyle(0x1d2430, 1);
    g.fillRoundedRect(
      this.screenX - this.screenW / 2,
      this.screenY - this.screenH / 2,
      this.screenW,
      this.screenH,
      12 * this.uiScale
    );

    g.lineStyle(Math.max(2, 4 * this.uiScale), 0x0e131b, 0.85);
    g.strokeRoundedRect(
      this.screenX - this.screenW / 2 + 1,
      this.screenY - this.screenH / 2 + 1,
      this.screenW - 2,
      this.screenH - 2,
      12 * this.uiScale
    );

    g.lineStyle(Math.max(2, 3 * this.uiScale), 0x39f4ff, 0.58);
    g.strokeRoundedRect(
      this.screenX - this.screenW / 2,
      this.screenY - this.screenH / 2,
      this.screenW,
      this.screenH,
      12 * this.uiScale
    );

    g.lineStyle(1, 0x9dfdff, 0.45);
    g.strokeRoundedRect(
      this.screenX - this.screenW / 2 + 6 * this.uiScale,
      this.screenY - this.screenH / 2 + 6 * this.uiScale,
      this.screenW - 12 * this.uiScale,
      this.screenH - 12 * this.uiScale,
      9 * this.uiScale
    );

    g.fillStyle(0x98a2ad, 1);
    g.fillRoundedRect(
      x + 10 * this.uiScale,
      this.boardY - this.boardH * 0.125,
      16 * this.uiScale,
      this.boardH * 0.25,
      8 * this.uiScale
    );
    g.fillRoundedRect(
      x + this.boardW - 26 * this.uiScale,
      this.boardY - this.boardH * 0.125,
      16 * this.uiScale,
      this.boardH * 0.25,
      8 * this.uiScale
    );

    const screwOffsetX = 22 * this.uiScale;
    const screwOffsetY = 22 * this.uiScale;

    const screws = [
      [x + screwOffsetX, y + screwOffsetY],
      [x + this.boardW - screwOffsetX, y + screwOffsetY],
      [x + screwOffsetX, y + this.boardH - screwOffsetY],
      [x + this.boardW - screwOffsetX, y + this.boardH - screwOffsetY]
    ];

    screws.forEach(([sx, sy]) => {
      g.fillStyle(0x262b33, 1);
      g.fillCircle(sx, sy, 5 * this.uiScale);
      g.lineStyle(1, 0x7f8893, 0.35);
      g.strokeCircle(sx, sy, 5 * this.uiScale);
    });

    const deco = this.add.graphics();
    deco.lineStyle(2, 0x3af7ff, 0.75);

    deco.strokeRect(
      this.screenX - this.screenW / 2 + this.screenW * 0.03,
      this.screenY - this.screenH / 2 + this.screenH * 0.03,
      this.screenW * 0.025,
      this.screenH * 0.02
    );

    deco.strokeRect(
      this.screenX - this.screenW / 2 + this.screenW * 0.03,
      this.screenY - this.screenH / 2 + this.screenH * 0.055,
      this.screenW * 0.012,
      this.screenH * 0.02
    );

    deco.strokeRect(
      this.screenX + this.screenW / 2 - this.screenW * 0.045,
      this.screenY - this.screenH / 2 + this.screenH * 0.03,
      this.screenW * 0.018,
      this.screenH * 0.02
    );

    deco.strokeRect(
      this.screenX + this.screenW / 2 - this.screenW * 0.038,
      this.screenY - this.screenH / 2 + this.screenH * 0.055,
      this.screenW * 0.012,
      this.screenH * 0.02
    );

    const corridor = this.add.graphics();

    corridor.lineStyle(Math.max(2, 3 * this.uiScale), 0xff73ef, 0.32);
    corridor.beginPath();
    corridor.moveTo(this.screenX - this.screenW * 0.11, this.screenY - this.screenH * 0.33);
    corridor.lineTo(this.screenX - this.screenW * 0.02, this.screenY + this.screenH * 0.01);
    corridor.strokePath();

    corridor.beginPath();
    corridor.moveTo(this.screenX + this.screenW * 0.11, this.screenY - this.screenH * 0.33);
    corridor.lineTo(this.screenX + this.screenW * 0.02, this.screenY + this.screenH * 0.01);
    corridor.strokePath();

    corridor.lineStyle(Math.max(2, 3 * this.uiScale), 0x43f6ff, 0.32);
    corridor.beginPath();
    corridor.moveTo(this.screenX - this.screenW * 0.085, this.screenY + this.screenH * 0.31);
    corridor.lineTo(this.screenX - this.screenW * 0.02, this.screenY + this.screenH * 0.01);
    corridor.lineTo(this.screenX + this.screenW * 0.02, this.screenY + this.screenH * 0.01);
    corridor.lineTo(this.screenX + this.screenW * 0.085, this.screenY + this.screenH * 0.31);
    corridor.strokePath();

    corridor.lineStyle(2, 0x7efcff, 0.35);
    corridor.strokeRoundedRect(
      this.screenX - this.screenW * 0.018,
      this.screenY - this.screenH * 0.005,
      this.screenW * 0.036,
      this.screenH * 0.03,
      4 * this.uiScale
    );
  }

  private createSocket(
    x: number,
    y: number,
    color: WireColor,
    side: Side
  ): SocketData {
    const container = this.add.container(x, y);
    const gfx = this.add.graphics();
    container.add(gfx);

    // solo i socket di partenza sono colorati
    const isStartSide = side === "left" || side === "right";
    this.drawSocketGraphic(gfx, color, side, false);

    return { x, y, side, color, container, gfx };
  }

  private drawSocketGraphic(
    g: Phaser.GameObjects.Graphics,
    color: WireColor,
    side: Side,
    isLit: boolean
  ) {
    g.clear();

    const mainColor = isLit ? color.hex : 0x6c7687;
    const glowAlpha = isLit ? 0.12 : 0.04;

    const r1 = 18 * this.uiScale;
    const r2 = 13 * this.uiScale;
    const r3 = 8 * this.uiScale;
    const arm = 30 * this.uiScale;

    g.lineStyle(Math.max(2, 5 * this.uiScale), mainColor, glowAlpha);
    g.strokeCircle(0, 0, r1);

    g.lineStyle(Math.max(3, 6 * this.uiScale), mainColor, 0.95);
    g.strokeCircle(0, 0, r2);

    g.lineStyle(2, 0xffffff, isLit ? 0.22 : 0.10);
    g.strokeCircle(0, 0, r3);

    g.lineStyle(Math.max(3, 5 * this.uiScale), mainColor, 0.95);

    if (side === "left") {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(30 * this.uiScale, 0);
      g.strokePath();

      g.lineStyle(2, mainColor, 0.75);
      g.beginPath();
      g.moveTo(12 * this.uiScale, -7 * this.uiScale);
      g.lineTo(20 * this.uiScale, -2 * this.uiScale);
      g.moveTo(12 * this.uiScale, 7 * this.uiScale);
      g.lineTo(20 * this.uiScale, 2 * this.uiScale);
      g.strokePath();
    } else {
      g.beginPath();
      g.moveTo(-30 * this.uiScale, 0);
      g.lineTo(0, 0);
      g.strokePath();

      g.lineStyle(2, mainColor, 0.75);
      g.beginPath();
      g.moveTo(-12 * this.uiScale, -7 * this.uiScale);
      g.lineTo(-20 * this.uiScale, -2 * this.uiScale);
      g.moveTo(-12 * this.uiScale, 7 * this.uiScale);
      g.lineTo(-20 * this.uiScale, 2 * this.uiScale);
      g.strokePath();
    }
  }

  private drawPlugGraphic(
    g: Phaser.GameObjects.Graphics,
    color: number,
    side: Side,
    isLit: boolean
  ) {
    g.clear();

    const mainColor = isLit ? color : 0x6c7687;
    const glowAlpha = isLit ? 0.10 : 0.04;

    const glowR = 19 * this.uiScale;
    const fillR = 15 * this.uiScale;
    const bodyR = 13 * this.uiScale;
    const innerR = 8 * this.uiScale;
    const arm = 32 * this.uiScale;

    g.lineStyle(Math.max(2, 5 * this.uiScale), mainColor, glowAlpha);
    g.strokeCircle(0, 0, glowR);

    g.fillStyle(0x121923, 0.7);
    g.fillCircle(0, 0, fillR);

    g.lineStyle(Math.max(3, 6 * this.uiScale), mainColor, 1);
    g.strokeCircle(0, 0, bodyR);

    g.lineStyle(2, 0xffffff, isLit ? 0.20 : 0.08);
    g.strokeCircle(0, 0, innerR);

    g.lineStyle(Math.max(3, 5 * this.uiScale), mainColor, 1);

    if (side === "left") {
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(arm, 0);
      g.strokePath();

      g.lineStyle(2, mainColor, 0.8);
      g.beginPath();
      g.moveTo(11 * this.uiScale, -7 * this.uiScale);
      g.lineTo(19 * this.uiScale, -2 * this.uiScale);
      g.moveTo(11 * this.uiScale, 7 * this.uiScale);
      g.lineTo(19 * this.uiScale, 2 * this.uiScale);
      g.strokePath();
    } else {
      g.beginPath();
      g.moveTo(-arm, 0);
      g.lineTo(0, 0);
      g.strokePath();

      g.lineStyle(2, mainColor, 0.8);
      g.beginPath();
      g.moveTo(-11 * this.uiScale, -7 * this.uiScale);
      g.lineTo(-19 * this.uiScale, -2 * this.uiScale);
      g.moveTo(-11 * this.uiScale, 7 * this.uiScale);
      g.lineTo(-19 * this.uiScale, 2 * this.uiScale);
      g.strokePath();
    }
  }

  private redrawCable(wire: WireState) {
    wire.cable.clear();

    const cableColor = wire.activeGlow ? wire.color.hex : 0x5d6675;
    const cableAlpha = wire.activeGlow ? 0.95 : 0.45;

    const cp1x =
      wire.startSide === "left"
        ? wire.startX + 90 * this.uiScale
        : wire.startX - 90 * this.uiScale;

    const cp2x =
      wire.startSide === "left"
        ? wire.endX - 55 * this.uiScale
        : wire.endX + 55 * this.uiScale;

    const curve = new Phaser.Curves.CubicBezier(
      new Phaser.Math.Vector2(wire.startX, wire.startY),
      new Phaser.Math.Vector2(cp1x, wire.startY),
      new Phaser.Math.Vector2(cp2x, wire.endY),
      new Phaser.Math.Vector2(wire.endX, wire.endY)
    );

    const points = curve.getPoints(52);

    wire.cable.lineStyle(Math.max(8, 16 * this.uiScale), 0x000000, 0.22);
    for (let i = 0; i < points.length - 1; i++) {
      wire.cable.lineBetween(points[i].x, points[i].y + 2, points[i + 1].x, points[i + 1].y + 2);
    }

    wire.cable.lineStyle(Math.max(5, 10 * this.uiScale), cableColor, cableAlpha);
    for (let i = 0; i < points.length - 1; i++) {
      wire.cable.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }

    wire.cable.lineStyle(Math.max(2, 3 * this.uiScale), 0xffffff, wire.activeGlow ? 0.16 : 0.08);
    for (let i = 0; i < points.length - 1; i++) {
      wire.cable.lineBetween(points[i].x, points[i].y - 1, points[i + 1].x, points[i + 1].y - 1);
    }
  }

  private tryConnect(wire: WireState) {
    const correctTargetSide: Side = wire.startSide === "left" ? "right" : "left";

    const isClearlyOnWrongSide =
      (wire.startSide === "left" && wire.endX < this.screenX) ||
      (wire.startSide === "right" && wire.endX > this.screenX);

    if (isClearlyOnWrongSide) {
      this.showAlert("WARNING: WRONG DIRECTION", 1200);
      this.returnWire(wire);
      return;
    }

    let targetHit: SocketData | null = null;

    for (const socket of this.sockets) {
      if (socket.side !== correctTargetSide) continue;

      const alreadyUsed = this.wires.some(w => {
        if (!w.connected) return false;
        const usedSocket = this.findConnectedEndSocket(w);
        return usedSocket?.container === socket.container;
      });
      if (alreadyUsed) continue;

      const dist = Phaser.Math.Distance.Between(wire.endX, wire.endY, socket.x, socket.y);
      if (dist < 42 * this.uiScale + 8) {
        targetHit = socket;
        break;
      }
    }

    if (!targetHit) {
      this.returnWire(wire);
      return;
    }

    if (wire.color.name === targetHit.color.name) {
      wire.connected = true;
      wire.activeGlow = true;
      wire.endX = targetHit.x;
      wire.endY = targetHit.y;
      wire.plug.x = wire.endX;
      wire.plug.y = wire.endY;

      this.redrawCable(wire);

      // plug già colorato, lo ridisegniamo comunque per sicurezza
      this.drawPlugGraphic(wire.plugGfx, wire.color.hex, wire.startSide, true);

      // illumina il socket di arrivo
      this.drawSocketGraphic(targetHit.gfx, targetHit.color, targetHit.side, true);

      this.tweens.add({
        targets: wire.plug,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 110,
        yoyo: true
      });

      this.checkWin();
    } else {
      this.flashSocket(targetHit.container);
      this.showAlert("WARNING: WRONG CONNECTION", 700);
      this.returnWire(wire);
    }
  }

  private findConnectedEndSocket(wire: WireState): SocketData | undefined {
    const targetSide = wire.startSide === "left" ? "right" : "left";
    return this.sockets.find(
      s => s.side === targetSide && s.color.name === wire.color.name
    );
  }

  private findSocketByColorAndSide(colorName: string, side: Side) {
    return this.sockets.find(s => s.color.name === colorName && s.side === side);
  }

  private flashSocket(target: Phaser.GameObjects.Container) {
    this.tweens.add({
      targets: target,
      alpha: 0.22,
      duration: 90,
      yoyo: true,
      repeat: 2
    });
  }

  private showAlert(message: string, hold = 500) {
    if (!this.alertText || !this.alertBg) return;

    this.tweens.killTweensOf([this.alertText, this.alertBg]);

    this.alertText.setText(message);
    this.alertBg.width = this.screenW * 0.30;

    this.alertBg.setAlpha(0.92);
    this.alertText.setAlpha(1);

    this.cameras.main.shake(180, 0.006);

    this.tweens.add({
      targets: [this.alertText, this.alertBg],
      alpha: 0,
      duration: 550,
      delay: hold
    });
  }

  private returnWire(wire: WireState) {
    const fromX = wire.plug.x;
    const fromY = wire.plug.y;

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 220,
      onUpdate: tween => {
        const t = tween.getValue();

        wire.endX = Phaser.Math.Linear(fromX, wire.startX, t);
        wire.endY = Phaser.Math.Linear(fromY, wire.startY, t);
        wire.plug.x = wire.endX;
        wire.plug.y = wire.endY;

        this.redrawCable(wire);
      },
      onComplete: () => {
        wire.endX = wire.startX;
        wire.endY = wire.startY;
        wire.plug.x = wire.startX;
        wire.plug.y = wire.startY;
        this.redrawCable(wire);
      }
    });
  }

  private checkWin() {
    const allConnected = this.wires.every(w => w.connected);
    if (!allConnected) return;

    const winY = this.screenY + this.screenH / 2 - this.screenH * 0.05;

    const winBg = this.add
      .rectangle(
        this.screenX,
        winY,
        this.screenW * 0.42,
        Math.max(30, 36 * this.uiScale),
        0x1a3a31,
        0.88
      )
      .setStrokeStyle(2, 0x70fdc2, 0.45)
      .setOrigin(0.5);

    const winText = this.add
      .text(this.screenX, winY, "COMPLETED: ACCESS UNLOCKED", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(14, Math.round(22 * this.uiScale))}px`,
        color: "#70fdc2",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.registry.set("task1Completed", true);

    this.tweens.add({
      targets: [winBg, winText],
      alpha: 0.72,
      duration: 260,
      yoyo: true,
      repeat: 2
    });

    this.time.delayedCall(1200, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }
}