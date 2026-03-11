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
  private tileOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private hoverInfoPanel?: Phaser.GameObjects.Text;
  private escPauseKey?: Phaser.Input.Keyboard.Key;

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
      .text(16, 48, "C -> collision debug  |  D -> tile indices", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "11px",
        color:      "#666688",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // D -> tile index overlay
    this.input.keyboard!.on("keydown-D", () => {
      if (this.tileOverlayObjects.length > 0) {
        this.tileOverlayObjects.forEach(o => o.destroy());
        this.tileOverlayObjects = [];
        this.hoverInfoPanel?.destroy();
        this.hoverInfoPanel = undefined;
        this.input.off("pointermove", this.onTileHover, this);
        this.input.off("pointerdown", this.onTileCopy, this);
        return;
      }

      const { groundLayer, stuffLayer } = this.dungeonResult;
      const ts = groundLayer.tileset[0].tileWidth;

      const tileGroupColor = (idx: number): number => {
        if (idx === 2 || idx === 3 || idx === 4)              return 0xff6600; // top wall cap
        if (idx === 23 || idx === 24 || idx === 25)           return 0xaaaadd; // top wall body
        if (idx >= 42 && idx <= 46)                           return 0x2266bb; // floor
        if (idx === 85 || idx === 86 || idx === 87)           return 0x00ffaa; // cap row angoli
        if (idx === 105 || idx === 106 || idx === 108 || idx === 109) return 0xff44ff; // door frame top
        if (idx === 126 || idx === 130)                       return 0x4499ff; // side walls
        if (idx === 147 || idx === 148 || idx === 150 || idx === 151) return 0xffee00; // door frame bottom
        if (idx === 169 || idx === 170 || idx === 171)        return 0xff3333; // bottom wall
        if (idx === 124)                                       return 0xffaa00; // stairs
        return 0xffffff;
      };

      const g = this.add.graphics().setDepth(59);
      this.tileOverlayObjects.push(g);

      groundLayer.forEachTile((tile) => {
        if (tile.index < 0) return;
        const wx = tile.pixelX;
        const wy = tile.pixelY;
        const color = tileGroupColor(tile.index);
        g.fillStyle(color, 0.25);
        g.fillRect(wx, wy, ts, ts);
        g.lineStyle(1, color, 0.55);
        g.strokeRect(wx, wy, ts, ts);
        const t = this.add.text(wx + 1, wy + 1, String(tile.index), {
          fontSize: "8px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        }).setDepth(61);
        this.tileOverlayObjects.push(t);
      });

      stuffLayer.forEachTile((tile) => {
        if (tile.index < 0) return;
        const wx = tile.pixelX;
        const wy = tile.pixelY;
        const t = this.add.text(wx + 1, wy + 11, String(tile.index), {
          fontSize: "8px",
          color: "#ffff44",
          stroke: "#000000",
          strokeThickness: 2,
        }).setDepth(61);
        this.tileOverlayObjects.push(t);
      });

      // Pannello hover fisso in basso a sinistra
      this.hoverInfoPanel = this.add.text(8, this.scale.height - 8, "— hover su un tile —", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#00ffaa",
        backgroundColor: "#000000cc",
        padding: { x: 8, y: 4 },
      })
        .setScrollFactor(0)
        .setDepth(200)
        .setOrigin(0, 1);

      this.input.on("pointermove", this.onTileHover, this);
      this.input.on("pointerdown", this.onTileCopy, this);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.escPauseKey = undefined;
      this.tileOverlayObjects.forEach(o => o.destroy());
      this.tileOverlayObjects = [];
      this.hoverInfoPanel?.destroy();
      this.hoverInfoPanel = undefined;
      this.input.off("pointermove", this.onTileHover, this);
      this.input.off("pointerdown", this.onTileCopy, this);
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

  private onTileHover(pointer: Phaser.Input.Pointer): void {
    if (!this.hoverInfoPanel) return;
    const { groundLayer, stuffLayer } = this.dungeonResult;
    const worldX = pointer.worldX;
    const worldY = pointer.worldY;

    const gt = groundLayer.getTileAtWorldXY(worldX, worldY);
    const st = stuffLayer.getTileAtWorldXY(worldX, worldY);

    const tileX = gt ? gt.x : Math.floor(worldX / groundLayer.tileset[0].tileWidth);
    const tileY = gt ? gt.y : Math.floor(worldY / groundLayer.tileset[0].tileHeight);

    const sIdx = st && st.index >= 0 ? String(st.index) : "—";

    const cell = (dx: number, dy: number, center = false): string => {
      const t = groundLayer.getTileAt(tileX + dx, tileY + dy);
      const idx = t && t.index >= 0 ? String(t.index) : "·";
      const padded = idx.padStart(3);
      return center ? `[${padded}]` : ` ${padded} `;
    };

    this.hoverInfoPanel.setText([
      `grid (${tileX}, ${tileY})   stuff: [${sIdx}]`,
      `${cell(-1,-1)} ${cell(0,-1)} ${cell(1,-1)}`,
      `${cell(-1, 0)} ${cell(0, 0, true)} ${cell(1, 0)}`,
      `${cell(-1, 1)} ${cell(0, 1)} ${cell(1, 1)}`,
    ].join("\n"));
  }

  private onTileCopy(): void {
    if (!this.hoverInfoPanel) return;
    const text = this.hoverInfoPanel.text;
    navigator.clipboard?.writeText(text).catch(() => {});
    const prev = this.hoverInfoPanel.style.color;
    this.hoverInfoPanel.setColor("#ffffff").setBackgroundColor("#007700cc");
    this.time.delayedCall(600, () => {
      this.hoverInfoPanel?.setColor(prev).setBackgroundColor("#000000cc");
    });
  }

  private openPauseMenu(): void {
    if (this.scene.isActive("PauseMenu")) {
      return;
    }
    this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
    this.scene.pause();
  }
}
