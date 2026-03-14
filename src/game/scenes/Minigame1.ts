import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";

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
  activeTarget: SocketData;
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
  private draggingWire?: WireState;
  private draggingPointerId?: number;

  private readonly externalBoxKey = "minigame1-external-box";
  private readonly accessGrantedKey = "minigame1-access-granted";
  private readonly bgKey = "minigame1-bg";
  

  preload() {
  this.load.image(
    this.externalBoxKey,
    "../assets/images/minigame1/minigame1-external-box.png"
  );

  this.load.image(
    this.externalBoxKey,
    "../assets/images/min3/minigame1-external-box.png"
  );

  this.load.image(
    this.accessGrantedKey,
    "../assets/images/min3/Access_granted.png"
  );

  this.load.image(
    this.bgKey,
    "../assets/images/minigame1/bg-min1.png"
  );

  if (!this.cache.audio.exists("error-2")) {
    this.load.audio("error-2", "../assets/sounds/minigame-1/error-2.mp3");
  }
  if (!this.cache.audio.exists("wire-connection")) {
    this.load.audio("wire-connection", "../assets/sounds/minigame-1/wire-connecting.mp3");
  }
  if (!this.cache.audio.exists("loading-complete")) {
    this.load.audio("loading-complete", "../assets/sounds/loading-complete.mp3");
  }

}

  constructor() {
    super("Minigame1");
  }

  private exitMinigame() {
  this.scene.stop();
  this.scene.resume("GamePlay");
}
  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  create() {
const { width, height } = this.scale;

this.input.keyboard?.on("keydown-ESC", () => {
  this.exitMinigame();
});

  this.scale.off("resize");
  this.scale.on("resize", () => this.scene.restart());

  this.wires = [];
  this.sockets = [];

  this.computeResponsiveLayout(width, height);
  this.drawBackground();
  this.drawTablet();
  this.createCloseButton();
  this.createHeaderTexts();
  this.createAlerts();
  this.createSocketsAndWires();

  this.input.on("pointermove", this.onPointerMove, this);
  this.input.on("pointerup", this.onPointerUp, this);
  this.input.on("pointerupoutside", this.onPointerUp, this);

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    this.input.off("pointermove", this.onPointerMove, this);
    this.input.off("pointerup", this.onPointerUp, this);
    this.input.off("pointerupoutside", this.onPointerUp, this);
  });
    
  }

