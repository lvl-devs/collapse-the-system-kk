import Phaser from "phaser";

// ─── Types ────────────────────────────────────────────────────────────────────
type Side = "left" | "right" | "top" | "bottom";
type WireColor = { name: string; hex: number };

type WireState = {
  color: WireColor;
  // fixed anchor (socketA position, never moves)
  anchorX: number;
  anchorY: number;
  // free end — follows the drag, snaps to socketB on connect
  freeX: number;
  freeY: number;
  connected: boolean;
  activeGlow: boolean;
  plug: Phaser.GameObjects.Container;
  plugGfx: Phaser.GameObjects.Graphics;
  cable: Phaser.GameObjects.Graphics;
  anchorSide: Side;
  targetSide: Side;
  socketA: SocketData;
  socketB: SocketData;
};

type SocketData = {
  x: number;
  y: number;
  side: Side;
  color: WireColor;
  isRevealed: boolean;
  container: Phaser.GameObjects.Container;
  gfx: Phaser.GameObjects.Graphics;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const WIRE_COLORS: WireColor[] = [
  { name: "cyan",   hex: 0x00eeff },
  { name: "green",  hex: 0x00ff44 },
  { name: "yellow", hex: 0xffe600 },
  { name: "pink",   hex: 0xff00aa },
  { name: "orange", hex: 0xff6600 },
  { name: "blue",   hex: 0x4488ff },
  { name: "lime",   hex: 0xaaff00 },
  { name: "white",  hex: 0xeeeeff },
];

const GRAY_COLOR: WireColor = { name: "gray", hex: 0x6c7687 };
const SOCKET_COUNT = 4; 
const TABLET_RATIO = 1.68;

// Bezier handle offsets
const CABLE_CP1 = 90;
const CABLE_CP2 = 55;

// ─── Scene ────────────────────────────────────────────────────────────────────
export default class Minigame1 extends Phaser.Scene {
  private wires: WireState[] = [];
  private sockets: SocketData[] = [];

  // Layout
  private boardX!: number;
  private boardY!: number;
  private boardW!: number;
  private boardH!: number;
  private screenX!: number;
  private screenY!: number;
  private screenW!: number;
  private screenH!: number;
  private uiScale!: number;

  // UI
  private alertText?: Phaser.GameObjects.Text;
  private alertBg?: Phaser.GameObjects.Rectangle;

  constructor() {
    super("Minigame1");
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  create() {
    const { width, height } = this.scale;

    this.scale.off("resize");
    this.scale.on("resize", () => this.scene.restart());

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

  // ─── Layout ─────────────────────────────────────────────────────────────────

  private computeResponsiveLayout(width: number, height: number) {
    const maxW = width * 0.92;
    const maxH = height * 0.84;

    this.boardW = Math.min(maxW, maxH * TABLET_RATIO, 1260);
    this.boardH = this.boardW / TABLET_RATIO;

    if (this.boardH > maxH) {
      this.boardH = maxH;
      this.boardW = this.boardH * TABLET_RATIO;
    }

    this.boardX = width / 2;
    this.boardY = height / 2;
    this.screenW = this.boardW * 0.88;
    this.screenH = this.boardH * 0.74;
    this.screenX = this.boardX;
    this.screenY = this.boardY + this.boardH * 0.02;
    this.uiScale = Phaser.Math.Clamp(this.boardW / 1200, 0.72, 1.05);
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────────

  /** Shorthand: scale a design-space value by uiScale. */
  private s(value: number) {
    return value * this.uiScale;
  }

  private createHeaderTexts() {
    const titleSize = Math.round(this.s(28));

    this.add
      .text(
        this.boardX,
        this.boardY - this.boardH / 2 - this.s(18),
        "SYSTEM HACKING",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${titleSize}px`,
          color: "#61ff7c",
          fontStyle: "bold",
          stroke: "#0e2f12",
          strokeThickness: Math.max(3, Math.round(this.s(5))),
        }
      )
      .setOrigin(0.5);

    const hintY = this.screenY - this.screenH / 2 + this.screenH * 0.095;
    const hintBg = this.add
      .rectangle(
        this.screenX,
        hintY,
        this.screenW * 0.64,
        Math.max(34, this.s(38)),
        0x10202a,
        0.88
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x39f4ff, 0.35)
      .setAlpha(0);

    const hintText = this.add
      .text(
        this.screenX,
        hintY,
        "RESTORE THE CIRCUIT BY MATCHING COLORS",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(22, Math.round(this.s(16)))}px`,
          color: "#bafcff",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setAlpha(0);

    const targets = [hintBg, hintText];
    this.tweens.add({ targets, alpha: 1, duration: 1250, ease: "Sine.Out" });
    this.tweens.add({ targets, alpha: 0, duration: 1500, delay: 1900, ease: "Sine.In" });
  }

  private createAlerts() {
    const alertY = this.screenY - this.screenH / 2 + this.screenH * 0.055;

    this.alertBg = this.add
      .rectangle(
        this.screenX,
        alertY,
        this.screenW * 0.30,
        Math.max(24, this.s(30)),
        0xff2f3d,
        0.92
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.18)
      .setAlpha(0);

    this.alertText = this.add
      .text(this.screenX, alertY, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(12, Math.round(this.s(16)))}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private createCloseButton() {
    const closeX = this.boardX + this.boardW / 2 - this.s(38);
    const closeY = this.boardY - this.boardH / 2 + this.s(38);

    const closeBg = this.add
      .circle(closeX, closeY, this.s(14), 0x1a2230, 0.95)
      .setStrokeStyle(2, 0x8df6ff, 0.45)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(closeX, closeY, "X", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(18, this.s(20))}px`,
        color: "#d7faff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const over  = () => { closeBg.setFillStyle(0x243247, 1); closeText.setScale(1.08); };
    const out   = () => { closeBg.setFillStyle(0x1a2230, 0.95); closeText.setScale(1); };
    const close = () => { this.scene.stop(); this.scene.resume("GamePlay"); };

    for (const obj of [closeBg, closeText]) {
      obj.on("pointerover", over);
      obj.on("pointerout", out);
      obj.on("pointerdown", close);
    }
  }

  // ─── Socket + Wire creation ─────────────────────────────────────────────────

  private createSocketsAndWires() {
    // Layout anchors
    const leftX   = this.screenX - this.screenW / 2 + this.screenW * 0.15;
    const rightX  = this.screenX + this.screenW / 2 - this.screenW * 0.15;
    const topY    = this.screenY - this.screenH / 2 + this.screenH * 0.20;
    const bottomY = this.screenY + this.screenH / 2 - this.screenH * 0.11;

    const offsetY = this.screenH * 0.03;
    const vPos = [
  this.screenY - this.screenH * 0.22 + offsetY,
  this.screenY - this.screenH * 0.07 + offsetY,
  this.screenY + this.screenH * 0.07 + offsetY,
  this.screenY + this.screenH * 0.22 + offsetY
];

const hPos = [
  this.screenX - this.screenW * 0.16,
  this.screenX - this.screenW * 0.05,
  this.screenX + this.screenW * 0.05,
  this.screenX + this.screenW * 0.16
];

    const colors = Phaser.Utils.Array.Shuffle([...WIRE_COLORS]) as WireColor[];
    const groupA = colors.slice(0, 4); // left ↔ right
    const groupB = colors.slice(4, 8); // top  ↔ bottom

    // 50% of destination sockets are revealed → 4 revealed, 4 hidden
    const revealMask = Phaser.Utils.Array.Shuffle([
      ...Array(4).fill(true),
      ...Array(4).fill(false),
    ]) as boolean[];

    const slots = () => Phaser.Utils.Array.Shuffle([0, 1, 2, 3]) as number[];
    const leftSlots   = slots();
    const rightSlots  = slots();
    const topSlots    = slots();
    const bottomSlots = slots();

    // Group A: left ↔ right
    for (let i = 0; i < groupA.length; i++) {
      const color = groupA[i];
      const sA = this.createSocket(leftX,  vPos[leftSlots[i]],  color, "left",  true);
      const sB = this.createSocket(rightX, vPos[rightSlots[i]], color, "right", revealMask[i]);
      this.sockets.push(sA, sB);
      this.createWire(color, sA, sB);
    }

    // Group B: top ↔ bottom
    for (let i = 0; i < groupB.length; i++) {
      const color = groupB[i];
      const sA = this.createSocket(hPos[topSlots[i]],    topY,    color, "top",    true);
      const sB = this.createSocket(hPos[bottomSlots[i]], bottomY, color, "bottom", revealMask[i + 4]);
      this.sockets.push(sA, sB);
      this.createWire(color, sA, sB);
    }
  }

  /** Returns an array of `count` values starting at `origin` spaced by `step`. */
  private linspace(origin: number, step: number, count: number): number[] {
    return Array.from({ length: count }, (_, i) => origin + i * step);
  }

  private createSocket(x: number, y: number, color: WireColor, side: Side, isRevealed = false): SocketData {
    const container = this.add.container(x, y);
    const gfx = this.add.graphics();
    container.add(gfx);
    this.drawSocketGraphic(gfx, color, side, isRevealed);
    return { x, y, side, color, isRevealed, container, gfx };
  }

  private createWire(color: WireColor, socketA: SocketData, socketB: SocketData) {
    const plug = this.add.container(socketA.x, socketA.y);
    const plugGfx = this.add.graphics();
    plug.add(plugGfx);
    this.drawPlugGraphic(plugGfx, color.hex, socketA.side, true, true);

    plug.setInteractive(new Phaser.Geom.Rectangle(-46, -46, 92, 92), Phaser.Geom.Rectangle.Contains);
    this.input.setDraggable(plug);

    const cable = this.add.graphics();

    const state: WireState = {
      color,
      anchorX: socketA.x, anchorY: socketA.y,
      freeX:   socketA.x, freeY:   socketA.y, // collapsed on anchor at start
      connected: false,
      activeGlow: false,
      plug, plugGfx,
      cable,
      anchorSide: socketA.side,
      targetSide: socketB.side,
      socketA, socketB,
    };

    this.wires.push(state);
    this.redrawCable(state);

    const clampX = (v: number) => Phaser.Math.Clamp(v,
      this.screenX - this.screenW / 2 + this.screenW * 0.04,
      this.screenX + this.screenW / 2 - this.screenW * 0.04);
    const clampY = (v: number) => Phaser.Math.Clamp(v,
      this.screenY - this.screenH / 2 + this.screenH * 0.05,
      this.screenY + this.screenH / 2 - this.screenH * 0.05);

    plug.on("dragstart", () => { if (!state.connected) plug.setScale(1.06); });

    plug.on("drag", (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      if (state.connected) return;
      state.freeX = clampX(dx);
      state.freeY = clampY(dy);
      plug.setPosition(state.freeX, state.freeY);
      this.redrawCable(state);
    });

    plug.on("dragend", () => {
      if (state.connected) return;
      plug.setScale(1);
      this.tryConnect(state);
    });
  }

  // ─── Graphics ───────────────────────────────────────────────────────────────

  /**
   * Draws the arm + decorative chevrons for a socket or plug.
   * `dir` is +1 (arm points toward positive axis) or -1 (toward negative).
   * `axis` is "h" for horizontal, "v" for vertical.
   */
  private drawArm(
    g: Phaser.GameObjects.Graphics,
    mainColor: number,
    length: number,
    axis: "h" | "v",
    dir: 1 | -1
  ) {
    g.lineStyle(Math.max(3, this.s(5)), mainColor, 0.95);
    if (axis === "h") {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(dir * length, 0); g.strokePath();
      g.lineStyle(2, mainColor, 0.75);
      for (const [ox, oy] of [[12, -7], [12, 7]] as [number, number][]) {
        g.beginPath();
        g.moveTo(dir * this.s(ox), this.s(oy));
        g.lineTo(dir * this.s(ox + 8), this.s(oy / Math.abs(oy) * 2));
        g.strokePath();
      }
    } else {
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, dir * length); g.strokePath();
      g.lineStyle(2, mainColor, 0.75);
      for (const [ox, oy] of [[-7, 12], [7, 12]] as [number, number][]) {
        g.beginPath();
        g.moveTo(this.s(ox), dir * this.s(oy));
        g.lineTo(this.s(ox / Math.abs(ox) * 2), dir * this.s(oy + 8));
        g.strokePath();
      }
    }
  }

  private armConfig(side: Side): { axis: "h" | "v"; dir: 1 | -1 } {
    if (side === "left")   return { axis: "h", dir:  1 };
    if (side === "right")  return { axis: "h", dir: -1 };
    if (side === "top")    return { axis: "v", dir:  1 };
    /* bottom */           return { axis: "v", dir: -1 };
  }

  private drawSocketGraphic(
    g: Phaser.GameObjects.Graphics,
    color: WireColor,
    side: Side,
    isLit: boolean
  ) {
    g.clear();
    const c = isLit ? color.hex : 0x6c7687;
    const glowAlpha = isLit ? 0.12 : 0.04;

    g.lineStyle(Math.max(2, this.s(5)), c, glowAlpha);
    g.strokeCircle(0, 0, this.s(18));
    g.lineStyle(Math.max(3, this.s(6)), c, 0.95);
    g.strokeCircle(0, 0, this.s(13));
    g.lineStyle(2, 0xffffff, isLit ? 0.22 : 0.10);
    g.strokeCircle(0, 0, this.s(8));

    const { axis, dir } = this.armConfig(side);
    this.drawArm(g, c, this.s(30), axis, dir);
  }

  private drawPlugGraphic(
  g: Phaser.GameObjects.Graphics,
  color: number,
  side: Side,
  isLit: boolean,
  showDragDot = false
) {
  g.clear();
  const c = isLit ? color : 0x6c7687;

  g.lineStyle(Math.max(2, this.s(5)), c, isLit ? 0.10 : 0.04);
  g.strokeCircle(0, 0, this.s(19));

  g.fillStyle(0x121923, 0.7);
  g.fillCircle(0, 0, this.s(15));

  g.lineStyle(Math.max(3, this.s(6)), c, 1);
  g.strokeCircle(0, 0, this.s(13));

  g.lineStyle(2, 0xffffff, isLit ? 0.20 : 0.08);
  g.strokeCircle(0, 0, this.s(8));

  const { axis, dir } = this.armConfig(side);
  this.drawArm(g, c, this.s(32), axis, dir);

  if (showDragDot) {
    let dotX = 0;
    let dotY = 0;
    const dotOffset = this.s(18);
    const dotRadius = this.s(4.5);

    if (side === "left") {
      dotX = dotOffset;
    } else if (side === "right") {
      dotX = -dotOffset;
    } else if (side === "top") {
      dotY = dotOffset;
    } else if (side === "bottom") {
      dotY = -dotOffset;
    }

    g.fillStyle(0x000000, 0.95);
    g.fillCircle(dotX, dotY, dotRadius);

    g.lineStyle(1.5, 0xffffff, 0.12);
    g.strokeCircle(dotX, dotY, dotRadius);
  }
}

  private buildCurve(wire: WireState): Phaser.Curves.CubicBezier {
    const cp = this.s(CABLE_CP1);
    const V2 = Phaser.Math.Vector2;

    const cpDir = (side: Side): { ox: number; oy: number } => {
      if (side === "left")   return { ox:  cp, oy: 0  };
      if (side === "right")  return { ox: -cp, oy: 0  };
      if (side === "top")    return { ox: 0,   oy:  cp };
      /* bottom */           return { ox: 0,   oy: -cp };
    };

    const d1 = cpDir(wire.anchorSide);
    // When free end is dragging, use a neutral outward direction based on target side
    const d2 = wire.connected ? cpDir(wire.targetSide) : { ox: 0, oy: 0 };

    return new Phaser.Curves.CubicBezier(
      new V2(wire.anchorX, wire.anchorY),
      new V2(wire.anchorX + d1.ox, wire.anchorY + d1.oy),
      new V2(wire.freeX   + d2.ox, wire.freeY   + d2.oy),
      new V2(wire.freeX, wire.freeY)
    );
  }

  private redrawCable(wire: WireState) {
    wire.cable.clear();
    // Don't draw cable when free end is collapsed on anchor (not yet dragged)
    const dist = Phaser.Math.Distance.Between(wire.anchorX, wire.anchorY, wire.freeX, wire.freeY);
    if (dist < 4) return;

    const cableColor = wire.activeGlow ? wire.color.hex : 0x5d6675;
    const cableAlpha = wire.activeGlow ? 0.95 : 0.45;
    const pts = this.buildCurve(wire).getPoints(52);

    wire.cable.lineStyle(Math.max(8, this.s(16)), 0x000000, 0.22);
    for (let i = 0; i < pts.length - 1; i++)
      wire.cable.lineBetween(pts[i].x, pts[i].y + 2, pts[i+1].x, pts[i+1].y + 2);

    wire.cable.lineStyle(Math.max(5, this.s(10)), cableColor, cableAlpha);
    for (let i = 0; i < pts.length - 1; i++)
      wire.cable.lineBetween(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);

    wire.cable.lineStyle(Math.max(2, this.s(3)), 0xffffff, wire.activeGlow ? 0.16 : 0.08);
    for (let i = 0; i < pts.length - 1; i++)
      wire.cable.lineBetween(pts[i].x, pts[i].y - 1, pts[i+1].x, pts[i+1].y - 1);
  }


  private vibrateWrongWire(wire: WireState, onComplete?: () => void) {
  const startX = wire.plug.x;
  const startY = wire.plug.y;

  this.tweens.add({
    targets: wire.plug,
    x: startX - this.s(5),
    duration: 35,
    yoyo: true,
    repeat: 4,
    onComplete: () => {
      wire.plug.setPosition(startX, startY);
      if (onComplete) onComplete();
    }
  });
}
  // ─── Connection logic ────────────────────────────────────────────────────────

  private tryConnect(wire: WireState) {
  const target = wire.socketB;
  const dist = Phaser.Math.Distance.Between(wire.freeX, wire.freeY, target.x, target.y);
  const snapRadius = this.s(42) + 8;

  // Prevent snap onto own anchor socket
  const selfDist = Phaser.Math.Distance.Between(wire.freeX, wire.freeY, wire.anchorX, wire.anchorY);

  if (dist < snapRadius && selfDist > 10) {
    wire.connected = true;
    wire.activeGlow = true;
    wire.freeX = target.x;
    wire.freeY = target.y;
    wire.plug.setPosition(wire.freeX, wire.freeY);
    this.drawPlugGraphic(wire.plugGfx, wire.color.hex, target.side, true, false);
    this.drawSocketGraphic(target.gfx, target.color, target.side, true);
    this.redrawCable(wire);

    this.tweens.add({
      targets: wire.plug,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 110,
      yoyo: true
    });

    this.checkWin();
  } else {
    this.showAlert("ERROR: WRONG CONNECTION", 300);
    this.cameras.main.shake(120, 0.004);

    this.vibrateWrongWire(wire, () => {
      this.returnWire(wire);
    });
  }
}

  private returnWire(wire: WireState) {
    const fromX = wire.plug.x;
    const fromY = wire.plug.y;

    this.tweens.addCounter({
      from: 0, to: 1, duration: 220,
      onUpdate: tween => {
        const t = tween.getValue();
        wire.freeX = Phaser.Math.Linear(fromX, wire.anchorX, t);
        wire.freeY = Phaser.Math.Linear(fromY, wire.anchorY, t);
        wire.plug.setPosition(wire.freeX, wire.freeY);
        this.redrawCable(wire);
      },
      onComplete: () => {
        wire.freeX = wire.anchorX;
        wire.freeY = wire.anchorY;
        wire.plug.setPosition(wire.anchorX, wire.anchorY);
        this.redrawCable(wire);
      },
    });
  }

  private checkWin() {
    if (!this.wires.every(w => w.connected)) return;

    const winY = this.screenY + this.screenH / 2 - this.screenH * 0.05;
    const winBg = this.add
      .rectangle(
        this.screenX, winY,
        this.screenW * 0.42,
        Math.max(30, this.s(36)),
        0x1a3a31, 0.88
      )
      .setStrokeStyle(2, 0x70fdc2, 0.45)
      .setOrigin(0.5);

    const winText = this.add
      .text(this.screenX, winY, "COMPLETED: ACCESS UNLOCKED", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(18, Math.round(this.s(22)))}px`,
        color: "#70fdc2",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.registry.set("task1Completed", true);
    this.tweens.add({ targets: [winBg, winText], alpha: 0.72, duration: 260, yoyo: true, repeat: 2 });
    this.time.delayedCall(1200, () => { this.scene.stop(); this.scene.resume("GamePlay"); });
  }

  // ─── Alert ──────────────────────────────────────────────────────────────────

  private showAlert(message: string, hold = 500) {
    if (!this.alertText || !this.alertBg) return;
    this.tweens.killTweensOf([this.alertText, this.alertBg]);
    this.alertText.setText(message);
    this.alertBg.width = this.screenW * 0.30;
    this.alertBg.setAlpha(0.92);
    this.alertText.setAlpha(1);
    this.cameras.main.shake(180, 0.006);
    this.tweens.add({ targets: [this.alertText, this.alertBg], alpha: 0, duration: 550, delay: hold });
  }

  // ─── Tablet drawing ─────────────────────────────────────────────────────────

  private drawTablet() {
    const g = this.add.graphics();
    const x = this.boardX - this.boardW / 2;
    const y = this.boardY - this.boardH / 2;

    // Body layers
    g.fillStyle(0x3e4454, 1);
    g.fillRoundedRect(x, y, this.boardW, this.boardH, this.s(24));
    g.fillStyle(0x555e70, 1);
    g.fillRoundedRect(x + this.s(8), y + this.s(8), this.boardW - this.s(16), this.boardH - this.s(16), this.s(20));
    g.lineStyle(Math.max(3, this.s(5)), 0x1c212b, 1);
    g.strokeRoundedRect(x + this.s(4), y + this.s(4), this.boardW - this.s(8), this.boardH - this.s(8), this.s(22));
    g.lineStyle(2, 0xa8b3bf, 0.22);
    g.strokeRoundedRect(x + this.s(10), y + this.s(10), this.boardW - this.s(20), this.boardH - this.s(20), this.s(18));

    // Top slot bar
    const slotCount = 6;
    const slotH = this.s(20);
    const slotGap = this.s(14);
    const slotW = (this.boardW - this.s(50) - slotGap * (slotCount - 1)) / slotCount;
    for (let i = 0; i < slotCount; i++) {
      const sx = x + this.s(25) + i * (slotW + slotGap);
      g.fillStyle(i % 2 === 0 ? 0x676f7d : 0x5f6876, 1);
      g.fillRoundedRect(sx, y + this.s(16), slotW, slotH, this.s(4));
      g.lineStyle(1, 0x444c59, 1);
      g.strokeRoundedRect(sx, y + this.s(16), slotW, slotH, this.s(4));
    }

    // Screen bezel
    const ox = this.screenX - this.screenW / 2 - this.s(18);
    const oy = this.screenY - this.screenH / 2 - this.s(18);
    const ow = this.screenW + this.s(36);
    const oh = this.screenH + this.s(36);
    g.fillStyle(0x7e8791, 1);
    g.fillRoundedRect(ox, oy, ow, oh, this.s(20));
    g.lineStyle(Math.max(2, this.s(4)), 0x4a525b, 1);
    g.strokeRoundedRect(ox, oy, ow, oh, this.s(20));

    // Screen
    const sx = this.screenX - this.screenW / 2;
    const sy = this.screenY - this.screenH / 2;
    g.fillStyle(0x1d2430, 1);
    g.fillRoundedRect(sx, sy, this.screenW, this.screenH, this.s(12));
    g.lineStyle(Math.max(2, this.s(4)), 0x0e131b, 0.85);
    g.strokeRoundedRect(sx + 1, sy + 1, this.screenW - 2, this.screenH - 2, this.s(12));
    g.lineStyle(Math.max(2, this.s(3)), 0x39f4ff, 0.58);
    g.strokeRoundedRect(sx, sy, this.screenW, this.screenH, this.s(12));
    g.lineStyle(1, 0x9dfdff, 0.45);
    g.strokeRoundedRect(sx + this.s(6), sy + this.s(6), this.screenW - this.s(12), this.screenH - this.s(12), this.s(9));

    // Side grips
    g.fillStyle(0x98a2ad, 1);
    g.fillRoundedRect(x + this.s(10), this.boardY - this.boardH * 0.125, this.s(16), this.boardH * 0.25, this.s(8));
    g.fillRoundedRect(x + this.boardW - this.s(26), this.boardY - this.boardH * 0.125, this.s(16), this.boardH * 0.25, this.s(8));

    // Corner screws
    const sOff = this.s(22);
    ([
      [x + sOff,              y + sOff],
      [x + this.boardW - sOff, y + sOff],
      [x + sOff,              y + this.boardH - sOff],
      [x + this.boardW - sOff, y + this.boardH - sOff],
    ] as [number, number][]).forEach(([cx, cy]) => {
      g.fillStyle(0x262b33, 1); g.fillCircle(cx, cy, this.s(5));
      g.lineStyle(1, 0x7f8893, 0.35); g.strokeCircle(cx, cy, this.s(5));
    });

    // Corner decorations
    const deco = this.add.graphics();
    deco.lineStyle(2, 0x3af7ff, 0.75);
    [[0.03, 0.03, 0.025, 0.02], [0.03, 0.055, 0.012, 0.02]].forEach(([rx, ry, rw, rh]) =>
      deco.strokeRect(sx + this.screenW * rx, sy + this.screenH * ry, this.screenW * rw, this.screenH * rh)
    );
    [[1 - 0.045, 0.03, 0.018, 0.02], [1 - 0.038, 0.055, 0.012, 0.02]].forEach(([rx, ry, rw, rh]) =>
      deco.strokeRect(sx + this.screenW * rx, sy + this.screenH * ry, this.screenW * rw, this.screenH * rh)
    );

    // Circuit corridor lines
    const cor = this.add.graphics();
    cor.lineStyle(Math.max(2, this.s(3)), 0xff73ef, 0.32);
    ([[-0.11, -0.33, -0.02, 0.01], [0.11, -0.33, 0.02, 0.01]] as [number,number,number,number][])
      .forEach(([x1, y1, x2, y2]) => {
        cor.beginPath();
        cor.moveTo(this.screenX + this.screenW * x1, this.screenY + this.screenH * y1);
        cor.lineTo(this.screenX + this.screenW * x2, this.screenY + this.screenH * y2);
        cor.strokePath();
      });
    cor.lineStyle(Math.max(2, this.s(3)), 0x43f6ff, 0.32);
    cor.beginPath();
    cor.moveTo(this.screenX - this.screenW * 0.085, this.screenY + this.screenH * 0.31);
    cor.lineTo(this.screenX - this.screenW * 0.02,  this.screenY + this.screenH * 0.01);
    cor.lineTo(this.screenX + this.screenW * 0.02,  this.screenY + this.screenH * 0.01);
    cor.lineTo(this.screenX + this.screenW * 0.085, this.screenY + this.screenH * 0.31);
    cor.strokePath();
    cor.lineStyle(2, 0x7efcff, 0.35);
    cor.strokeRoundedRect(
      this.screenX - this.screenW * 0.018,
      this.screenY - this.screenH * 0.005,
      this.screenW * 0.036,
      this.screenH * 0.03,
      this.s(4)
    );
  }
}
