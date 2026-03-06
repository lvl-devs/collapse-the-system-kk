import Phaser from "phaser";
import { GameData } from "../../GameData";
import DungeonGenerator from "../systems/DungeonGenerator";
import type { DungeonBuildResult } from "../systems/DungeonGenerator";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import { DEFAULT_TILES } from "../systems/TileMapping";

const PLAYER_SPEED = 160;

export default class GamePlay extends Phaser.Scene {
  private dungeonResult!: DungeonBuildResult;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private hasPlayerReachedStairs = false;
  private level = 0;
  private debugMode = false;
  private tileDebugGraphics?: Phaser.GameObjects.Graphics;
  private lastDirection: "up" | "down" | "left" | "right" = "down";

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

    // Create player sprite with hacker spritesheet
    this.player = this.physics.add.sprite(startX, startY, "hacker", 0);
    this.player.setDepth(10);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(true);

    // Create animations
    this.anims.create({
      key: "walk-down",
      frames: this.anims.generateFrameNumbers("hacker", { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "walk-left",
      frames: this.anims.generateFrameNumbers("hacker", { start: 3, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "walk-right",
      frames: this.anims.generateFrameNumbers("hacker", { start: 6, end: 8 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "walk-up",
      frames: this.anims.generateFrameNumbers("hacker", { start: 9, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });

    // Set idle frame based on starting direction
    this.player.setFrame(0);

    this.physics.add.collider(this.player, groundLayer);
    this.physics.add.collider(this.player, stuffLayer);

    // Stairs callback: restart scene on next level
    stuffLayer.setTileIndexCallback(DEFAULT_TILES.STAIRS, () => {
      stuffLayer.setTileIndexCallback(DEFAULT_TILES.STAIRS, () => {}, this);
      this.hasPlayerReachedStairs = true;
      this.player.setVelocity(0, 0);

      const cam = this.cameras.main;
      cam.fade(300, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => {
        this.scene.restart();
      });
    }, this);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.input.keyboard!.once("keydown-ESC", () => {
      MusicManager.stop(this, "game-theme");
      this.scene.start("Menu");
    });

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
      } else {
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic?.clear();
        this.physics.world.debugGraphic?.destroy();
        this.tileDebugGraphics?.destroy();
        this.tileDebugGraphics = undefined;
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
      .text(16, 48, "C -> collision debug", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "11px",
        color:      "#666688",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    console.log(
      `[GamePlay] Level ${this.level} -- ${map.width}x${map.height} tiles` +
      ` -- ${this.dungeonResult.dungeon.rooms.length} rooms` +
      ` -- theme: ${GameData.dungeon.defaultTheme}`
    );
  }

  update() {
    if (this.hasPlayerReachedStairs) return;

    const left = this.wasd.left.isDown || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up = this.wasd.up.isDown || this.cursors.up.isDown;
    const down = this.wasd.down.isDown || this.cursors.down.isDown;

    const vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
    const vy = up ? -PLAYER_SPEED : down ? PLAYER_SPEED : 0;

    this.player.setVelocity(vx, vy);

    // Handle animations based on movement direction
    if (vx !== 0 || vy !== 0) {
      // Prioritize vertical movement, then horizontal
      if (vy < 0) {
        this.player.play("walk-up", true);
        this.lastDirection = "up";
      } else if (vy > 0) {
        this.player.play("walk-down", true);
        this.lastDirection = "down";
      } else if (vx < 0) {
        this.player.play("walk-left", true);
        this.lastDirection = "left";
      } else if (vx > 0) {
        this.player.play("walk-right", true);
        this.lastDirection = "right";
      }
    } else {
      // Idle: stop animation and show first frame of last direction
      this.player.stop();
      const idleFrames = {
        up:    9,
        down:  0,
        left:  3,
        right: 6,
      };
      this.player.setFrame(idleFrames[this.lastDirection]);
    }
  }
}