private drawBackground() {
  const { width, height } = this.scale;

  const bg = this.add
    .image(width / 2, height / 2, this.bgKey)
    .setDepth(-100);

  const scale = Math.max(width / bg.width, height / bg.height);
  bg.setScale(scale);
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
    this.screenW = this.boardW * 0.875;
    this.screenH = this.boardH * 0.73;
    this.screenX = this.boardX;
    this.screenY = this.boardY + this.boardH * 0.015;
    this.uiScale = Phaser.Math.Clamp(this.boardW / 1200, 0.72, 1.05);
  }

  // ─── UI helpers ─────────────────────────────────────────────────────────────

  /** Shorthand: scale a design-space value by uiScale. */
  private s(value: number) {
    return value * this.uiScale;
  }

  private createHeaderTexts() {
  const titleSize = Math.round(this.s(34));

  this.add
    .text(
      this.boardX,
      this.boardY - this.boardH / 2 - this.s(-80),
      "CROSS-WIRE BREACH",
      {
        fontFamily: "Pixelify Sans",
        fontSize: `${titleSize}px`,
        color: "#ffffff",
        fontStyle: "bold",
      }
    )
    .setOrigin(0.5)
    .setDepth(200);

  const hintY = this.screenY - this.screenH / 2 + this.screenH * 0.095;

  const hintText = this.add
    .text(
      this.screenX,
      hintY,
      "RESTORE THE CIRCUIT BY MATCHING COLORS",
      {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(22, Math.round(this.s(33)))}px`,
        color: "#bafcff",
        align: "center",
        fontStyle: "bold",
      }
    )
    .setOrigin(0.5)
    .setAlpha(0);

  this.tweens.add({
    targets: hintText,
    alpha: 1,
    duration: 1250,
    ease: "Sine.Out"
  });

  this.tweens.add({
    targets: hintText,
    alpha: 0,
    duration: 1500,
    delay: 1900,
    ease: "Sine.In"
  });
}

  private createAlerts() {
  const alertY = this.screenY;

  this.alertText = this.add
    .text(this.screenX, alertY, "", {
      fontFamily: "Pixelify Sans",
      fontSize: `${Math.max(26, Math.round(this.s(27)))}px`,
      color: "#ff2f3d",
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: Math.max(2, Math.round(this.s(5))),
    })
    .setOrigin(0.5)
    .setDepth(900)
    .setAlpha(0);
}

  private createCloseButton() {
  const closeX = this.boardX + this.boardW / 2 - this.s(42);
  const closeY = this.boardY - this.boardH / 2 + this.s(42);

  const closeText = this.add
  .text(closeX, closeY, "X", {
    fontFamily: "Pixelify Sans",
    fontSize: `${Math.round(this.s(42))}px`,
    color: "#f2fbff",
    stroke: "#1a1a1a",
    strokeThickness: 2
  })
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true })
  .setDepth(200);

  closeText.on("pointerover", () => {
    closeText.setScale(1.1);
    closeText.setColor("#ffffff");
  });

  closeText.on("pointerout", () => {
    closeText.setScale(1);
    closeText.setColor("#e8f7ff");
  });

  closeText.on("pointerdown", () => {
    this.scene.stop();
    this.scene.resume("GamePlay");
  });
}

  // ─── Socket + Wire creation ─────────────────────────────────────────────────

  private createSocketsAndWires() {
  const halfW = this.screenW / 2;
  const halfH = this.screenH / 2;

  // margine identico da tutti i bordi interni del monitor
  const edgeMargin = this.s(120);

  // coordinate dei 4 lati, tutte con la stessa distanza dal bordo
  const leftX = this.screenX - halfW + edgeMargin;
  const rightX = this.screenX + halfW - edgeMargin;
  const topY = this.screenY - halfH + edgeMargin - this.s(26);
  const bottomY = this.screenY + halfH - edgeMargin + this.s(26);

  // distribuzione simmetrica dei 4 punti per lato
  const sideSpreadY = this.screenH * 0.13;
  const sideSpreadX = this.screenW * 0.13;

  const vPos = [
    this.screenY - sideSpreadY * 1.5,
    this.screenY - sideSpreadY * 0.5,
    this.screenY + sideSpreadY * 0.5,
    this.screenY + sideSpreadY * 1.5,
  ];

  const hPos = [
    this.screenX - sideSpreadX * 1.5,
    this.screenX - sideSpreadX * 0.5,
    this.screenX + sideSpreadX * 0.5,
    this.screenX + sideSpreadX * 1.5,
  ];

  const colors = Phaser.Utils.Array.Shuffle([...WIRE_COLORS]) as WireColor[];
  const groupA = colors.slice(0, SOCKET_COUNT); // left ↔ right
  const groupB = colors.slice(SOCKET_COUNT, SOCKET_COUNT * 2); // top  ↔ bottom

  const revealMask = Phaser.Utils.Array.Shuffle([
    ...Array(4).fill(true),
    ...Array(4).fill(false),
  ]) as boolean[];

  const slots = () => Phaser.Utils.Array.Shuffle(Array.from({ length: SOCKET_COUNT }, (_, i) => i)) as number[];
  const sidePoints = {
    left: vPos.map((y) => ({ x: leftX, y })),
    right: vPos.map((y) => ({ x: rightX, y })),
    top: hPos.map((x) => ({ x, y: topY })),
    bottom: hPos.map((x) => ({ x, y: bottomY })),
  };
  const { leftSlots, rightSlots, topSlots, bottomSlots } = this.buildSocketPlan(slots, sidePoints);

  // left ↔ right
  for (let i = 0; i < groupA.length; i++) {
    const color = groupA[i];
    const sA = this.createSocket(leftX, vPos[leftSlots[i]], color, "left", true);
    const sB = this.createSocket(rightX, vPos[rightSlots[i]], color, "right", revealMask[i]);
    this.sockets.push(sA, sB);
    this.createWire(color, sA, sB);
  }

  // top ↔ bottom
  for (let i = 0; i < groupB.length; i++) {
    const color = groupB[i];
    const sA = this.createSocket(hPos[topSlots[i]], topY, color, "top", true);
    const sB = this.createSocket(hPos[bottomSlots[i]], bottomY, color, "bottom", revealMask[i + 4]);
    this.sockets.push(sA, sB);
    this.createWire(color, sA, sB);
  }
}

  private buildSocketPlan(
    slotsFactory: () => number[],
    sidePoints: {
      left: { x: number; y: number }[];
      right: { x: number; y: number }[];
      top: { x: number; y: number }[];
      bottom: { x: number; y: number }[];
    }
  ): { leftSlots: number[]; rightSlots: number[]; topSlots: number[]; bottomSlots: number[] } {
    const targetIndices = Array.from({ length: SOCKET_COUNT }, (_, i) => i);
    let best: { leftSlots: number[]; rightSlots: number[]; topSlots: number[]; bottomSlots: number[] } | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < 280; attempt++) {
      const leftSlots = slotsFactory();
      const topSlots = slotsFactory();
      const rightSlots = this.findSafePermutation(targetIndices, leftSlots, "left", "right", sidePoints);
      const bottomSlots = this.findSafePermutation(targetIndices, topSlots, "top", "bottom", sidePoints);

      const scoreA = this.socketCollisionScore(rightSlots, leftSlots, "left", "right", sidePoints);
      const scoreB = this.socketCollisionScore(bottomSlots, topSlots, "top", "bottom", sidePoints);
      const mixedEnough =
        this.mismatchCount(rightSlots, leftSlots) >= 2 &&
        this.mismatchCount(bottomSlots, topSlots) >= 2;
      const totalScore = scoreA + scoreB + (mixedEnough ? 0 : 1000);

      if (totalScore < bestScore) {
        bestScore = totalScore;
        best = {
          leftSlots: [...leftSlots],
          rightSlots: [...rightSlots],
          topSlots: [...topSlots],
          bottomSlots: [...bottomSlots],
        };
      }

      if (scoreA === 0 && scoreB === 0 && mixedEnough) {
        return { leftSlots, rightSlots, topSlots, bottomSlots };
      }
    }

    return best ?? {
      leftSlots: [0, 1, 2, 3],
      rightSlots: [1, 2, 3, 0],
      topSlots: [0, 1, 2, 3],
      bottomSlots: [2, 3, 0, 1],
    };
  }

  private mismatchCount(a: number[], b: number[]): number {
    let count = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) count++;
    }
    return count;
  }

  private findSafePermutation(
    targetIndices: number[],
    sourceIndices: number[],
    sourceSide: Side,
    targetSide: Side,
    sidePoints: {
      left: { x: number; y: number }[];
      right: { x: number; y: number }[];
      top: { x: number; y: number }[];
      bottom: { x: number; y: number }[];
    }
  ): number[] {
    const base = [...targetIndices];
    let fallback = [...base];
    let fallbackScore = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < 220; attempt++) {
      const candidate = Phaser.Utils.Array.Shuffle([...base]) as number[];
      const score = this.socketCollisionScore(candidate, sourceIndices, sourceSide, targetSide, sidePoints);
      if (score < fallbackScore) {
        fallbackScore = score;
        fallback = [...candidate];
      }
      if (score === 0) return candidate;
    }

    return fallback;
  }

  private socketCollisionScore(
    candidateTargets: number[],
    sourceIndices: number[],
    sourceSide: Side,
    targetSide: Side,
    sidePoints: {
      left: { x: number; y: number }[];
      right: { x: number; y: number }[];
      top: { x: number; y: number }[];
      bottom: { x: number; y: number }[];
    }
  ): number {
    const allSockets = [
      ...sidePoints.left,
      ...sidePoints.right,
      ...sidePoints.top,
      ...sidePoints.bottom,
    ];

    let collisions = 0;
    const hitRadius = this.s(22);

    for (let i = 0; i < sourceIndices.length; i++) {
      const a = sidePoints[sourceSide][sourceIndices[i]];
      const b = sidePoints[targetSide][candidateTargets[i]];
      const curvePts = this.buildPreviewCurve(a.x, a.y, b.x, b.y, sourceSide, targetSide).getPoints(44);

      for (const s of allSockets) {
        const isEndpoint = (Math.abs(s.x - a.x) < 0.1 && Math.abs(s.y - a.y) < 0.1)
          || (Math.abs(s.x - b.x) < 0.1 && Math.abs(s.y - b.y) < 0.1);
        if (isEndpoint) continue;

        for (let p = 0; p < curvePts.length; p += 2) {
          if (Phaser.Math.Distance.Between(curvePts[p].x, curvePts[p].y, s.x, s.y) < hitRadius) {
            collisions++;
            break;
          }
        }
      }
    }

    return collisions;
  }

  private buildPreviewCurve(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    anchorSide: Side,
    targetSide: Side
  ): Phaser.Curves.CubicBezier {
    const cp = this.s(CABLE_CP1);
    const V2 = Phaser.Math.Vector2;

    const cpDir = (side: Side): { ox: number; oy: number } => {
      if (side === "left") return { ox: cp, oy: 0 };
      if (side === "right") return { ox: -cp, oy: 0 };
      if (side === "top") return { ox: 0, oy: cp };
      return { ox: 0, oy: -cp };
    };

    const d1 = cpDir(anchorSide);
    const d2 = cpDir(targetSide);

    return new Phaser.Curves.CubicBezier(
      new V2(ax, ay),
      new V2(ax + d1.ox, ay + d1.oy),
      new V2(bx + d2.ox, by + d2.oy),
      new V2(bx, by)
    );
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
      activeTarget: socketB,
    };

    this.wires.push(state);
    this.redrawCable(state);

    const clampX = (v: number) => Phaser.Math.Clamp(v,
      this.screenX - this.screenW / 2 + this.screenW * 0.04,
      this.screenX + this.screenW / 2 - this.screenW * 0.04);
    const clampY = (v: number) => Phaser.Math.Clamp(v,
      this.screenY - this.screenH / 2 + this.screenH * 0.05,
      this.screenY + this.screenH / 2 - this.screenH * 0.05);

    plug.on("dragstart", () => {
      if (!state.connected) {
        state.activeTarget = state.socketB;
        state.anchorX = state.socketA.x;
        state.anchorY = state.socketA.y;
        state.anchorSide = state.socketA.side;
        state.targetSide = state.socketB.side;
        this.drawPlugGraphic(state.plugGfx, state.color.hex, state.anchorSide, true, true);
        plug.setVisible(false);
        plug.setScale(1.06);
      }
    });

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

    const socketGrabSize = this.s(88);
    const makeGrabZone = (socket: SocketData, fromTarget: boolean) => {
      const zone = this.add.zone(socket.x, socket.y, socketGrabSize, socketGrabSize).setOrigin(0.5);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        this.beginSocketDrag(state, fromTarget, pointer);
      });
    };

    makeGrabZone(socketA, false);
    makeGrabZone(socketB, true);
  }

  private beginSocketDrag(wire: WireState, fromTarget: boolean, pointer: Phaser.Input.Pointer): void {
    const source = fromTarget ? wire.socketB : wire.socketA;
    const target = fromTarget ? wire.socketA : wire.socketB;
    if (!source.isRevealed) return;

    wire.connected = false;
    wire.activeGlow = false;
    wire.anchorX = source.x;
    wire.anchorY = source.y;
    wire.anchorSide = source.side;
    wire.targetSide = target.side;
    wire.activeTarget = target;
    wire.freeX = source.x;
    wire.freeY = source.y;
    wire.plug.setPosition(wire.freeX, wire.freeY);
    wire.plug.setVisible(false);
    wire.plug.setScale(1.06);
    this.drawPlugGraphic(wire.plugGfx, wire.color.hex, source.side, true, true);
    this.redrawCable(wire);

    this.draggingWire = wire;
    this.draggingPointerId = pointer.id;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingWire) return;
    if (this.draggingPointerId != null && pointer.id !== this.draggingPointerId) return;

    this.draggingWire.freeX = Phaser.Math.Clamp(
      pointer.worldX,
      this.screenX - this.screenW / 2 + this.screenW * 0.04,
      this.screenX + this.screenW / 2 - this.screenW * 0.04
    );
    this.draggingWire.freeY = Phaser.Math.Clamp(
      pointer.worldY,
      this.screenY - this.screenH / 2 + this.screenH * 0.05,
      this.screenY + this.screenH / 2 - this.screenH * 0.05
    );
    this.draggingWire.plug.setPosition(this.draggingWire.freeX, this.draggingWire.freeY);
    this.redrawCable(this.draggingWire);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingWire) return;
    if (this.draggingPointerId != null && pointer.id !== this.draggingPointerId) return;

    const wire = this.draggingWire;
    wire.plug.setScale(1);
    this.tryConnect(wire);
    this.draggingWire = undefined;
    this.draggingPointerId = undefined;
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
    isLit: boolean,
    showArm = false
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

    if (showArm) {
      const { axis, dir } = this.armConfig(side);
      this.drawArm(g, c, this.s(30), axis, dir);
    }
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
    const cpStart = this.s(CABLE_CP1);
    const cpEnd = this.s(CABLE_CP2);
    const V2 = Phaser.Math.Vector2;

    const cpDir = (side: Side): { ox: number; oy: number } => {
      if (side === "left")   return { ox:  cpStart, oy: 0       };
      if (side === "right")  return { ox: -cpStart, oy: 0       };
      if (side === "top")    return { ox: 0,        oy:  cpStart };
      /* bottom */           return { ox: 0,        oy: -cpStart };
    };

    const d1 = cpDir(wire.anchorSide);
    // When free end is dragging, use a neutral outward direction based on target side
    const d2 = wire.connected ? cpDir(wire.targetSide) : { ox: 0, oy: 0 };
    if (wire.connected) {
      if (d2.ox !== 0) d2.ox = Math.sign(d2.ox) * cpEnd;
      if (d2.oy !== 0) d2.oy = Math.sign(d2.oy) * cpEnd;
    }

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
  const target = wire.activeTarget;
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

    SfxManager.start(this, "wire-connection", {
      volume: GameData.sfxVolume ?? 0.7,
    });

    this.checkWin();
  } else {
    this.showAlert("ERROR: WRONG CONNECTION", 300);
    this.cameras.main.shake(120, 0.004);
    SfxManager.start(this, "error-2", {
      volume: GameData.sfxVolume ?? 0.7,
    });

    this.vibrateWrongWire(wire, () => {
      this.returnWire(wire);
    });
  }
}

  private returnWire(wire: WireState) {
    const fromX = wire.plug.x ?? wire.anchorX;
    const fromY = wire.plug.y ?? wire.anchorY;

    this.tweens.addCounter({
      from: 0, to: 1, duration: 220,
      onUpdate: tween => {
        const t = tween.getValue() ?? 0;
        wire.freeX = Phaser.Math.Linear(fromX, wire.anchorX, t);
        wire.freeY = Phaser.Math.Linear(fromY, wire.anchorY, t);
        wire.plug.setPosition(wire.freeX, wire.freeY);
        this.redrawCable(wire);
      },
      onComplete: () => {
        wire.freeX = wire.anchorX;
        wire.freeY = wire.anchorY;
        wire.plug.setPosition(wire.anchorX, wire.anchorY);
        wire.plug.setVisible(true);
        this.drawPlugGraphic(wire.plugGfx, wire.color.hex, wire.anchorSide, true, false);
        this.redrawCable(wire);
      },
    });
  }

  private checkWin() {
  if (!this.wires.every(w => w.connected)) return;

  this.registry.set("task1Completed", true);
  SfxManager.start(this, "loading-complete", {
    volume: GameData.sfxVolume ?? 0.7,
  });

  // blocca input
  this.input.enabled = false;
  this.draggingWire = undefined;
  this.draggingPointerId = undefined;

  // schermo nero SOLO nella parte interna del monitor
  const blackScreen = this.add.graphics();
blackScreen.fillStyle(0x000000, 1);

const w = this.screenW + this.s(12);
const h = this.screenH + this.s(16);
const r = this.s(6); // angoli leggermente arrotondati

blackScreen.fillRoundedRect(
  this.screenX + this.s(0.2) - w / 2,
  this.screenY + this.s(3.9) - h / 2,
  w,
  h,
  r
);

blackScreen.setDepth(1000);
blackScreen.setAlpha(0);

  // immagine ACCESS GRANTED centrata nello schermo del monitor
  const accessImage = this.add
    .image(this.screenX, this.screenY, this.accessGrantedKey)
    .setOrigin(0.5)
    .setDepth(1001)
    .setAlpha(0);

  // scala immagine per farla stare bene dentro lo schermo
  const maxW = this.screenW * 0.72;
  const maxH = this.screenH * 0.28;
  const scale = Math.min(
    maxW / accessImage.width,
    maxH / accessImage.height
  );

  accessImage.setScale(scale * 0.92);

  this.tweens.add({
    targets: blackScreen,
    alpha: 1,
    duration: 220,
    ease: "Power2.Out"
  });

  this.tweens.add({
    targets: accessImage,
    alpha: 1,
    duration: 260,
    delay: 120,
    ease: "Power2.Out"
  });

  this.tweens.add({
    targets: accessImage,
    scaleX: scale,
    scaleY: scale,
    duration: 240,
    delay: 120,
    ease: "Back.Out"
  });

  this.time.delayedCall(2000, () => {
    this.scene.stop();
    this.scene.resume("GamePlay");
  });
}

  // ─── Alert ──────────────────────────────────────────────────────────────────

  private showAlert(message: string, hold = 350) {
  if (!this.alertText) return;

  this.tweens.killTweensOf(this.alertText);

  this.alertText.setText(message);
  this.alertText.setScale(0.92);
  this.alertText.setAlpha(0);

  this.tweens.add({
    targets: this.alertText,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    duration: 140,
    ease: "Power2.Out",
    yoyo: false,
    onComplete: () => {
      this.tweens.add({
        targets: this.alertText,
        alpha: 0,
        duration: 320,
        delay: hold,
        ease: "Sine.In"
      });
    }
  });
}
  // ─── Tablet drawing ─────────────────────────────────────────────────────────

  private drawTablet() {
  this.add
    .image(this.boardX, this.boardY, this.externalBoxKey)
    .setDisplaySize(this.boardW, this.boardH)
    .setDepth(0);
}
}
