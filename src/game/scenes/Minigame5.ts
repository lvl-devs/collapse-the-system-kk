import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";
import LevelStorage from "../systems/LevelStorage";

type BagKind = "normal" | "suspect" | "bomb";

type BagConfig = {
  baseTexture: string;
  xrayTexture: string;
  kind: BagKind;
};

type BagState = {
  sprite: Phaser.GameObjects.Image;
  kind: BagKind;
  baseTexture: string;
  xrayTexture: string;
  judged: boolean;
  speed: number;
};

export default class Minigame5 extends Phaser.Scene {
  private readonly uiFontFamily = "Pixelify Sans";
  private readonly conveyorBeltY = 558;
  private readonly bagSpeed = 175;
  private readonly bagDisplayHeight = 230;
  private readonly bagOriginY = 0.82;
  private readonly xrayPreviewWidth = 220;
  private readonly xrayPreviewHeight = this.bagDisplayHeight;
  private readonly xrayCropX = 110;
  private readonly xrayCropY = 220;
  private readonly xrayCropWidth = 800;
  private readonly xrayCropHeight = 682;
  private readonly xrayOffsetX = 150;
  private readonly xrayOffsetY = -40;
  private readonly xrayExitOffsetX = 200;
  private readonly conveyorTileOffsetY = 262;
  private readonly conveyorScaleY = 10;
  private readonly conveyorVisualOffsetY = -35;
  private readonly conveyorCropInsetLeft = -120;
  private readonly conveyorCropInsetRight = -150;
  private readonly conveyorCropHeight = 163;
  private readonly conveyorScrollSpeed = -140;
  private readonly gameplayOffsetY = 150;
  private readonly hudTextOffsetY = -120;
  private readonly resultTextOffsetY = -150;
  private readonly buttonsHalfGap = 60;
  private readonly buttonsCenterOffsetX = 125;
  private readonly buttonsOffsetYFromScanner = 125;

  private scannerX = 10;
  private scannerY = -40;
  private bagTrackY = 0;
  private decisionStopX = 0;
  private xrayEntryX = -4;

  private queue: BagConfig[] = [];
  private bags: BagState[] = [];
  private activeBag?: BagState;
  private isEnded = false;
  private waitingForNextBag = false;
  private conveyorIsMoving = false;

  private conveyorBelt?: Phaser.GameObjects.TileSprite;
  private xrayPreview?: Phaser.GameObjects.Image;
  private movementSfx?: Phaser.Sound.BaseSound;
  private statusText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;
  private stopButton?: Phaser.GameObjects.Image;
  private passButton?: Phaser.GameObjects.Image;
  private xrayTween?: Phaser.Tweens.Tween;
  private xrayReadyForDecision = false;
  private failTitleText?: Phaser.GameObjects.Text;
  private failReasonText?: Phaser.GameObjects.Text;
  private successTitleText?: Phaser.GameObjects.Text;
  private successReasonText?: Phaser.GameObjects.Text;

  private exitMinigame(): void {
  this.stopMovementSfx();
  this.scene.stop();
  this.scene.resume("GamePlay");
}

  constructor() {
    super("Minigame5");
  }

  private offsetY(y: number): number {
    return y + this.gameplayOffsetY;
  }

