import Phaser from "phaser";

type FrequencyData = {
  value: number;
  text: string;
};

export default class Minigame9 extends Phaser.Scene {
  // ─── Bomba ─────────────────────────────────────────────
  private bombCase?: Phaser.GameObjects.Image;
  private bombFreqText?: Phaser.GameObjects.Text;
  private timerBarBg?: Phaser.GameObjects.Rectangle;
  private timerBarFill?: Phaser.GameObjects.Rectangle;

  private bombScreenX = 0;
  private bombScreenY = 0;
  private bombScreenW = 0;
  private bombScreenH = 0;

  private currentBombFrequency!: FrequencyData;
  private frequencyTimer?: Phaser.Time.TimerEvent;

  // ─── Telecomando ───────────────────────────────────────
  private remote?: Phaser.GameObjects.Image;
  private remoteFreqText?: Phaser.GameObjects.Text;

  private remoteScreenX = 0;
  private remoteScreenY = 0;
  private remoteScreenW = 0;
  private remoteScreenH = 0;

  private remoteDecimal = 120; // 252.120 MHz iniziale

  // overlay glow/pulsanti premuti
  private upPressedFx?: Phaser.GameObjects.Image;
  private downPressedFx?: Phaser.GameObjects.Image;
  private enterPressedFx?: Phaser.GameObjects.Image;

  // ─── Cerchietti progresso ──────────────────────────────
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private successCount = 0;
  private readonly TARGET_SUCCESSES = 5;

  // ─── UI / Stato ────────────────────────────────────────
  private infoText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;
  private gameEnded = false;
  private isLocked = false;

  private readonly CHANGE_INTERVAL = 10000;
  private readonly MIN_DECIMAL = 80;
  private readonly MAX_DECIMAL = 182;

  private dotW = 0;
private dotH = 0;

  constructor() {
    super("Minigame9");
  }

  preload() {
    this.load.image("valigia bombaaa 1", "../assets/images/min8/bomb_case.png");
    this.load.image("TELECOMAND 1", "../assets/images/min8/TELECOMAND 1.png");
    this.load.image("UP_PRESSED 1", "../assets/images/min8/UP_PRESSED 1.png");
    this.load.image("DOWN_PRESSED 1", "../assets/images/min8/DOWN_PRESSED 1.png");
    this.load.image("ENTER_PRESSED 1", "../assets/images/min8/ENTER_PRESSED 1.png");
  }

