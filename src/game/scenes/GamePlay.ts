import Phaser from "phaser";
import { GameData } from "../../GameData";
import DungeonGenerator from "../systems/DungeonGenerator";
import type { DungeonBuildResult } from "../systems/DungeonGenerator";
import AssetPipeline from "../systems/AssetPipeline";
import { DEFAULT_TILES } from "../systems/TileMapping";
import CharacterController, { createKeyboardMovementInput } from "../entities/CharacterController";

const PLAYER_SPEED = 160;

export default class GamePlay extends Phaser.Scene {
  private dungeonResult!: DungeonBuildResult;
  private playerController!: CharacterController;
  private hasPlayerReachedStairs = false;
  private level = 0;
  private debugMode = false;
  private tileDebugGraphics?: Phaser.GameObjects.Graphics;
  private escPauseKey?: Phaser.Input.Keyboard.Key;
  private debugSceneKeysActiveListeners = false;

  constructor() {
    super({ key: "GamePlay" });
  }

  preload() {
    AssetPipeline.startDeferredPreload(this);
  }

  create() {
    this.level++;
    this.hasPlayerReachedStairs = false;

    const cfg = GameData.dungeon.defaultConfig;
    this.dungeonResult = DungeonGenerator.buildTilemap(this, {
      ...cfg,
      theme: GameData.dungeon.defaultTheme,
    });

    const { groundLayer, stuffLayer, startX, startY, map } = this.dungeonResult;

    const theme = GameData.dungeon.defaultTheme;
    const bgColors: Record<string, string> = {
      cyber:    "#04040f",
      cave:     "#060402",
      facility: "#030605",
      void:     "#000000",
    };
    this.cameras.main.setBackgroundColor(bgColors[theme] ?? "#000000");

    const playerInput = createKeyboardMovementInput(this);
    this.playerController = new CharacterController({
      scene: this,
      x: startX,
      y: startY,
      textureKey: "hacker",
      animationNamespace: "player-hacker",
      speed: PLAYER_SPEED,
      frameConfig: {
        walk: {
          down: { start: 0, end: 2 },
          left: { start: 3, end: 5 },
          right: { start: 6, end: 8 },
          up: { start: 9, end: 11 },
        },
        idle: {
          down: 0,
          left: 3,
          right: 6,
          up: 9,
        },
      },
      inputProvider: playerInput,
      initialDirection: "down",
      depth: 10,
      bounce: 0,
      collideWorldBounds: true,
      frameRate: 8,
      repeat: -1,
      prioritizeVertical: true,
    });

    this.physics.add.collider(this.playerController.sprite, groundLayer);
    this.physics.add.collider(this.playerController.sprite, stuffLayer);

    // Stairs callback: restart scene on next level
    stuffLayer.setTileIndexCallback(DEFAULT_TILES.STAIRS, () => {
      stuffLayer.setTileIndexCallback(DEFAULT_TILES.STAIRS, () => {}, this);
      this.hasPlayerReachedStairs = true;
      this.playerController.stop();

      const cam = this.cameras.main;
      cam.fade(300, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => {
        this.scene.restart();
      });
    }, this);

    this.cameras.main.startFollow(this.playerController.sprite, true, 0.1, 0.1);

    this.escPauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escPauseKey?.on("down", this.openPauseMenu, this);

    this.input.keyboard!.on("keydown-C", () => {
      this.debugMode = !this.debugMode;
      const { groundLayer, stuffLayer } = this.dungeonResult;

      if (this.debugMode) {
        this.physics.world.drawDebug = true;
        this.physics.world.createDebugGraphic();

        this.tileDebugGraphics = this.add.graphics().setDepth(50);
        groundLayer.renderDebug(this.tileDebugGraphics, {
          tileColor:         null,
          collidingTileColor: new Phaser.Display.Color(255, 60, 60, 120),
          faceColor:          new Phaser.Display.Color(255, 120, 0, 255),
        });
        stuffLayer.renderDebug(this.tileDebugGraphics, {
          tileColor:         null,
          collidingTileColor: new Phaser.Display.Color(255, 200, 0, 120),
          faceColor:          new Phaser.Display.Color(255, 255, 0, 255),
        });

        // Enable minigame scene shortcuts (1-9)
        if (!this.debugSceneKeysActiveListeners) {
          for (let i = 1; i <= 9; i++) {
            this.input.keyboard!.on(`keydown-${i}`, () => {
              this.scene.start(`MiniGame-${i}`);
            });
          }
          this.debugSceneKeysActiveListeners = true;
        }
      } else {
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic?.clear();
        this.physics.world.debugGraphic?.destroy();
        this.tileDebugGraphics?.destroy();
        this.tileDebugGraphics = undefined;

        // Disable minigame scene shortcuts
        if (this.debugSceneKeysActiveListeners) {
          for (let i = 1; i <= 9; i++) {
            this.input.keyboard!.off(`keydown-${i}`);
          }
          this.debugSceneKeysActiveListeners = false;
        }
      }
    });

    this.add
      .text(16, 16, `Level: ${this.level}\nESC -> Menu`, {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "14px",
        color:      "#aaaacc",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(16, 48, "C -> collision debug\n1-9 -> MiniGame (debug)", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "11px",
        color:      "#666688",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.escPauseKey = undefined;
    });

    console.log(
      `[GamePlay] Level ${this.level} -- ${map.width}x${map.height} tiles` +
      ` -- ${this.dungeonResult.dungeon.rooms.length} rooms` +
      ` -- theme: ${GameData.dungeon.defaultTheme}`
    );
  }

  update() {
    if (this.hasPlayerReachedStairs) return;

    this.playerController.update();
  }

  private openPauseMenu(): void {
    if (this.scene.isActive("PauseMenu")) {
      return;
    }
    this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
    this.scene.pause();
  }
}