  preload(): void {
    this.load.image("mg5-scanner-background", "images/minigame-5/scanner-background.png");
    this.load.image("mg5-conveyor-belt", "images/minigame-5/roller-conveyor.png");
    this.load.image("mg5-scanner", "images/minigame-5/scanner.png");
    this.load.image("mg5-scanner-glass", "images/minigame-5/scanner-top-part-with-glass.png");
    this.load.image("mg5-btn-pass", "images/minigame-5/scanner-start.png");
    this.load.image("mg5-btn-pass-pressed", "images/minigame-5/scanner-start-pressed.png");
    this.load.image("mg5-btn-stop", "images/minigame-5/scanner-stop.png");
    this.load.image("mg5-btn-stop-pressed", "images/minigame-5/scanner-stop-pressed.png");

    this.load.image("mg5-bag-1", "images/minigame-5/suitcase-1.png");
    this.load.image("mg5-bag-2", "images/minigame-5/suitcase-2.png");
    this.load.image("mg5-bag-3", "images/minigame-5/suitcase-3.png");
    this.load.image("mg5-bag-4", "images/minigame-5/suitcase-4.png");
    this.load.image("mg5-bag-sus-1", "images/minigame-5/suitcase-sus-1.png");
    this.load.image("mg5-bag-sus-2", "images/minigame-5/suitcase-sus-2.png");
    this.load.image("mg5-bag-sus-3", "images/minigame-5/suitcase-sus-3.png");
    this.load.image("mg5-bag-blue", "images/minigame-5/suitcase-blue.png");
    this.load.image("mg5-bag-brown", "images/minigame-5/suitcase-brown.png");
    this.load.image("mg5-bag-green", "images/minigame-5/suitcase-green.png");
    this.load.image("mg5-bag-purple", "images/minigame-5/suitcase-purple.png");
    this.load.image("mg5-bag-red", "images/minigame-5/suitcase-red.png");
    this.load.image("mg5-bag-bomb", "images/minigame-5/suitcase-bomb.png");
    this.load.audio("mg5-conveyor-move-sfx", "sounds/minigame-5/conveyor-belt.mp3");
    if (!this.cache.audio.exists("phrase-correct")) {
      this.load.audio("phrase-correct", "sounds/minigame-4/phrase-correct.mp3");
    }
    if (!this.cache.audio.exists("error-1")) {
      this.load.audio("error-1", "sounds/minigame-3/error-1.mp3");
    }
    if (!this.cache.audio.exists("loading-complete")) {
      this.load.audio("loading-complete", "sounds/loading-complete.mp3");
    }
  }


  
  create(): void {
    this.resetRoundState();

    const { width, height } = this.scale;

    this.input.keyboard?.on("keydown-ESC", () => {
  this.exitMinigame();
});

    // ─── Exit X ─────────────────────────────────────
const exitX = this.add
  .text(width - 25, 25, "X", {
    fontFamily: "Pixelify Sans", 
    fontSize: "42px",
    color: "#ffffff",
    fontStyle: "bold",
  })
  .setOrigin(1, 0)
  .setDepth(100)
  .setInteractive({ useHandCursor: true });

exitX.on("pointerdown", () => {
  this.stopMovementSfx();
  this.scene.stop();
  this.scene.resume("GamePlay");
});

exitX.on("pointerover", () => exitX.setScale(1.15));
exitX.on("pointerout", () => exitX.setScale(1));

    this.scannerX = Math.round(width * 0.5);
    // Keep scanner centered, while placing the moving belt in the lower tunnel slot.
    this.scannerY = this.offsetY(this.conveyorBeltY - 116);
    this.bagTrackY = this.offsetY(this.conveyorBeltY + this.conveyorVisualOffsetY + 12);
    this.decisionStopX = this.scannerX + this.xrayOffsetX;
    this.xrayEntryX = this.decisionStopX - Math.round(this.xrayPreviewWidth * 1.05);

    const scannerBackground = this.add
      .image(width / 2, height / 2, "mg5-scanner-background")
      .setDepth(0);
    const bgScale = Math.max(width / scannerBackground.width, height / scannerBackground.height);
    scannerBackground.setScale(bgScale);

    this.add.rectangle(width / 2, height / 2, width, height, 0x030507, 0.2).setDepth(0.2);
    const conveyorHeight = this.conveyorCropHeight;
    const conveyorY = this.offsetY(this.conveyorBeltY + this.conveyorVisualOffsetY);
    const conveyorClipWidth = Math.max(
      1,
      width - this.conveyorCropInsetLeft - this.conveyorCropInsetRight
    );
    const conveyorX = this.conveyorCropInsetLeft + conveyorClipWidth / 2;
    this.conveyorBelt = this.add
      .tileSprite(conveyorX, conveyorY, conveyorClipWidth, conveyorHeight, "mg5-conveyor-belt")
      .setDepth(1);
    this.conveyorBelt.setTileScale(1, this.conveyorScaleY);
    this.conveyorBelt.setTilePosition(0, this.conveyorTileOffsetY);
    this.conveyorIsMoving = true;

    // Keep scanner body over conveyor and bags; X-ray preview is rendered in window area.
    const scannerBody = this.add.image(this.scannerX, this.scannerY, "mg5-scanner").setDepth(4);
    const scannerZoom = Math.max(1.04, (width + 260) / scannerBody.width);
    scannerBody.setScale(scannerZoom);
    this.add
      .image(this.scannerX, this.scannerY - 2, "mg5-scanner-glass")
      .setDepth(7)
      .setScale(scannerZoom);

    this.statusText = this.add
      .text(width / 2, this.offsetY(70 + this.hudTextOffsetY), "Scan bags. STOP 'sus' bags. PASS numbered + bomb.", {
        fontFamily: this.uiFontFamily,
        fontSize: "40px",
        color: "#fff",
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(width / 2, this.offsetY(108 + this.hudTextOffsetY), "S = STOP | F = PASS", {
        fontFamily: this.uiFontFamily,
        fontSize: "26px",
        color: "#2e2e2e",
      })
      .setOrigin(0.5);

    this.createButtons(width, height);
    this.createQueue();
    this.initMovementSfx();
    this.setMovementSfxActive(this.conveyorIsMoving);
    this.scheduleNextBag(250);

    this.input.keyboard?.on("keydown-S", () => this.decide("stop"));
    this.input.keyboard?.on("keydown-F", () => this.decide("pass"));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-S");
      this.input.keyboard?.off("keydown-F");
      this.stopMovementSfx();
    });
  }