  create() {
    const { width, height } = this.scale;
    this.createExitButton();

    // ───────────────── B O M B A ─────────────────
    this.bombCase = this.add.image(width * 0.34, height * 0.52, "valigia bombaaa 1");

    {
      const scaleX = (width * 0.49) / this.bombCase.width;
      const scaleY = (height * 0.72) / this.bombCase.height;
      const scale = Math.min(scaleX, scaleY);
      this.bombCase.setScale(scale);
    }

    const bombW = this.bombCase.displayWidth;
    const bombH = this.bombCase.displayHeight;
    const bombX = this.bombCase.x;
    const bombY = this.bombCase.y;

    this.bombScreenX = bombX;
    this.bombScreenY = bombY - bombH * 0.26;
    this.bombScreenW = bombW * 0.22;
    this.bombScreenH = bombH * 0.12;

    this.bombFreqText = this.add
      .text(this.bombScreenX, this.bombScreenY, "", {
        fontFamily: "DigitalDisco",
        fontSize: `${Math.max(18, Math.floor(this.bombScreenH * 0.44))}px`,
        color: "#ff2a2a",
      })
      .setOrigin(0.5);

    const barW = this.bombScreenW * 0.9;
    const barH = Math.max(8, this.bombScreenH * 0.14);
    const barX = this.bombScreenX;
    const barY = this.bombScreenY + this.bombScreenH * 0.58;

    this.timerBarBg = this.add
      .rectangle(barX, barY, barW, barH, 0x2a0000, 1)
      .setOrigin(0.5);

    this.timerBarFill = this.add
      .rectangle(barX - barW / 2, barY, barW, barH, 0xff2a2a, 1)
      .setOrigin(0, 0.5);

    // ──────────────── T E L E C O M A N D O ────────────────
    this.remote = this.add.image(width * 0.77, height * 0.37, "TELECOMAND 1");

    {
      const scaleX = (width * 0.5) / this.remote.width;
      const scaleY = (height * 1.07) / this.remote.height;
      const scale = Math.min(scaleX, scaleY);
      this.remote.setScale(scale);
    }

    const remoteW = this.remote.displayWidth;
    const remoteH = this.remote.displayHeight;
    const remoteX = this.remote.x;
    const remoteY = this.remote.y;

    this.remoteScreenX = remoteX;
    this.remoteScreenY = remoteY - remoteH * 0.06;
    this.remoteScreenW = remoteW * 0.63;
    this.remoteScreenH = remoteH * 0.16;

    this.remoteFreqText = this.add
      .text(this.remoteScreenX, this.remoteScreenY, this.formatFrequency(this.remoteDecimal), {
        fontFamily: "DigitalDisco",
        fontSize: `${Math.max(16, Math.floor(this.remoteScreenH * 0.29))}px`,
        color: "#13172A",
      })
      .setOrigin(0.5);

    this.createRemoteEffects(remoteX, remoteY, remoteW, remoteH);
    this.createProgressDots(remoteX, remoteY, remoteW, remoteH);

    // ────────────────── Testi UI ──────────────────
    this.infoText = this.add
      .text(width / 2, height - 34, "UP / DOWN = CHANGE  |  ENTER or SPACE = CONFIRM", {
        fontFamily: "Pixelify Sans",
        fontSize: "18px",
        color: "#bfbfbf",
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(width / 2, 40, "", {
        fontFamily: "DigitalDisco",
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.changeBombFrequency();
    this.resetTimerBar();

    this.frequencyTimer = this.time.addEvent({
      delay: this.CHANGE_INTERVAL,
      loop: true,
      callback: () => {
        if (this.gameEnded) return;
        this.changeBombFrequency();
        this.resetTimerBar();
      },
      callbackScope: this,
    });

    this.setupKeyboard();
  }

  update() {
    if (!this.frequencyTimer || !this.timerBarFill || !this.timerBarBg || this.gameEnded) return;

    const progress = Phaser.Math.Clamp(
      this.frequencyTimer.getRemaining() / this.CHANGE_INTERVAL,
      0,
      1
    );

    this.timerBarFill.width = this.timerBarBg.width * progress;
  }

  // ─────────────────────────────────────────────
  // Bomba
  // ─────────────────────────────────────────────
  private resetTimerBar() {
    if (!this.timerBarFill || !this.timerBarBg) return;
    this.timerBarFill.width = this.timerBarBg.width;
  }

  private changeBombFrequency() {
    if (this.gameEnded) return;

    this.currentBombFrequency = this.generateBombFrequency();

    if (this.bombFreqText) {
      this.bombFreqText.setText(this.currentBombFrequency.text);
      this.bombFreqText.setScale(1.08);

      this.tweens.add({
        targets: this.bombFreqText,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: "Quad.Out",
      });
    }

    if (this.resultText) {
      this.resultText.setText("");
    }
  }

  private generateBombFrequency(): FrequencyData {
    const decimal = Phaser.Math.Between(this.MIN_DECIMAL, this.MAX_DECIMAL);

    return {
      value: decimal,
      text: this.formatFrequency(decimal),
    };
  }

  // ─────────────────────────────────────────────
  // Telecomando
  // ─────────────────────────────────────────────
  private createRemoteEffects(remoteX: number, remoteY: number, remoteW: number, remoteH: number) {
    const upX = remoteX - remoteW * 0.20;
    const upY = remoteY + remoteH * 0.13;

    const downX = remoteX + remoteW * 0.22;
    const downY = remoteY + remoteH * 0.13;

    const enterX = remoteX - 2;
    const enterY = remoteY + remoteH * 0.30;

    this.upPressedFx = this.add.image(upX, upY, "UP_PRESSED 1");
    this.downPressedFx = this.add.image(downX, downY, "DOWN_PRESSED 1");
    this.enterPressedFx = this.add.image(enterX, enterY, "ENTER_PRESSED 1");

    const upScale = (remoteW * 0.50) / this.upPressedFx.width;
    const downScale = (remoteW * 0.50) / this.downPressedFx.width;
    const enterScale = (remoteW * 1.21) / this.enterPressedFx.width;

    this.upPressedFx.setScale(upScale).setAlpha(0);
    this.downPressedFx.setScale(downScale).setAlpha(0);
    this.enterPressedFx.setScale(enterScale).setAlpha(0);
  }

  private createProgressDots(remoteX: number, remoteY: number, remoteW: number, remoteH: number) {
  const total = this.TARGET_SUCCESSES;

  this.dotW = remoteW * 0.09;
  this.dotH = remoteH * 0.022;

  const spacing = this.dotW * 1.28;

  const centerX = remoteX;
  const y = remoteY + remoteH * 0.002;

  const startX = centerX - ((total - 1) * spacing) / 2;

  this.progressDots.forEach(dot => dot.destroy());
  this.progressDots = [];

  for (let i = 0; i < total; i++) {
    const dot = this.add.graphics();
    dot.setPosition(startX + i * spacing, y);
    this.progressDots.push(dot);
  }

  this.refreshProgressDots();
}

  private refreshProgressDots() {
  for (let i = 0; i < this.progressDots.length; i++) {

    const dot = this.progressDots[i];
    dot.clear();

    const isOn = i < this.successCount;

    if (isOn) {
      dot.fillStyle(0xdcd8cc, 1); // acceso
    } else {
      dot.fillStyle(0x0d4a16, 0.95); // spento
    }

    dot.fillRoundedRect(
      -this.dotW / 2,
      -this.dotH / 2,
      this.dotW,
      this.dotH,
      4   // angoli leggermente arrotondati
    );
  }
}

  private updateRemoteDisplay() {
    if (!this.remoteFreqText) return;
    this.remoteFreqText.setText(this.formatFrequency(this.remoteDecimal));
  }

  private increaseRemoteFrequency() {
    if (this.gameEnded || this.isLocked) return;

    if (this.remoteDecimal < this.MAX_DECIMAL) {
      this.remoteDecimal++;
      this.updateRemoteDisplay();
    }

    this.flashButton(this.upPressedFx);
  }

  private decreaseRemoteFrequency() {
    if (this.gameEnded || this.isLocked) return;

    if (this.remoteDecimal > this.MIN_DECIMAL) {
      this.remoteDecimal--;
      this.updateRemoteDisplay();
    }

    this.flashButton(this.downPressedFx);
  }

  private confirmFrequency() {
    if (this.gameEnded || this.isLocked) return;

    this.flashButton(this.enterPressedFx);

    if (!this.resultText) return;

    // blocco per evitare doppi input rapidissimi
    this.isLocked = true;

    if (this.remoteDecimal === this.currentBombFrequency.value) {
      this.handleCorrectGuess();
    } else {
      this.handleWrongGuess();
    }

    this.time.delayedCall(250, () => {
      if (!this.gameEnded) {
        this.isLocked = false;
      }
    });
  }

  private handleCorrectGuess() {
    if (!this.resultText) return;

    this.successCount = Math.min(this.successCount + 1, this.TARGET_SUCCESSES);
    this.refreshProgressDots();

    this.resultText.setText("FREQUENCY GUESS");
    this.resultText.setColor("#5aff5a");

    this.tweens.add({
      targets: this.resultText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 80,
      yoyo: true,
      ease: "Quad.Out",
    });

    // animazione sul nuovo pallino acceso
    const dot = this.progressDots[this.successCount - 1];
    if (dot) {
      dot.setScale(1.35);
      this.tweens.add({
        targets: dot,
        scaleX: 1,
        scaleY: 1,
        duration: 140,
        ease: "Back.Out",
      });
    }

    if (this.successCount >= this.TARGET_SUCCESSES) {
      this.completeGame();
      return;
    }

    this.time.delayedCall(350, () => {
      if (this.gameEnded) return;
      this.changeBombFrequency();
      this.resetTimerBar();
      this.frequencyTimer?.reset({
        delay: this.CHANGE_INTERVAL,
        loop: true,
        callback: () => {
          if (this.gameEnded) return;
          this.changeBombFrequency();
          this.resetTimerBar();
        },
        callbackScope: this,
      });
    });
  }

  private handleWrongGuess() {
    if (!this.resultText) return;

    this.successCount = Math.max(0, this.successCount - 1);
    this.refreshProgressDots();

    this.resultText.setText("ERROR");
    this.resultText.setColor("#ff5050");

    this.tweens.add({
      targets: this.resultText,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: "Quad.Out",
    });

    this.shakeErrorScreen();
  }

  private shakeErrorScreen() {
    const cam = this.cameras.main;

    cam.shake(180, 0.008);

    if (this.bombFreqText) {
      this.tweens.add({
        targets: this.bombFreqText,
        x: this.bombScreenX + 3,
        duration: 35,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.bombFreqText?.setX(this.bombScreenX);
        },
      });
    }
  }

  private completeGame() {
    this.gameEnded = true;
    this.isLocked = true;

    this.frequencyTimer?.remove(false);



    if (this.infoText) {
      this.infoText.setText("SUCCESS");
      this.infoText.setColor("#ffffff");
    }

    if (this.timerBarFill) this.timerBarFill.width = 0;
  }

  private flashButton(target?: Phaser.GameObjects.Image) {
    if (!target) return;

    target.setAlpha(1);
    this.tweens.killTweensOf(target);

    this.tweens.add({
      targets: target,
      alpha: 0,
      duration: 140,
      ease: "Quad.Out",
    });
  }

  // ─────────────────────────────────────────────
  // Input tastiera
  // ─────────────────────────────────────────────
  private setupKeyboard() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on("keydown-UP", () => {
      this.increaseRemoteFrequency();
    });

    keyboard.on("keydown-DOWN", () => {
      this.decreaseRemoteFrequency();
    });

    keyboard.on("keydown-ENTER", () => {
      this.confirmFrequency();
    });

    keyboard.on("keydown-SPACE", () => {
      this.confirmFrequency();
    });
  }

  // ─────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────
  private formatFrequency(decimal: number): string {
    return `252.${decimal.toString().padStart(3, "0")} MHz`;
  }

  public getCurrentBombFrequencyValue(): number {
    return this.currentBombFrequency.value;
  }

  public getRemoteFrequencyValue(): number {
    return this.remoteDecimal;
  }
  
  private createExitButton() {

  const { width } = this.scale;

  const exit = this.add.text(width - 20, 20, "x", {
    fontFamily: "Pixelify Sans",
    fontSize: "34px",
    color: "#ffffff",
  })
  .setOrigin(1, 0)
  .setInteractive({ useHandCursor: true });

  // hover
  exit.on("pointerover", () => {
    exit.setColor("#ff4d4d");
    exit.setScale(1.1);
  });

  exit.on("pointerout", () => {
    exit.setColor("#ffffff");
    exit.setScale(1);
  });

  // click
  exit.on("pointerdown", () => {

    // stop timer
    this.frequencyTimer?.remove(false);

    // chiude minigame
    this.scene.stop("Minigame9");

    // torna alla scena principale (cambia se necessario)
    this.scene.start("GameScene");

  });

}
}