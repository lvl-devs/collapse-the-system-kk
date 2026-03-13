import Phaser from "phaser";
import { GameData } from "../../GameData";
import DungeonGenerator from "../systems/DungeonGenerator";
import type { DungeonBuildResult, DungeonWallSide } from "../systems/DungeonGenerator";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import LevelStorage from "../systems/LevelStorage";
import { DEFAULT_TILES } from "../systems/TileMapping";
import Pathfinder from "../systems/Pathfinder";
import CharacterController, { createKeyboardMovementInput } from "../entities/CharacterController";
import CameraEntity from "../entities/CameraEntity";
import ChaserEntity from "../entities/ChaserEntity";

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
  private currentLevelMusicKey?: string;
  private pausedSfxDuringPause: Phaser.Sound.BaseSound[] = [];
  private isAudioPausedForMenu = false;

  private camerasList: CameraEntity[] = [];
  private chaser!: ChaserEntity;
  private pathfinder!: Pathfinder;
  private hideKey?: Phaser.Input.Keyboard.Key;
  private barricadePrompt?: Phaser.GameObjects.Text;

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

    // Initialize Chaser
    this.chaser = new ChaserEntity(this, startX, startY, "policeman", this.playerController.sprite);

    // Initialize Cameras in other rooms
    this.camerasList = [];
    this.dungeonResult.otherRooms.forEach(room => {
      const walls: DungeonWallSide[] = ["top", "bottom", "left", "right"];
      const wall = Phaser.Utils.Array.GetRandom(walls);
      
      let tx = room.centerX;
      let ty = room.centerY;
      if (wall === "top") ty = room.top + 1;
      else if (wall === "bottom") ty = room.bottom;
      else if (wall === "left") tx = room.left;
      else if (wall === "right") tx = room.right;

      const cx = (map.tileToWorldX(tx) ?? 0) + map.tileWidth / 2;
      const cy = (map.tileToWorldY(ty) ?? 0) + map.tileHeight / 2;
      
      // Clip the beam to the full room area (walls included) so the beam apex
      // stays aligned with wall-mounted cameras and never leaks outside the room.
      const rx = (map.tileToWorldX(room.left) ?? 0);
      const ry = (map.tileToWorldY(room.top) ?? 0);
      const rw = room.width * map.tileWidth;
      const rh = room.height * map.tileHeight;
      
      const roomBounds = new Phaser.Geom.Rectangle(rx, ry, rw, rh);

      const camera = new CameraEntity(this, cx, cy, wall, roomBounds, groundLayer);
      this.camerasList.push(camera);
    });

    this.escPauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.collisionDebugKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.tileOverlayToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.escPauseKey?.on("down", this.openPauseMenu, this);

    this.hideKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.hideKey?.on("down", this.tryHide, this);

    this.pathfinder = new Pathfinder(groundLayer);

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
      .text(16, 48, "C -> collision debug  |  I -> tile indices", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "11px",
        color:      "#666688",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.barricadePrompt = this.add.text(0, 0, "Premi B per bloccare", {
      fontFamily: GameData.globals.defaultFont.key,
      fontSize: "12px",
      color: "#ffffff",
      backgroundColor: "#aa0000aa",
      padding: { x: 4, y: 2 }
    })
      .setOrigin(0.5, 1)
      .setDepth(200)
      .setVisible(false);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.resumeCurrentLevelMusic, this);
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.hideKey?.off("down", this.tryHide, this);
      this.escPauseKey = undefined;
      this.hideKey = undefined;
      this.collisionDebugKey = undefined;
      this.tileOverlayToggleKey = undefined;
      this.tileOverlayObjects.forEach(o => o.destroy());
      this.tileOverlayObjects = [];
      this.hoverInfoPanel?.destroy();
      this.hoverInfoPanel = undefined;
      this.barricadePrompt?.destroy();
      this.barricadePrompt = undefined;
      this.input.off("pointermove", this.onTileHover, this);
      this.input.off("pointerdown", this.onTileCopy, this);
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

    this.playerController.update();

    const dt = this.game.loop.delta;
    
    // Update cameras
    let detected = false;
    for (const cam of this.camerasList) {
      cam.update(dt);
      if (cam.detectsTarget(this.playerController.sprite)) {
        detected = true;
      }
    }

    // Handle detection
    if (detected && !this.chaser.active) {
      // Spawn chaser near the start of the level
      const spawnX = this.dungeonResult.startX;
      const spawnY = this.dungeonResult.startY;
      this.chaser.spawn(spawnX, spawnY, this.pathfinder);
    }

    // Update chaser
    if (this.chaser.active) {
      this.chaser.update(dt);
    }

    // Check for barricade popup
    this.checkBarricadePrompt();
  }

  private checkBarricadePrompt(): void {
    const { groundLayer } = this.dungeonResult;
    const px = this.playerController.sprite.x;
    const py = this.playerController.sprite.y;
    
    const tx = groundLayer.worldToTileX(px);
    const ty = groundLayer.worldToTileY(py);

    if (tx === null || ty === null) return;

    let canBarricade = false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = groundLayer.getTileAt(tx + dx, ty + dy);
        
        // This logic mirrors tryHide() checking
        if (tile && !tile.collides && tile.index !== 42) {
          canBarricade = true;
        } else if (tile && tile.index === 42 && !tile.collides) {
          const leftWall = groundLayer.getTileAt(tx + dx - 1, ty + dy);
          const rightWall = groundLayer.getTileAt(tx + dx + 1, ty + dy);
          if ((leftWall && rightWall && leftWall.collides && rightWall.collides) || 
              (groundLayer.getTileAt(tx + dx, ty + dy - 1)?.collides && groundLayer.getTileAt(tx + dx, ty + dy + 1)?.collides)) {
            canBarricade = true;
          }
        }
      }
    }

    if (canBarricade) {
      this.barricadePrompt?.setPosition(px, py - 20).setVisible(true);
    } else {
      this.barricadePrompt?.setVisible(false);
    }
  }

  private tryHide(): void {
    const { groundLayer } = this.dungeonResult;
    const px = this.playerController.sprite.x;
    const py = this.playerController.sprite.y;
    
    // Find nearby door tiles to block
    const tx = groundLayer.worldToTileX(px);
    const ty = groundLayer.worldToTileY(py);

    if (tx === null || ty === null) return;

    let blockedAny = false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = groundLayer.getTileAt(tx + dx, ty + dy);
        if (tile && !tile.collides && tile.index !== 42) {
          // If it's not a generic floor tile (42) and not colliding, it might be a door frame or similar
          // Let's just make it collide and maybe tint it grey to show it's barricaded
          
          // Actually, a simpler approach: check if tile is walkable and not inside the main room
          // But since any tile that is not floor(42) and not wall could be considered a gateway,
          // Let's just set collision to true and tint it dark.
          tile.setCollision(true);
          (tile as any).tint = 0x333333; // dark tint
          blockedAny = true;
        } else if (tile && tile.index === 42) {
          // It's a floor tile. To barricade, let's just create a physical barrier
          // on the ground layer if the player presses B, but let's restrict to doorways.
          // Standard door passage is usually floor (42) surrounded by walls.
          // For simplicity, ANY floor tile near player when B is pressed turns into a barricade (collidable, index=0 which is BLANK/WALL or something like 210)
          
          // Only do this if we are near walls (doorway)
          const leftWall = groundLayer.getTileAt(tx + dx - 1, ty + dy);
          const rightWall = groundLayer.getTileAt(tx + dx + 1, ty + dy);
          
          if ((leftWall && rightWall && leftWall.collides && rightWall.collides) || 
              (groundLayer.getTileAt(tx + dx, ty + dy - 1)?.collides && groundLayer.getTileAt(tx + dx, ty + dy + 1)?.collides)) {
            tile.setCollision(true);
            (tile as any).tint = 0x552222; // dark red
            blockedAny = true;
          }
        }
      }
    }

    if (blockedAny) {
      // Small visual feedback on player
      this.playerController.sprite.setTint(0x00ff00);
      this.time.delayedCall(200, () => this.playerController.sprite.clearTint());
    }
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
