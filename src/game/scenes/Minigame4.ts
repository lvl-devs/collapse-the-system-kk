import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";

type PuzzleData = {
  fullText: string;
  maskedText: string;
  missingLetters: string[];
};

export default class Minigame4 extends Phaser.Scene {
  private boardX!: number;
  private boardY!: number;
  private uiScale!: number;

  private panelX!: number;
  private panelY!: number;
  private panelW!: number;
  private panelH!: number;

  private progress = 0;
  private acceptingInput = false;

  private progressBg?: Phaser.GameObjects.Rectangle;
  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;

  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private phraseText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;
  private typedText?: Phaser.GameObjects.Text;
  private uploadText?: Phaser.GameObjects.Text;
  private errorText?: Phaser.GameObjects.Text;

  private progressBarWidth = 0;
  private progressBarHeight = 0;
  private totalMissingLetters = 0;
  private insertedCorrectLetters = 0;

  private puzzles: PuzzleData[] = [
  {
    fullText: "UPLOAD READY",
    maskedText: "UPL_AD RE_DY",
    missingLetters: ["O", "A"]
  },
  {
    fullText: "SERVER ONLINE",
    maskedText: "SER_ER ONL_NE",
    missingLetters: ["V", "I"]
  },
  {
    fullText: "FILE SENT",
    maskedText: "FI_E SE_T",
    missingLetters: ["L", "N"]
  },
  {
    fullText: "DATA SAVED",
    maskedText: "DA_A SA_ED",
    missingLetters: ["T", "V"]
  },
  {
    fullText: "SYSTEM ON",
    maskedText: "S_STEM O_",
    missingLetters: ["Y", "N"]
  }
];

  private currentPuzzleIndex = 0;
  private currentBlankIndex = 0;
  private currentDisplayChars: string[] = [];

  constructor() {
    super("Minigame4");
  }