  private resetRoundState(): void {
    this.queue = [];
    this.bags = [];
    this.activeBag = undefined;
    this.isEnded = false;
    this.waitingForNextBag = false;
    this.conveyorIsMoving = false;

    this.xrayTween?.stop();
    this.xrayTween = undefined;
    this.xrayReadyForDecision = false;

    this.conveyorBelt = undefined;
    this.xrayPreview = undefined;
    this.statusText = undefined;
    this.hintText = undefined;
    this.stopButton = undefined;
    this.passButton = undefined;
    this.failTitleText = undefined;
    this.failReasonText = undefined;
    this.successTitleText = undefined;
    this.successReasonText = undefined;

    this.stopMovementSfx();
  }

  update(_: number, delta: number): void {
    if (this.isEnded) return;
    const dt = delta / 1000;
    const xrayInMotion = !!this.xrayTween && this.xrayTween.isPlaying();
    this.setMovementSfxActive(this.conveyorIsMoving || xrayInMotion);

    if (this.conveyorBelt && (this.conveyorIsMoving || xrayInMotion)) {
      this.conveyorBelt.tilePositionX = Math.round(
        this.conveyorBelt.tilePositionX + this.conveyorScrollSpeed * dt
      );
    }

    if (this.activeBag) {
      this.cleanupOffscreenBags();
      return;
    }

    for (const bag of this.bags) {
      bag.sprite.x += bag.speed * dt;

      if (!bag.judged && bag.sprite.x >= this.xrayEntryX) {
        this.activeBag = bag;
        bag.sprite.x = this.xrayEntryX;
        bag.speed = 0;
        this.pauseForDecision();
        bag.sprite.setVisible(false);
        this.enterXrayView(bag);
        break;
      }
    }

    this.cleanupOffscreenBags();
  }

