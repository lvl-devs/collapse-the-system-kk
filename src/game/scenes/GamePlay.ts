import Phaser from "phaser";
import { GameData } from "../../GameData";
import DungeonGenerator from "../systems/DungeonGenerator";
import type { DungeonBuildResult } from "../systems/DungeonGenerator";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import LevelStorage from "../systems/LevelStorage";
import { DEFAULT_TILES } from "../systems/TileMapping";
import CharacterController, { createKeyboardMovementInput } from "../entities/CharacterController";

const PLAYER_SPEED = 160;

export default class GamePlay extends Phaser.Scene {
  private static readonly LEVEL_MUSIC_BY_LEVEL: Record<number, string> = {
    1: "level-1-theme",
  };

  private dungeonResult!: DungeonBuildResult;
  private playerController!: CharacterController;
  private hasPlayerReachedStairs = false;
  private currentLevel = 1;
  private debugMode = false;
  private tileDebugGraphics?: Phaser.GameObjects.Graphics;
  private tileOverlayObjects: Phaser.GameObjects.GameObject[] = [];
  private hoverInfoPanel?: Phaser.GameObjects.Text;
  private escPauseKey?: Phaser.Input.Keyboard.Key;
  private collisionDebugKey?: Phaser.Input.Keyboard.Key;
  private tileOverlayToggleKey?: Phaser.Input.Keyboard.Key;
  private tileProbeToggleKey?: Phaser.Input.Keyboard.Key;
  private currentLevelMusicKey?: string;
  private pausedSfxDuringPause: Phaser.Sound.BaseSound[] = [];
  private isAudioPausedForMenu = false;
  private tileProbeMode = false;

  constructor() {
    super({ key: "GamePlay" });
  }

  preload() {
    AssetPipeline.startDeferredPreload(this);
  }

  create() {
    this.input.keyboard?.resetKeys();

    this.currentLevel = LevelStorage.getCurrentLevel();
    this.hasPlayerReachedStairs = false;
    this.startLevelMusic(this.currentLevel);

    this.events.on(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.resumeCurrentLevelMusic, this);

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
    this.collisionDebugKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.tileOverlayToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.tileProbeToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.escPauseKey?.on("down", this.openPauseMenu, this);

    this.add
      .text(16, 16, `Level: ${this.currentLevel}\nESC -> Menu`, {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "14px",
        color:      "#aaaacc",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(16, 48, "C -> collision debug  |  I -> full tile debug  |  P -> coords (light)", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "11px",
        color:      "#666688",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.resumeCurrentLevelMusic, this);
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.escPauseKey = undefined;
      this.collisionDebugKey = undefined;
      this.tileOverlayToggleKey = undefined;
      this.tileProbeToggleKey = undefined;
      this.tileOverlayObjects.forEach(o => o.destroy());
      this.tileOverlayObjects = [];
      this.tileProbeMode = false;
      this.clearHoverPanelAndListenersIfUnused();
    });

    console.log(
      `[GamePlay] Level ${this.currentLevel} -- ${map.width}x${map.height} tiles` +
      ` -- ${this.dungeonResult.dungeon.rooms.length} rooms` +
      ` -- theme: ${GameData.dungeon.defaultTheme}`
    );
  }

  update() {
    if (this.hasPlayerReachedStairs) return;

    if (this.collisionDebugKey != null && Phaser.Input.Keyboard.JustDown(this.collisionDebugKey)) {
      this.toggleCollisionDebug();
    }

    if (this.tileOverlayToggleKey != null && Phaser.Input.Keyboard.JustDown(this.tileOverlayToggleKey)) {
      this.toggleTileIndexOverlay();
    }
    if (this.tileProbeToggleKey != null && Phaser.Input.Keyboard.JustDown(this.tileProbeToggleKey)) {
      this.toggleTileProbeMode();
    }

    this.playerController.update();
  }

  private toggleCollisionDebug(): void {
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
  }