  preload() {
    if (!this.cache.audio.exists("phrase-correct")) {
      this.load.audio("phrase-correct", "../assets/sounds/minigame-4/phrase-correct.mp3");
    }
    if (!this.cache.audio.exists("loading-complete")) {
      this.load.audio("loading-complete", "../assets/sounds/loading-complete.mp3");
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

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.startMinigame();
  }

  private computeResponsiveLayout(width: number, height: number) {
    this.boardX = width / 2;
    this.boardY = height / 2;

    this.uiScale = Phaser.Math.Clamp(
      Math.min(width / 1366, height / 768) * 1.10,
      0.8,
      1.3
    );

    this.panelX = this.boardX;
    this.panelY = this.boardY - 15 * this.uiScale;
    this.panelW = Math.min(width * 0.72, 930) * this.uiScale;
    this.panelH = Math.min(height * 0.62, 520) * this.uiScale;
  }

  private drawBackground() {
    this.add.rectangle(
      this.boardX,
      this.boardY,
      this.scale.width,
      this.scale.height,
      0x05070b,
      0.92
    );

    this.add
      .rectangle(
        this.panelX,
        this.panelY,
        this.panelW,
        this.panelH,
        0x101723,
        1
      )
      .setStrokeStyle(4, 0x2cf7a1, 0.9);

    this.add
      .rectangle(
        this.panelX,
        this.panelY,
        this.panelW - 26 * this.uiScale,
        this.panelH - 26 * this.uiScale,
        0x020508,
        1
      )
      .setStrokeStyle(2, 0x13392d, 0.9);

    this.add
      .rectangle(
        this.panelX,
        this.panelY - this.panelH / 2 + 30 * this.uiScale,
        this.panelW - 26 * this.uiScale,
        30 * this.uiScale,
        0x0b1118,
        1
      )
      .setStrokeStyle(1, 0x1f8f66, 0.5);

    for (let i = 0; i < 9; i++) {
      this.add.rectangle(
        this.panelX,
        this.panelY - this.panelH / 2 + 70 * this.uiScale + i * 42 * this.uiScale,
        this.panelW - 40 * this.uiScale,
        1,
        0x0f2b22,
        0.35
      );
    }
  }

  private createCloseButton() {
    const closeX = this.panelX + this.panelW / 2 - 24 * this.uiScale;
    const closeY = this.panelY - this.panelH / 2 + 30 * this.uiScale;

    const closeBg = this.add
      .circle(closeX, closeY, 16 * this.uiScale, 0x2a0f19, 0.95)
      .setStrokeStyle(2, 0xff5a8a, 0.8)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(closeX, closeY, "X", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(20 * this.uiScale))}px`,
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
    const topY = this.panelY - this.panelH / 2 + 75 * this.uiScale;

    this.titleText = this.add
      .text(this.panelX, topY, "SERVER UPLOAD", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(40, Math.round(60 * this.uiScale))}px`,
        color: "#46ff88",
        fontStyle: "bold",
        stroke: "#09100c",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(this.panelX, topY + 36 * this.uiScale, "COMPLETE THE MISSING CHARACTERS", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(14, Math.round(20 * this.uiScale))}px`,
        color: "#8de8ff",
      })
      .setOrigin(0.5);


    this.phraseText = this.add
      .text(this.panelX, this.panelY + 8 * this.uiScale, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(24, Math.round(32 * this.uiScale))}px`,
        color: "#46ff88",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: this.panelW * 0.78 }
      })
      .setOrigin(0.5);

    this.typedText = this.add
      .text(this.panelX, this.panelY + 85 * this.uiScale, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(20 * this.uiScale))}px`,
        color: "#8de8ff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(this.panelX, this.panelY + 145 * this.uiScale, "TYPE THE MISSING LETTERS", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(14, Math.round(18 * this.uiScale))}px`,
        color: "#9db7c7",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(this.panelX, this.panelY + 195 * this.uiScale, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(18, Math.round(24 * this.uiScale))}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.errorText = this.add
      .text(this.panelX, this.panelY + 235 * this.uiScale, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(20 * this.uiScale))}px`,
        color: "#ff4d6d",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private createProgressBar() {
  this.progressBarWidth = this.panelW * 0.58;
  this.progressBarHeight = Math.max(22, 28 * this.uiScale);

  const barY = this.panelY - 30 * this.uiScale;

  this.uploadText = this.add
  .text(this.panelX, barY, "UPLOAD STATUS: 0%", {
    fontFamily: "Pixelify Sans",
    fontSize: `${Math.max(14, Math.round(18 * this.uiScale))}px`,
    color: "#ffffff",
    fontStyle: "bold"
  })
  .setOrigin(0.5);

  this.progressBg = this.add
    .rectangle(
      this.panelX,
      barY,
      this.progressBarWidth,
      this.progressBarHeight,
      0x091018,
      1
    )
    .setStrokeStyle(2, 0x46ff88, 0.9)
    .setOrigin(0.5);

  this.progressFill = this.add
    .rectangle(
      this.panelX - this.progressBarWidth / 2 + 3 * this.uiScale,
      barY,
      0,
      this.progressBarHeight - 6,
      0x2cf7a1,
      0.95
    )
    .setOrigin(0, 0.5);

}

  private startMinigame() {
  this.acceptingInput = false;
  this.progress = 0;
  this.insertedCorrectLetters = 0;
  this.totalMissingLetters = 0;

  for (const puzzle of this.puzzles) {
    this.totalMissingLetters += puzzle.missingLetters.length;
  }

  this.updateProgressUI();

  this.currentPuzzleIndex = 0;
  this.loadPuzzle(this.currentPuzzleIndex);

  this.showStatus("SERVER CONNECTION ESTABLISHED", "#8de8ff");

  this.time.delayedCall(700, () => {
    this.acceptingInput = true;
    this.showStatus("UPLOAD READY", "#46ff88");
  });
}

  private loadPuzzle(index: number) {
  const puzzle = this.puzzles[index];
  this.currentBlankIndex = 0;
  this.currentDisplayChars = puzzle.maskedText.split("");

  this.updatePhraseText();
  this.updateTypedText();
}

  private handleKeyPress(event: KeyboardEvent) {
    if (!this.acceptingInput) return;

    const key = event.key.toUpperCase();

    if (!/^[A-Z]$/.test(key)) return;

    const puzzle = this.puzzles[this.currentPuzzleIndex];
    const expected = puzzle.missingLetters[this.currentBlankIndex];

    if (key === expected) {
      this.applyCorrectLetter(key);
    } else {
      this.applyWrongLetter();
    }
  }

  private applyCorrectLetter(letter: string) {
  const underscoreIndex = this.currentDisplayChars.indexOf("_");
  if (underscoreIndex === -1) return;

  this.currentDisplayChars[underscoreIndex] = letter;
  this.currentBlankIndex++;
  this.insertedCorrectLetters++;

  this.progress = Math.round(
    (this.insertedCorrectLetters / this.totalMissingLetters) * 100
  );

  this.updatePhraseText();
  this.updateTypedText();
  this.updateProgressUI();
  this.showStatus("CHARACTER ACCEPTED", "#46ff88");

  const currentPuzzle = this.puzzles[this.currentPuzzleIndex];

  if (this.currentBlankIndex >= currentPuzzle.missingLetters.length) {
    this.completePuzzle();
  }
}

  private applyWrongLetter() {
    this.showError("ERROR: INVALID CHARACTER");

    if (this.phraseText) {
      this.tweens.killTweensOf(this.phraseText);

      this.tweens.add({
        targets: this.phraseText,
        x: this.phraseText.x + 7 * this.uiScale,
        duration: 40,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.phraseText?.setX(this.panelX);
        }
      });

      this.phraseText.setColor("#ff708f");

      this.time.delayedCall(180, () => {
        this.phraseText?.setColor("#46ff88");
      });
    }
  }

  private completePuzzle() {
  this.acceptingInput = false;

  this.showStatus("PHRASE COMPLETED", "#46ff88");
  SfxManager.start(this, "phrase-correct", {
    volume: GameData.sfxVolume ?? 0.7,
  });

  if (this.currentPuzzleIndex >= this.puzzles.length - 1) {
    this.progress = 100;
    this.updateProgressUI();

    this.time.delayedCall(700, () => {
      this.completeTask();
    });
    return;
  }

  this.time.delayedCall(850, () => {
    this.currentPuzzleIndex++;
    this.loadPuzzle(this.currentPuzzleIndex);
    this.acceptingInput = true;
    this.showStatus("NEXT PHRASE READY", "#8de8ff");
  });
}

  private updatePhraseText() {
    if (!this.phraseText) return;
    this.phraseText.setText(this.currentDisplayChars.join(""));
  }

  private updateTypedText() {
    if (!this.typedText) return;

    const puzzle = this.puzzles[this.currentPuzzleIndex];
    const done = puzzle.missingLetters.slice(0, this.currentBlankIndex).join(" ");
    const left = puzzle.missingLetters.length - this.currentBlankIndex;

    this.typedText.setText(`INSERTED: ${done || "-"}    |    MISSING: ${left}`);
  }

  private updateProgressUI() {
  if (!this.progressFill || !this.uploadText) return;

  const maxWidth = this.progressBarWidth - 6 * this.uiScale;
  const targetWidth = (this.progress / 100) * maxWidth;

  this.tweens.killTweensOf(this.progressFill);

  this.tweens.add({
    targets: this.progressFill,
    width: targetWidth,
    duration: 180,
    ease: "Sine.Out"
  });

  this.uploadText.setText(`UPLOAD STATUS: ${this.progress}%`);
}

  private showStatus(message: string, color: string) {
    if (!this.statusText) return;

    this.tweens.killTweensOf(this.statusText);

    this.statusText.setText(message);
    this.statusText.setColor(color);
    this.statusText.setAlpha(1);
    this.statusText.setScale(0.94);

    this.tweens.add({
      targets: this.statusText,
      scaleX: 1,
      scaleY: 1,
      duration: 100
    });

    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      duration: 300,
      delay: 650
    });
  }

  private showError(message: string) {
    if (!this.errorText) return;

    this.tweens.killTweensOf(this.errorText);

    this.errorText.setText(message);
    this.errorText.setAlpha(1);

    this.tweens.add({
      targets: this.errorText,
      alpha: 0.2,
      duration: 90,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.tweens.add({
          targets: this.errorText,
          alpha: 0,
          duration: 250
        });
      }
    });
  }

  private hideTerminalUI() {
    this.titleText?.setVisible(false);
    this.subtitleText?.setVisible(false);
    this.statusText?.setVisible(false);
    this.phraseText?.setVisible(false);
    this.hintText?.setVisible(false);
    this.typedText?.setVisible(false);
    this.errorText?.setVisible(false);

    this.progressBg?.setVisible(false);
    this.progressFill?.setVisible(false);
    this.progressText?.setVisible(false);
    this.uploadText?.setVisible(false);
  }

  private completeTask() {
    this.acceptingInput = false;
    this.input.keyboard?.off("keydown", this.handleKeyPress, this);

    this.progress = 100;
    this.updateProgressUI();
    this.registry.set("task4Completed", true);
    SfxManager.start(this, "loading-complete", {
      volume: GameData.sfxVolume ?? 0.7,
    });

    this.hideTerminalUI();

    const finalBg = this.add
      .rectangle(this.panelX, this.panelY, this.panelW - 26 * this.uiScale, this.panelH - 26 * this.uiScale, 0x000000, 1)
      .setStrokeStyle(2, 0x46ff88, 0.6);

    const finalText = this.add
      .text(this.panelX, this.panelY - 18 * this.uiScale, "UPLOAD COMPLETE", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(28, Math.round(38 * this.uiScale))}px`,
        color: "#46ff88",
        fontStyle: "bold",
        stroke: "#09100c",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const finalSub = this.add
      .text(this.panelX, this.panelY + 42 * this.uiScale, "FILE SENT TO SERVER", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(22 * this.uiScale))}px`,
        color: "#8de8ff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: [finalText, finalSub],
      alpha: 0.3,
      duration: 120,
      yoyo: true,
      repeat: 2
    });

    this.time.delayedCall(2200, () => {
      finalBg.destroy();
      finalText.destroy();
      finalSub.destroy();

      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }
}