  private cleanupOffscreenBags(): void {
    let removed = false;
    let bombReachedEnd = false;
    this.bags = this.bags.filter((b) => {
      if (!b.sprite.active) return false;
      if (b.sprite.x > this.scale.width + 120) {
        if (this.isBombXrayTexture(b.xrayTexture) && b.judged) bombReachedEnd = true;
        b.sprite.destroy();
        removed = true;
        return false;
      }
      return true;
    });

    if (bombReachedEnd && !this.isEnded) {
      this.winMinigame();
      return;
    }

    if (removed && this.bags.length === 0 && !this.activeBag && !this.isEnded) {
      this.setMovementSfxActive(false);
      this.scheduleNextBag(220);
    }
  }

  private createButtons(_width: number, _height: number): void {
    const centerX = this.scannerX + this.buttonsCenterOffsetX;
    const by = this.scannerY + this.buttonsOffsetYFromScanner;

    this.stopButton = this.add
      .image(centerX - this.buttonsHalfGap, by, "mg5-btn-stop")
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.passButton = this.add
      .image(centerX + this.buttonsHalfGap, by, "mg5-btn-pass")
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.stopButton.on("pointerdown", () => {
      this.stopButton?.setTexture("mg5-btn-stop-pressed");
      this.decide("stop");
    });
    this.stopButton.on("pointerup", () => this.stopButton?.setTexture("mg5-btn-stop"));
    this.stopButton.on("pointerout", () => this.stopButton?.setTexture("mg5-btn-stop"));

    this.passButton.on("pointerdown", () => {
      this.passButton?.setTexture("mg5-btn-pass-pressed");
      this.decide("pass");
    });
    this.passButton.on("pointerup", () => this.passButton?.setTexture("mg5-btn-pass"));
    this.passButton.on("pointerout", () => this.passButton?.setTexture("mg5-btn-pass"));
  }

  private createQueue(): void {
    const normalColors = ["mg5-bag-blue", "mg5-bag-brown", "mg5-bag-green", "mg5-bag-purple", "mg5-bag-red"];
    const xrayNumberedNormal = ["mg5-bag-1", "mg5-bag-2", "mg5-bag-3", "mg5-bag-4"];
    const xrayNumberedSus = ["mg5-bag-sus-1", "mg5-bag-sus-2", "mg5-bag-sus-3"];

    const total = 6;
    const nonBombTotal = total - 1;
    const q: BagConfig[] = [];
    const nonBombPool: Array<{ kind: BagKind; xrayTexture: string }> = [
      ...xrayNumberedNormal.map((xrayTexture) => ({ kind: "normal" as const, xrayTexture })),
      ...xrayNumberedSus.map((xrayTexture) => ({ kind: "suspect" as const, xrayTexture })),
    ];
    Phaser.Utils.Array.Shuffle(nonBombPool);
    const pickedNonBomb = nonBombPool.slice(0, nonBombTotal);

    for (const item of pickedNonBomb) {
      q.push({
        kind: item.kind,
        baseTexture: Phaser.Utils.Array.GetRandom(normalColors),
        xrayTexture: item.xrayTexture,
      });
    }

    q.push({
      kind: "bomb",
      baseTexture: Phaser.Utils.Array.GetRandom(normalColors),
      xrayTexture: "mg5-bag-bomb",
    });

    Phaser.Utils.Array.Shuffle(q);
    this.queue = q;
  }

  private spawnBag(): void {
    if (this.isEnded) return;
    if (this.activeBag) return;
    if (this.bags.length > 0) return;
    if (this.queue.length === 0) {
      return;
    }

    const cfg = this.queue.shift()!;
    const sprite = this.add
      .image(-180, this.bagTrackY, cfg.baseTexture)
      .setDepth(5)
      .setOrigin(0.5, this.bagOriginY);
    this.fitBagToBelt(sprite);
    this.bags.push({
      sprite,
      kind: cfg.kind,
      baseTexture: cfg.baseTexture,
      xrayTexture: cfg.xrayTexture,
      judged: false,
      speed: this.bagSpeed,
    });
    this.setMovementSfxActive(true);
  }