  private toggleTileIndexOverlay(): void {
      if (this.tileOverlayObjects.length > 0) {
        this.tileOverlayObjects.forEach(o => o.destroy());
        this.tileOverlayObjects = [];
        this.clearHoverPanelAndListenersIfUnused();
        return;
      }

      // Full debug supersedes light probe mode.
      this.tileProbeMode = false;

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

      this.ensureHoverPanel();
  }

  private toggleTileProbeMode(): void {
    this.tileProbeMode = !this.tileProbeMode;

    if (this.tileProbeMode) {
      // Light mode should not render the heavy full overlay.
      if (this.tileOverlayObjects.length > 0) {
        this.tileOverlayObjects.forEach(o => o.destroy());
        this.tileOverlayObjects = [];
      }
      this.ensureHoverPanel();
      return;
    }

    this.clearHoverPanelAndListenersIfUnused();
  }

  private ensureHoverPanel(): void {
    if (!this.hoverInfoPanel) {
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
    }
    this.input.off("pointermove", this.onTileHover, this);
    this.input.off("pointerdown", this.onTileCopy, this);
    this.input.on("pointermove", this.onTileHover, this);
    this.input.on("pointerdown", this.onTileCopy, this);
  }

  private clearHoverPanelAndListenersIfUnused(): void {
    if (this.tileOverlayObjects.length > 0 || this.tileProbeMode) {
      return;
    }
    this.hoverInfoPanel?.destroy();
    this.hoverInfoPanel = undefined;
    this.input.off("pointermove", this.onTileHover, this);
    this.input.off("pointerdown", this.onTileCopy, this);
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
      `${cell(-1,-1)} ${cell(0,-1)} ${cell(1,-1)} ${cell(2,-1)}`,
      `${cell(-1, 0)} ${cell(0, 0, true)} ${cell(1, 0)} ${cell(2, 0)}`,
      `${cell(-1, 1)} ${cell(0, 1)} ${cell(1, 1)} ${cell(2, 1)}`,
      `${cell(-1, 2)} ${cell(0, 2)} ${cell(1, 2)} ${cell(2, 2)}`,
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
    this.pauseCurrentLevelAudio();
    this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
    this.scene.pause();
  }

  private startLevelMusic(level: number): void {
    const fallbackLevel = 1;
    const musicKey = GamePlay.LEVEL_MUSIC_BY_LEVEL[level] ?? GamePlay.LEVEL_MUSIC_BY_LEVEL[fallbackLevel];
    if (!musicKey) {
      this.currentLevelMusicKey = undefined;
      return;
    }

    this.currentLevelMusicKey = musicKey;

    MusicManager.startForScene(this, musicKey, {
      loop: true,
      volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6),
    });
  }

  private pauseCurrentLevelAudio(): void {
    if (this.isAudioPausedForMenu) {
      return;
    }

    this.isAudioPausedForMenu = true;

    if (!this.currentLevelMusicKey) {
      this.pauseActiveSfx();
      return;
    }

    MusicManager.pause(this, this.currentLevelMusicKey);
    this.pauseActiveSfx();
  }

  private resumeCurrentLevelMusic(): void {
    if (!this.isAudioPausedForMenu) {
      return;
    }

    this.isAudioPausedForMenu = false;

    if (!this.currentLevelMusicKey) {
      this.startLevelMusic(this.currentLevel);
    } else {
      MusicManager.resume(this, this.currentLevelMusicKey, {
        loop: true,
        volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6),
      });
    }

    this.resumePausedSfx();
  }

  private pauseActiveSfx(): void {
    this.pausedSfxDuringPause = [];
    const sounds = ((this.sound as unknown as { sounds?: Phaser.Sound.BaseSound[] }).sounds ?? []);

    sounds.forEach((sound) => {
      const soundAny = sound as any;
      const key = soundAny.key as string | undefined;
      if (key != null && key === this.currentLevelMusicKey) {
        return;
      }
      if (soundAny.isPlaying) {
        sound.pause();
        this.pausedSfxDuringPause.push(sound);
      }
    });
  }

  private resumePausedSfx(): void {
    this.pausedSfxDuringPause.forEach((sound) => {
      const soundAny = sound as any;
      if (soundAny.isPaused) {
        sound.resume();
      }
    });
    this.pausedSfxDuringPause = [];
  }
}
