import Phaser from "phaser";

type PauseMenuData = {
  parentSceneKey?: string;
};

type PauseAction = {
  label: string;
  run: () => void;
};

export default class PauseMenu extends Phaser.Scene {
  private parentSceneKey = "GamePlay";
  private selectedIndex = 0;
  private items: Phaser.GameObjects.Text[] = [];
  private actions: PauseAction[] = [];
  private isProcessingAction = false;

  constructor() {
    super({ key: "PauseMenu" });
  }

  init(data: PauseMenuData): void {
    this.parentSceneKey = data.parentSceneKey ?? "GamePlay";
    this.isProcessingAction = false;
    this.selectedIndex = 0; // Reset selection
    console.log("[PauseMenu] init with parent:", this.parentSceneKey);
  }

  create(): void {
    console.log("[PauseMenu] create() called");
    
    // Clear previous items if any
    this.items = [];
    this.selectedIndex = 0;
    
    const { width, height } = this.scale;
    const neon = 0x70fdc2;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

    const panelX = width / 2;
    const panelY = height / 2;
    const panelW = Math.min(520, width * 0.64);
    const panelH = Math.min(520, height * 0.72);

    const g = this.add.graphics();
    g.lineStyle(3, neon, 0.9);
    g.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 12);

    const headerH = 84;
    const headerY = panelY - panelH / 2 - 95;
    g.strokeRoundedRect(panelX - panelW / 2, headerY, panelW, headerH, 12);

    this.add
      .text(panelX, headerY + headerH / 2, "PAUSED", {
        fontFamily: "Pixelify Sans",
        fontSize: "58px",
        color: "#70fdc2",
      })
      .setOrigin(0.5);

    this.actions = [
      { label: "Resume", run: () => this.resumeGame() },
      { label: "Restart", run: () => this.restartGame() },
      { label: "Options", run: () => this.openOptions() },
      { label: "Main Menu", run: () => this.goToMainMenu() },
    ];

    const startY = panelY - 140;
    const rowGap = 86;

    this.actions.forEach((action, index) => {
      const y = startY + index * rowGap;

      const rowLine = this.add.graphics();
      rowLine.lineStyle(2, neon, 0.75);
      rowLine.beginPath();
      rowLine.moveTo(panelX - panelW / 2 + 36, y + 36);
      rowLine.lineTo(panelX + panelW / 2 - 36, y + 36);
      rowLine.strokePath();

      const item = this.add
        .text(panelX, y, action.label, {
          fontFamily: "Pixelify Sans",
          fontSize: "56px",
          color: "#d9fff2",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selectedIndex = index;
          this.updateSelection();
        })
        .on("pointerdown", () => {
          this.selectedIndex = index;
          this.activateSelection();
        });

      this.items.push(item);
    });

    this.updateSelection();

    const onUp = () => {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.updateSelection();
    };

    const onDown = () => {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.updateSelection();
    };

    const onEnter = () => this.activateSelection();
    
    const onEsc = () => {
      console.log("[PauseMenu] ESC pressed - resuming game");
      this.resumeGame();
    };

    const onResume = () => {
      console.log("[PauseMenu] Resume event - showing menu again and resetting flag");
      this.isProcessingAction = false; // Reset flag when returning from Options
      this.scene.setVisible(true, this.scene.key);
      this.input.keyboard?.resetKeys();
    };

    const onWake = () => {
      console.log("[PauseMenu] Wake event - resetting state");
      this.isProcessingAction = false;
      this.selectedIndex = 0;
      this.updateSelection();
      this.input.keyboard?.resetKeys();
    };

    this.input.keyboard?.on("keydown-UP", onUp);
    this.input.keyboard?.on("keydown-DOWN", onDown);
    this.input.keyboard?.on("keydown-ENTER", onEnter);
    this.input.keyboard?.on("keydown-SPACE", onEnter);
    this.input.keyboard?.on("keydown-ESC", onEsc);
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.on(Phaser.Scenes.Events.WAKE, onWake);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      console.log("[PauseMenu] shutdown - cleaning up listeners");
      this.input.keyboard?.off("keydown-UP", onUp);
      this.input.keyboard?.off("keydown-DOWN", onDown);
      this.input.keyboard?.off("keydown-ENTER", onEnter);
      this.input.keyboard?.off("keydown-SPACE", onEnter);
      this.input.keyboard?.off("keydown-ESC", onEsc);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.events.off(Phaser.Scenes.Events.WAKE, onWake);
    });
  }

  private updateSelection(): void {
    if (!this.items || this.items.length === 0) {
      console.warn("[PauseMenu] updateSelection called but items not ready");
      return;
    }
    
    this.items.forEach((item, idx) => {
      if (!item || !item.active) {
        return; // Skip destroyed or inactive items
      }
      
      if (idx === this.selectedIndex) {
        item.setColor("#70fdc2");
        item.setScale(1.06);
      } else {
        item.setColor("#d9fff2");
        item.setScale(1);
      }
    });
  }

  private activateSelection(): void {
    this.actions[this.selectedIndex].run();
  }

  private resumeGame(): void {
    if (this.isProcessingAction) {
      console.log("[PauseMenu] Already processing, ignoring resume");
      return;
    }
    this.isProcessingAction = true;
    console.log("[PauseMenu] Resuming game:", this.parentSceneKey);
    this.scene.sleep(this.scene.key); // Sleep instead of stop to keep textures
    this.scene.resume(this.parentSceneKey);
  }

  private restartGame(): void {
    if (this.isProcessingAction) {
      console.log("[PauseMenu] Already processing, ignoring restart");
      return;
    }
    this.isProcessingAction = true;
    console.log("[PauseMenu] Restarting game:", this.parentSceneKey);
    this.scene.stop(this.scene.key);
    this.scene.stop(this.parentSceneKey);
    this.scene.start(this.parentSceneKey);
  }

  private openOptions(): void {
    if (this.isProcessingAction) {
      console.log("[PauseMenu] Already processing, ignoring options");
      return;
    }
    this.isProcessingAction = true;
    console.log("[PauseMenu] Opening Options");
    this.scene.setVisible(false, this.scene.key);
    this.scene.pause();
    this.scene.launch("Options", {
      returnMode: "pause",
      pauseMenuSceneKey: this.scene.key,
    });
  }

  private goToMainMenu(): void {
    if (this.isProcessingAction) {
      console.log("[PauseMenu] Already processing, ignoring main menu");
      return;
    }
    this.isProcessingAction = true;
    console.log("[PauseMenu] Going to Main Menu");
    this.scene.stop(this.scene.key);
    this.scene.stop(this.parentSceneKey);
    this.scene.start("Menu");
  }
}