  private scheduleNextBag(delayMs = 180): void {
    if (this.isEnded || this.waitingForNextBag || this.activeBag || this.bags.length > 0) return;
    if (this.queue.length === 0) return;

    this.waitingForNextBag = true;
    this.time.delayedCall(delayMs, () => {
      this.waitingForNextBag = false;
      this.spawnBag();
    });
  }

  private showDecisionPrompt(): void {
    if (!this.activeBag || !this.statusText || !this.hintText) return;
    this.statusText.setText("Decision required: STOP or PASS?");
    this.hintText.setText("STOP sus | PASS numbered + bomb");
  }

  private decide(action: "stop" | "pass"): void {
    if (this.isEnded || !this.activeBag || !this.xrayReadyForDecision) return;

    const bag = this.activeBag;
    this.xrayReadyForDecision = false;
    const isBomb = this.isBombXrayTexture(bag.xrayTexture);
    const isSuspect = this.isSusXrayTexture(bag.xrayTexture);
    const isNormal = !isBomb && !isSuspect;

    const isCorrect =
      // Bomb must pass.
      (isBomb && action === "pass") ||
      // Suspicious bags must be stopped.
      (isSuspect && action === "stop") ||
      // Numbered normal bags must pass.
      (isNormal && action === "pass");

    if (!isCorrect) {
      const failReason = isBomb
        ? "You stopped the bomb bag. Mission failed."
        : isSuspect
          ? "Suspicious bag passed through. Mission failed."
          : "Normal bag was stopped. Mission failed.";
      this.failMinigame(failReason);
      return;
    }

    SfxManager.start(this, "phrase-correct", {
      volume: GameData.sfxVolume ?? 0.7,
    });

    if (action === "stop") {
      this.xrayTween?.stop();
      if (!this.xrayPreview) {
        this.removeXrayLook(bag);
        bag.sprite.destroy();
        this.bags = this.bags.filter((b) => b !== bag);
        this.activeBag = undefined;
        this.resumeAfterDecision();
        if (this.statusText) this.statusText.setText("Good call. Keep scanning...");
        if (this.hintText) this.hintText.setText("S = STOP | F = PASS");
        this.scheduleNextBag(180);
        return;
      }

      this.xrayTween = this.tweens.add({
        targets: this.xrayPreview,
        y: this.xrayPreview.y - 24,
        alpha: 0,
        duration: 220,
        ease: "Linear",
        onComplete: () => {
          this.removeXrayLook(bag);
          bag.sprite.destroy();
          this.bags = this.bags.filter((b) => b !== bag);
          this.activeBag = undefined;
          this.resumeAfterDecision();
          if (this.statusText) this.statusText.setText("Good call. Keep scanning...");
          if (this.hintText) this.hintText.setText("S = STOP | F = PASS");
          this.scheduleNextBag(180);
        },
      });
      return;
    }

    this.exitXrayView(bag, () => {
      this.removeXrayLook(bag);
      bag.sprite.setVisible(true);
      bag.judged = true;
      this.activeBag = undefined;

      bag.sprite.x = this.decisionStopX + this.xrayExitOffsetX;
      bag.speed = this.bagSpeed;

      this.resumeAfterDecision();
      if (this.statusText) this.statusText.setText("Good call. Keep scanning...");
      if (this.hintText) this.hintText.setText("S = STOP | F = PASS");
    });
  }

  private failMinigame(msg: string): void {
    if (this.isEnded) return;
    this.isEnded = true;
    this.conveyorIsMoving = false;
    this.xrayReadyForDecision = false;
    this.xrayTween?.stop();
    this.xrayTween = undefined;
    this.setMovementSfxActive(false);

    if (this.xrayPreview) {
      this.xrayPreview.setVisible(false).clearTint().setAlpha(1);
    }

    if (this.activeBag?.sprite.active) {
      this.activeBag.sprite.destroy();
    }
    this.activeBag = undefined;

    for (const bag of this.bags) {
      if (bag.sprite.active) bag.sprite.destroy();
    }
    this.bags = [];

    this.stopButton?.disableInteractive();
    this.passButton?.disableInteractive();

    SfxManager.start(this, "error-1", {
      volume: GameData.sfxVolume ?? 0.7,
    });

    this.showFailureScreen(msg);
  }

