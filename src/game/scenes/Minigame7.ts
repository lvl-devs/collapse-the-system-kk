import Phaser from "phaser";

type FlightData = {
  code: string;
  origin: string;
  destination: string;
  time: string;
  gate: string;
};

type SceneMode = "select" | "edit" | "complete";

export default class Minigame7 extends Phaser.Scene {
  private bg?: Phaser.GameObjects.Image;

  private uiScale = 1;

  private screenX = 0;
  private screenY = 0;
  private screenW = 0;
  private screenH = 0;

  private closeText?: Phaser.GameObjects.Text;

  private flights: FlightData[] = [
    { code: "AZ417", origin: "MILAN", destination: "PARIS", time: "19:20", gate: "A2" },
    { code: "IB228", origin: "MADRID", destination: "BERLIN", time: "19:35", gate: "B1" },
    { code: "LH932", origin: "VIENNA", destination: "LONDON", time: "19:50", gate: "C4" },
    { code: "AF104", origin: "PARIS", destination: "DUBLIN", time: "20:05", gate: "A7" },
    { code: "BA551", origin: "ROME", destination: "MADRID", time: "20:20", gate: "D3" }
  ];

  private targets = [
    { code: "LH932", newDestination: "ROME" },
    { code: "AZ417", newDestination: "ATHENS" },
    { code: "AF104", newDestination: "MADRID" }
  ];

  private completedTargets: string[] = [];
  private destinationOptions = ["ROME", "PARIS", "MADRID", "LONDON", "DUBLIN", "ATHENS"];

  private selectedIndex = 0;
  private destinationChoiceIndex = 0;
  private mode: SceneMode = "select";
  private acceptingInput = false;

  private titleText?: Phaser.GameObjects.Text;
  private clueText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private footerText?: Phaser.GameObjects.Text;
  private detailTitleText?: Phaser.GameObjects.Text;
  private detailInfoText?: Phaser.GameObjects.Text;
  private destinationText?: Phaser.GameObjects.Text;