  private showFailureScreen(reason: string): void {
    const { width, height } = this.scale;

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x05070b, 0.9)
      .setDepth(20);

    this.failTitleText = this.add
      .text(width / 2, this.offsetY(height / 2 - 42 + this.resultTextOffsetY), "MISSION FAILED", {
        fontFamily: this.uiFontFamily,
        fontSize: "56px",
        color: "#ff4d6d",
        fontStyle: "bold",
        stroke: "#14060b",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.failReasonText = this.add
      .text(width / 2, this.offsetY(height / 2 + 26 + this.resultTextOffsetY), reason, {
        fontFamily: this.uiFontFamily,
        fontSize: "28px",
        color: "#ffd6de",
        align: "center",
        wordWrap: { width: Math.min(width * 0.8, 980), useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.tweens.add({
      targets: [this.failTitleText, this.failReasonText],
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: 2,
    });

    this.time.delayedCall(2200, () => {
      this.scene.restart();
    });
  }

  private winMinigame(): void {
    this.isEnded = true;
    this.conveyorIsMoving = false;
    this.xrayReadyForDecision = false;
    this.xrayTween?.stop();
    this.xrayTween = undefined;
    this.setMovementSfxActive(false);
    this.bags.forEach((b) => (b.speed = 0));
    this.stopButton?.disableInteractive();
    this.passButton?.disableInteractive();

    if (this.xrayPreview) {
      this.xrayPreview.setVisible(false).clearTint().setAlpha(1);
    }

    SfxManager.start(this, "loading-complete", {
      volume: GameData.sfxVolume ?? 0.7,
    });
    LevelStorage.advanceLevel();

    this.showSuccessScreen();
  }

  private showSuccessScreen(): void {
    const { width, height } = this.scale;

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x05070b, 0.88)
      .setDepth(20);

    this.successTitleText = this.add
      .text(width / 2, this.offsetY(height / 2 - 42 + this.resultTextOffsetY), "MISSION SUCCESSFUL", {
        fontFamily: this.uiFontFamily,
        fontSize: "56px",
        color: "#46ff88",
        fontStyle: "bold",
        stroke: "#09100c",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.successReasonText = this.add
      .text(width / 2, this.offsetY(height / 2 + 24 + this.resultTextOffsetY), "Bomb bag passed.", {
        fontFamily: this.uiFontFamily,
        fontSize: "28px",
        color: "#b9ffe2",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(21);

    this.tweens.add({
      targets: [this.successTitleText, this.successReasonText],
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: 2,
    });

    this.time.delayedCall(2200, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }

  private isSusXrayTexture(xrayTexture: string): boolean {
    return xrayTexture.includes("sus");
  }

  private isBombXrayTexture(xrayTexture: string): boolean {
    return xrayTexture.includes("bomb");
  }

  private pauseForDecision(): void {
    this.xrayReadyForDecision = false;
    for (const bag of this.bags) {
      bag.speed = 0;
    }
  }

  private resumeAfterDecision(): void {
    if (this.isEnded) return;

    this.conveyorIsMoving = true;
    this.setMovementSfxActive(true);

    for (const bag of this.bags) {
      if (!bag.sprite.active) continue;
      if (bag.judged) continue;
      bag.speed = this.bagSpeed;
    }
  }

  private applyXrayLook(bag: BagState): void {
    if (!this.xrayPreview) {
      this.xrayPreview = this.add
        .image(
          this.scannerX + this.xrayOffsetX,
          this.scannerY + this.xrayOffsetY,
          bag.xrayTexture
        )
        .setDepth(6)
        .setOrigin(0.5, 0.5);
    } else {
      this.xrayPreview.setTexture(bag.xrayTexture).setVisible(true);
    }

    this.xrayPreview
      .setPosition(
        Math.round(this.scannerX + this.xrayOffsetX),
        Math.round(this.scannerY + this.xrayOffsetY)
      )
      .setCrop(
        this.xrayCropX,
        this.xrayCropY,
        this.xrayCropWidth,
        this.xrayCropHeight
      )
      .setDisplaySize(this.xrayPreviewWidth, this.xrayPreviewHeight)
      .setAlpha(0.95)
      .setTint(0x9af4ff);
  }

  private enterXrayView(bag: BagState): void {
    this.applyXrayLook(bag);
    const targetX = Math.round(this.scannerX + this.xrayOffsetX);
    const targetY = Math.round(this.scannerY + this.xrayOffsetY);
    this.xrayPreview?.setPosition(this.xrayEntryX, targetY);
    const enterDistance = Math.abs(targetX - this.xrayEntryX);
    const enterDuration = Math.max(1, Math.round((enterDistance / this.bagSpeed) * 1000));
    this.xrayTween?.stop();
    this.xrayTween = this.tweens.add({
      targets: this.xrayPreview,
      x: targetX,
      duration: enterDuration,
      ease: "Linear",
      onComplete: () => {
        this.conveyorIsMoving = false;
        this.xrayReadyForDecision = true;
        this.showDecisionPrompt();
      },
    });
  }

  private exitXrayView(bag: BagState, onComplete: () => void): void {
    if (!this.xrayPreview) {
      onComplete();
      return;
    }

    const exitTargetX = this.decisionStopX + this.xrayExitOffsetX;
    const currentX = this.xrayPreview.x;
    const exitDistance = Math.abs(exitTargetX - currentX);
    const exitDuration = Math.max(1, Math.round((exitDistance / this.bagSpeed) * 1000));
    this.xrayTween?.stop();
    this.xrayTween = this.tweens.add({
      targets: this.xrayPreview,
      x: exitTargetX,
      duration: exitDuration,
      ease: "Linear",
      onComplete: () => {
        bag.sprite.x = exitTargetX;
        onComplete();
      },
    });
  }

  private removeXrayLook(bag: BagState): void {
    this.xrayTween?.stop();
    this.xrayTween = undefined;
    if (this.xrayPreview) {
      this.xrayPreview.setVisible(false).clearTint().setAlpha(1);
    }
    bag.sprite.setTexture(bag.baseTexture);
    this.fitBagToBelt(bag.sprite);
    bag.sprite.setAlpha(1);
  }

  private fitBagToBelt(sprite: Phaser.GameObjects.Image): void {
    const safeHeight = Math.max(1, sprite.height);
    const scale = this.bagDisplayHeight / safeHeight;
    sprite.setScale(scale).setOrigin(0.5, this.bagOriginY);
  }

  private initMovementSfx(): void {
    if (!this.cache.audio.exists("mg5-conveyor-move-sfx")) {
      return;
    }

    this.movementSfx = this.sound.get("mg5-conveyor-move-sfx") ?? this.sound.add("mg5-conveyor-move-sfx", {
      loop: true,
      volume: 2.5 * (GameData.sfxVolume ?? 0.7),
    });
  }

  private setMovementSfxActive(active: boolean): void {
    const sfx = this.movementSfx;
    if (!sfx) return;

    if (active) {
      if (this.sound.locked) return;
      if ((sfx as any).isPaused) {
        sfx.resume();
      } else if (!sfx.isPlaying) {
        sfx.play();
      }
      return;
    }

    if (sfx.isPlaying && !(sfx as any).isPaused) sfx.pause();
  }

  private stopMovementSfx(): void {
    const sfx = this.movementSfx;
    if (!sfx) return;
    if (sfx.isPlaying) sfx.stop();
    this.movementSfx = undefined;
  }

}