  private rowTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("Minigame7");
  }

  preload() {
    this.load.image("min7_terminal_bg", "../assets/images/tower_terminal.png");
  }

  create() {
    const { width, height } = this.scale;

    this.scale.off("resize");
    this.scale.on("resize", () => {
      this.scene.restart();
    });

    this.cameras.main.setRoundPixels(true);

    this.computeLayout(width, height);
    this.drawBackground();
    this.createCloseButton();
    this.createInterface();

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.acceptingInput = true;
    this.refreshUI();

    this.playIntroZoom();

    this.time.delayedCall(250, () => {
      this.showStatus("IDENTIFY THE CORRECT FLIGHT", "#8de8ff");
    });
  }

  private computeLayout(width: number, height: number) {
    this.uiScale = Phaser.Math.Clamp(
      Math.min(width / 1344, height / 768) * 1.92,
      0.92,
      1.35
    );

    this.screenX = Math.round(width * 0.503);
    this.screenY = Math.round(height * 0.392);
    this.screenW = Math.round(width * 0.50);
    this.screenH = Math.round(height * 0.50);
  }

  private baseTextStyle(
    size: number,
    color: string,
    bold = false,
    align: "left" | "center" | "right" = "left"
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: "Pixelify Sans",
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? "bold" : "normal",
      align,
      resolution: 5,
      shadow: {
        offsetX: 1,
        offsetY: 1,
        color: "#000000",
        blur: 0,
        fill: true
      }
    };
  }

  private drawBackground() {
    const { width, height } = this.scale;

    this.bg = this.add.image(Math.round(width / 2), Math.round(height / 2), "min7_terminal_bg");
    this.bg.setOrigin(0.5);
    this.bg.setDisplaySize(width, height);
  }

  private createCloseButton() {
    const closeX = Math.round(this.screenX + this.screenW / 2 - 18 * this.uiScale);
    const closeY = Math.round(this.screenY - this.screenH / 2 + 16 * this.uiScale);

    this.closeText = this.add
      .text(
        closeX,
        closeY,
        "X",
        this.baseTextStyle(
          Math.max(14, Math.round(18 * this.uiScale)),
          "#ffffff",
          true,
          "center"
        )
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const over = () => {
      this.closeText?.setScale(1.08);
    };

    const out = () => {
      this.closeText?.setScale(1);
    };

    const close = () => {
      this.input.keyboard?.off("keydown", this.handleKeyPress, this);
      this.scene.stop();
      this.scene.resume("GamePlay");
    };

    this.closeText.on("pointerover", over);
    this.closeText.on("pointerout", out);
    this.closeText.on("pointerdown", close);
  }

  private createInterface() {
    const leftX = Math.round(this.screenX - this.screenW * 0.37);
    const rightX = Math.round(this.screenX + this.screenW * 0.20);
    const topY = Math.round(this.screenY - this.screenH * 0.50);

    this.titleText = this.add
      .text(
        Math.round(this.screenX),
        Math.round(topY + 105),
        "FLIGHT CONTROL",
        this.baseTextStyle(
          Math.max(18, Math.round(27 * this.uiScale)),
          "#46ff88",
          true,
          "center"
        )
      )
      .setOrigin(0.5);

    this.clueText = this.add
      .text(
        Math.round(this.screenX),
        Math.round(topY + 113 * this.uiScale),
        "",
        {
          ...this.baseTextStyle(
            Math.max(8, Math.round(12 * this.uiScale)),
            "#8de8ff",
            false,
            "center"
          ),
          wordWrap: { width: Math.round(this.screenW * 0.72) }
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        leftX,
        Math.round(topY + 90 * this.uiScale),
        "FLIGHTS",
        this.baseTextStyle(
          Math.max(15, Math.round(20* this.uiScale)),
          "#d7fff0"
        )
      )
      .setOrigin(0, 0.5);

    this.add
      .text(
        rightX,
        Math.round(topY + 90 * this.uiScale),
        "DETAILS",
        this.baseTextStyle(
          Math.max(15, Math.round(20 * this.uiScale)),
          "#d7fff0"
        )
      )
      .setOrigin(0, 0.5);

    this.rowTexts = [];
    for (let i = 0; i < this.flights.length; i++) {
      const row = this.add
        .text(
          leftX,
          Math.round(topY + 124 * this.uiScale + i * 22 * this.uiScale),
          "",
          this.baseTextStyle(
            Math.max(8, Math.round(12  * this.uiScale)),
            "#9bd7c5"
          )
        )
        .setOrigin(0, 0.5);

      this.rowTexts.push(row);
    }

    this.detailTitleText = this.add
  .text(
    rightX,
    Math.round(topY + 126 * this.uiScale),
    "",
    this.baseTextStyle(
      Math.max(15, Math.round(20 * this.uiScale)),
      "#46ff88",
      true
    )
  )
  .setOrigin(0, 0.5);

this.detailInfoText = this.add
  .text(
    rightX,
    Math.round(topY + 150 * this.uiScale),
    "",
    {
      ...this.baseTextStyle(
        Math.max(10, Math.round(12 * this.uiScale)),
        "#d7fff0"
      ),
      lineSpacing: Math.round(3 * this.uiScale)
    }
  )
  .setOrigin(0, 0);

this.destinationText = this.add
  .text(
    rightX,
    Math.round(topY + 227 * this.uiScale),
    "",
    {
      ...this.baseTextStyle(
        Math.max(10, Math.round(11 * this.uiScale)),
        "#ffe27a"
      ),
      wordWrap: { width: Math.round(this.screenW * 0.25) }
    }
  )
  .setOrigin(0, 0.5);

    this.footerText = this.add
  .text(
    Math.round(this.screenX - this.screenW * 0.38),
    Math.round(this.screenY + this.screenH * 0.48),
    "",
    this.baseTextStyle(
      Math.max(9, Math.round(11 * this.uiScale)),
      "#9db7c7"
    )
  )
  .setOrigin(0, 0.5);

    this.statusText = this.add
      .text(
        Math.round(this.screenX),
        Math.round(this.screenY + this.screenH * 0.33),
        "",
        this.baseTextStyle(
          Math.max(10, Math.round(12 * this.uiScale)),
          "#ffffff",
          true,
          "center"
        )
      )
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private playIntroZoom() {
    const cam = this.cameras.main;

    cam.setZoom(1.0);
    cam.centerOn(
      Math.round(this.scale.width / 2),
      Math.round(this.scale.height / 2)
    );

    this.time.delayedCall(2000, () => {
      const targetX = Math.round(this.screenX);
      const targetY = Math.round(this.screenY + 30 * this.uiScale);

      const targetScrollX = Math.round(targetX - cam.width / 2);
      const targetScrollY = Math.round(targetY - cam.height / 2);

      this.tweens.add({
        targets: cam,
        zoom: 1.4,
        scrollX: targetScrollX,
        scrollY: targetScrollY,
        duration: 2200,
        ease: "Cubic.easeOut"
      });
    });
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (!this.acceptingInput) return;

    if (this.mode === "select") {
      if (event.code === "ArrowUp") {
        this.selectedIndex = (this.selectedIndex - 1 + this.flights.length) % this.flights.length;
        this.refreshUI();
        return;
      }

      if (event.code === "ArrowDown") {
        this.selectedIndex = (this.selectedIndex + 1) % this.flights.length;
        this.refreshUI();
        return;
      }

      if (event.code === "Enter" || event.code === "Space") {
        this.trySelectFlight();
      }

      return;
    }

    if (this.mode === "edit") {
      if (event.code === "ArrowLeft") {
        this.destinationChoiceIndex =
          (this.destinationChoiceIndex - 1 + this.destinationOptions.length) % this.destinationOptions.length;
        this.refreshUI();
        return;
      }

      if (event.code === "ArrowRight") {
        this.destinationChoiceIndex =
          (this.destinationChoiceIndex + 1) % this.destinationOptions.length;
        this.refreshUI();
        return;
      }

      if (event.code === "Enter" || event.code === "Space") {
        this.confirmDestination();
      }

      if (event.code === "Escape") {
        this.mode = "select";
        this.refreshUI();
        this.showStatus("RETURNED TO FLIGHT LIST", "#8de8ff");
      }
    }
  }

  private getCurrentTarget() {
    const flight = this.flights[this.selectedIndex];
    return this.targets.find((t) => t.code === flight.code);
  }

  private areAllTargetsCompleted() {
    return this.completedTargets.length >= this.targets.length;
  }

  private trySelectFlight() {
    const flight = this.flights[this.selectedIndex];
    const target = this.targets.find((t) => t.code === flight.code);

    if (!target) {
      this.showStatus("WRONG FLIGHT", "#ff6b8e");
      this.flashRowError(this.selectedIndex);
      return;
    }

    if (this.completedTargets.includes(flight.code)) {
      this.showStatus("FLIGHT ALREADY DIVERTED", "#8de8ff");
      return;
    }

    this.mode = "edit";
    this.destinationChoiceIndex = this.destinationOptions.indexOf(flight.destination);

    if (this.destinationChoiceIndex < 0) {
      this.destinationChoiceIndex = 0;
    }

    this.refreshUI();
    this.showStatus("MODIFY DESTINATION", "#46ff88");
  }

  private confirmDestination() {
    const flight = this.flights[this.selectedIndex];
    const chosen = this.destinationOptions[this.destinationChoiceIndex];
    const target = this.targets.find((t) => t.code === flight.code);

    if (!target) {
      this.showStatus("WRONG FLIGHT", "#ff6b8e");
      return;
    }

    if (chosen !== target.newDestination) {
      this.showStatus("INVALID DESTINATION", "#ff6b8e");
      this.flashDestinationError();
      return;
    }

    flight.destination = chosen;

    if (!this.completedTargets.includes(flight.code)) {
      this.completedTargets.push(flight.code);
    }

    if (this.areAllTargetsCompleted()) {
      this.completeTask();
      return;
    }

    this.mode = "select";
    this.refreshUI();
    this.showStatus("FLIGHT DIVERTED", "#46ff88");
  }

  private refreshUI() {
    if (this.clueText) {
      const clueLines = this.targets.map((t) => {
        const done = this.completedTargets.includes(t.code) ? " [DONE]" : "";
        return `${t.code} -> ${t.newDestination}${done}`;
      });

      this.clueText.setText(`DIVERT THESE FLIGHTS:\n${clueLines.join("\n")}`);
    }

    for (let i = 0; i < this.rowTexts.length; i++) {
      const row = this.rowTexts[i];
      const flight = this.flights[i];
      const isSelected = i === this.selectedIndex;

      const isDone = this.completedTargets.includes(flight.code);
      const doneLabel = isDone ? "  [DONE]" : "";

      row.setText(`${flight.code}   ${flight.destination}${doneLabel}`);

      if (isSelected) {
        row.setColor("#ffe27a");
        row.setText(`> ${flight.code}   ${flight.destination}${doneLabel}`);
      } else if (isDone) {
        row.setColor("#46ff88");
      } else {
        row.setColor("#9bd7c5");
      }
    }

    const selectedFlight = this.flights[this.selectedIndex];

    if (this.detailTitleText) {
      this.detailTitleText.setText(selectedFlight.code);
    }

    if (this.detailInfoText) {
      this.detailInfoText.setText(
        `ORIGIN: ${selectedFlight.origin}\n` +
        `DESTINATION: ${selectedFlight.destination}\n` +
        `TIME: ${selectedFlight.time}\n` +
        `GATE: ${selectedFlight.gate}`
      );
    }

    if (this.destinationText) {
      const currentTarget = this.getCurrentTarget();

      if (this.mode === "edit") {
        this.destinationText.setColor("#ffe27a");
        this.destinationText.setText(
          `NEW DESTINATION:\n< ${this.destinationOptions[this.destinationChoiceIndex]} >`
        );
      } else if (currentTarget) {
        this.destinationText.setColor("#8de8ff");
        this.destinationText.setText(
          `TARGET:\n${currentTarget.newDestination}\nPRESS ENTER TO EDIT`
        );
      } else {
        this.destinationText.setColor("#8de8ff");
        this.destinationText.setText(`PRESS ENTER TO EDIT`);
      }
    }

    if (this.footerText) {
      if (this.mode === "select") {
        this.footerText.setText("UP / DOWN = SELECT FLIGHT    ENTER = OPEN");
      } else if (this.mode === "edit") {
        this.footerText.setText("LEFT / RIGHT = CHANGE DESTINATION    ENTER = CONFIRM    ESC = BACK");
      } else {
        this.footerText.setText("");
      }
    }
  }

  private flashRowError(index: number) {
    const row = this.rowTexts[index];
    if (!row) return;

    const originalX = row.x;

    this.tweens.killTweensOf(row);
    row.setColor("#ff6b8e");

    this.tweens.add({
      targets: row,
      x: originalX + 7 * this.uiScale,
      duration: 40,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        row.setX(originalX);
        this.refreshUI();
      }
    });
  }

  private flashDestinationError() {
    if (!this.destinationText) return;

    const originalX = this.destinationText.x;

    this.tweens.killTweensOf(this.destinationText);

    this.tweens.add({
      targets: this.destinationText,
      x: originalX + 7 * this.uiScale,
      duration: 40,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.destinationText?.setX(originalX);
      }
    });
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
      duration: 350,
      delay: 700
    });
  }

  private hideUI() {
    this.titleText?.setVisible(false);
    this.clueText?.setVisible(false);
    this.statusText?.setVisible(false);
    this.footerText?.setVisible(false);
    this.detailTitleText?.setVisible(false);
    this.detailInfoText?.setVisible(false);
    this.destinationText?.setVisible(false);
    this.closeText?.setVisible(false);

    for (const row of this.rowTexts) {
      row.setVisible(false);
    }
  }

  private completeTask() {
    this.acceptingInput = false;
    this.mode = "complete";
    this.input.keyboard?.off("keydown", this.handleKeyPress, this);

    this.registry.set("task7Completed", true);

    this.hideUI();

    const finalText = this.add
      .text(
        Math.round(this.screenX),
        Math.round(this.screenY - 10 * this.uiScale),
        "FLIGHT DIVERTED",
        this.baseTextStyle(
          Math.max(24, Math.round(34 * this.uiScale)),
          "#46ff88",
          true,
          "center"
        )
      )
      .setOrigin(0.5);

    const finalSub = this.add
      .text(
        Math.round(this.screenX),
        Math.round(this.screenY + 40 * this.uiScale),
        "ALL TARGET FLIGHTS DIVERTED",
        this.baseTextStyle(
          Math.max(14, Math.round(18 * this.uiScale)),
          "#8de8ff",
          true,
          "center"
        )
      )
      .setOrigin(0.5);

    this.tweens.add({
      targets: [finalText, finalSub],
      alpha: 0.35,
      duration: 120,
      yoyo: true,
      repeat: 2
    });

    this.time.delayedCall(2200, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }
}