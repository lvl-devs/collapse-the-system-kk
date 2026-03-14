import Phaser from "phaser";
import { GameData } from "../../GameData";
import MapProcessor from "../systems/MapProcessor";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import SfxManager from "../audio/SfxManager";
import LevelStorage from "../systems/LevelStorage";
import CharacterController, { createKeyboardMovementInput } from "../entities/CharacterController";

const PLAYER_SPEED = 250;
const STEP_SFX_KEY = "step-sfx";
const STEP_SFX_RATE = 1.1;

export default class GamePlay extends Phaser.Scene {
  private static readonly LEVEL_MUSIC_BY_LEVEL: Record<number, string> = {
    1: "level-1-theme",
  };

  private playerController!: CharacterController;
  private hasPlayerReachedStairs = false;
  private currentLevel = 1;
  private escPauseKey?: Phaser.Input.Keyboard.Key;
  private collisionDebugKey?: Phaser.Input.Keyboard.Key;
  private debugMode = false;
  private tileDebugGraphics?: Phaser.GameObjects.Graphics;
  private currentLevelMusicKey?: string;
  private pausedSfxDuringPause: Phaser.Sound.BaseSound[] = [];
  private isAudioPausedForMenu = false;
  private isStepSfxPlaying = false;

  private getOrCreateTilesetFrame(
    textureKey: string,
    tileset: Phaser.Tilemaps.Tileset,
    localTileId: number,
  ): string | undefined {
    const texture = this.textures.get(textureKey);
    if (!texture) {
      return undefined;
    }

    const frameName = `tileset-${tileset.name}-${localTileId}`;
    if (texture.has(frameName)) {
      return frameName;
    }

    const image = texture.getSourceImage() as HTMLImageElement | undefined;
    if (!image || image.width <= 0 || image.height <= 0) {
      return undefined;
    }

    const tileWidth = tileset.tileWidth;
    const tileHeight = tileset.tileHeight;
    const margin = (tileset as any).tileMargin ?? (tileset as any).margin ?? 0;
    const spacing = (tileset as any).tileSpacing ?? (tileset as any).spacing ?? 0;
    const computedColumns = Math.max(1, Math.floor((image.width - margin * 2 + spacing) / (tileWidth + spacing)));
    const columns = (tileset as any).columns ?? computedColumns;
    const col = localTileId % columns;
    const row = Math.floor(localTileId / columns);
    const frameX = margin + col * (tileWidth + spacing);
    const frameY = margin + row * (tileHeight + spacing);

    texture.add(frameName, 0, frameX, frameY, tileWidth, tileHeight);
    return frameName;
  }

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

    // Mappatura tileset standard (opzionale, MapProcessor prova a indovinare)
    // Mappatura tileset standard
    const TS_MAP: Record<string, string> = {
      "home": "tileset-cyber",
      "airport": "airport",
    };

    const mapData = MapProcessor.processMap(this, "static-map", TS_MAP);
    const { map, layers, rawObjectLayers, spawnX, spawnY, minX, minY, maxX, maxY } = mapData;

    console.log(`[Spawn Debug] Bounds: [${minX}, ${minY}] to [${maxX}, ${maxY}]`);
    console.log(`[Spawn Debug] Spawn finale: (${spawnX}, ${spawnY})`);

    const playerInput = createKeyboardMovementInput(this);
    this.playerController = new CharacterController({
      scene: this,
      x: spawnX, 
      y: spawnY,
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

    // --- RENDERING OGGETTI E COLLISIONI ---
    rawObjectLayers.forEach(layer => {
      // console.log(`[Object Layer] Processing layer: ${layer.name}`);
      layer.objects.forEach((obj: any) => {
        // Logica versatile per gli oggetti:
        // Se ha un GID (è un tile object), proviamo a renderizzarlo
        if (obj.gid) {
            const gid = obj.gid & 0x1FFFFFFF; // Clear Tiled flip bits
            const flipX = (obj.gid & 0x80000000) !== 0;
            const flipY = (obj.gid & 0x40000000) !== 0;

            // Cerchiamo il nome della texture associata al tileset del GID
            const sortedTilesets = [...map.tilesets].sort((a,b) => b.firstgid - a.firstgid);
            const tileset = sortedTilesets.find(t => t.firstgid <= gid);
            if (tileset) {
                // Per i "collection of images" tilesets, dobbiamo trovare la texture specifica
                let textureKey = TS_MAP[tileset.name] || tileset.name;
                let frame: string | undefined;
                
                const localId = gid - tileset.firstgid;

                let imageName: string | undefined;
                
                // Fetch raw tileset data directly from the Tiled JSON cache to bypass Phaser parsing flaws
                const rawMapData = this.cache.tilemap.get("static-map")?.data;
                const rawTileset = rawMapData?.tilesets?.find((rt: any) => rt.name === tileset.name);
                
                if (rawTileset && Array.isArray(rawTileset.tiles)) {
                    const tileObj = rawTileset.tiles.find((t: any) => t.id === localId);
                    if (tileObj && tileObj.image) {
                        imageName = tileObj.image;
                    }
                }
                // Fallback to Phaser parsing if raw mapping lacks it
                if (!imageName) {
                    const tileData = (tileset as any).tileData;
                    if (tileData && tileData[localId] && tileData[localId].image) {
                        imageName = tileData[localId].image;
                    } else if ((tileset as any).customData && (tileset as any).customData[localId] && ((tileset as any).customData[localId] as any).image) {
                        imageName = ((tileset as any).customData[localId] as any).image;
                    }
                }

                if (imageName) {
                    // Estraiamo il nome del file senza estensione e cartella come fallback per la chiave
                    const parts = imageName.split(/[/\\]/);
                    textureKey = parts[parts.length - 1].split('.')[0];
                    // console.log(`[Mapping Debug] imageName: ${imageName} -> textureKey: ${textureKey}`);
                } else {
                    frame = this.getOrCreateTilesetFrame(textureKey, tileset, localId);
                }

                if (this.textures.exists(textureKey)) {
                    const sprite = this.add.sprite(obj.x!, obj.y!, textureKey, frame);
                    sprite.setOrigin(0, 1);
                    sprite.setFlip(flipX, flipY);
                    
                    // console.log(`[Object Spawned] ${textureKey} at (${obj.x}, ${obj.y})`);

                    // Gestione depth e collisioni dinamiche
                    const depth = MapProcessor.getProperty(obj, "depth") || 5;
                    sprite.setDepth(depth);
                    const hasCollision = MapProcessor.getProperty(obj, "collision") !== false;
                    if (hasCollision) {
                        this.physics.add.existing(sprite, false);
                        if (sprite.body) {
                          const body = sprite.body as Phaser.Physics.Arcade.Body;
                          body.setSize(sprite.width, sprite.height / 2);
                          body.setOffset(0, sprite.height / 2);
                          body.setImmovable(true);
                          body.setAllowGravity(false);
                          body.moves = false;
                        }
                        this.physics.add.collider(this.playerController.sprite, sprite);
                    }
                } else {
                    console.warn(`[Object Warning] Missing texture: ${textureKey} for GID ${gid}`);
                }
            } else {
                console.warn(`[Object Warning] No tileset found for GID ${gid}`);
            }
        }
      });
    });

    // Collisioni su tutti i layer base processati
    layers.forEach(l => this.physics.add.collider(this.playerController.sprite, l));

    this.cameras.main.setBounds(minX, minY, maxX - minX, maxY - minY);
    this.physics.world.setBounds(minX, minY, maxX - minX, maxY - minY);
    this.cameras.main.startFollow(this.playerController.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.3);
    this.cameras.main.setBackgroundColor("#000000");


    this.escPauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.collisionDebugKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.escPauseKey?.on("down", this.openPauseMenu, this);

    this.add
      .text(16, 16, `Level: ${this.currentLevel}\nESC -> Menu | C -> Debug Collisioni`, {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize: "14px",
        color: "#aaaacc",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.resumeCurrentLevelMusic, this);
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.escPauseKey = undefined;
      this.collisionDebugKey = undefined;
      this.tileDebugGraphics?.destroy();
      this.stopStepSfx();
    });

    console.log(
      `[GamePlay] Level ${this.currentLevel}`
    );
  }

  update() {
    if (this.hasPlayerReachedStairs) return;

    if (this.collisionDebugKey != null && Phaser.Input.Keyboard.JustDown(this.collisionDebugKey)) {
      this.toggleCollisionDebug();
    }

    this.playerController.update();
    this.updateStepSfx();
  }

  private toggleCollisionDebug(): void {
    this.debugMode = !this.debugMode;
    
    // Trova tutti i layer dinamicamente
    const currentLayers = this.children.list.filter(c => c instanceof Phaser.Tilemaps.TilemapLayer) as Phaser.Tilemaps.TilemapLayer[];

    if (this.debugMode) {
      this.physics.world.drawDebug = true;
      this.physics.world.createDebugGraphic();
      
      if (!this.tileDebugGraphics) {
          this.tileDebugGraphics = this.add.graphics().setDepth(50);
      } else {
          this.tileDebugGraphics.clear();
      }

      currentLayers.forEach((layer, i) => {
        // Cambiamo i colori in base all'indice per distinguerli
        const rHue = (100 * (i + 1)) % 255;
        const gHue = (50 * (i + 1)) % 255;
        const bHue = (150 * (i + 1)) % 255;

        layer.renderDebug(this.tileDebugGraphics!, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(rHue, gHue, bHue, 120),
          faceColor: new Phaser.Display.Color(255, 120, 0, 255),
        });
      });
    } else {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
      this.physics.world.debugGraphic?.destroy();
      this.tileDebugGraphics?.clear();
      this.tileDebugGraphics?.destroy();
      this.tileDebugGraphics = undefined;
    }
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

  private updateStepSfx(): void {
    const body = this.playerController.sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (!body) {
      this.stopStepSfx();
      return;
    }

    const isMoving = body.velocity.lengthSq() > 0;
    if (isMoving) {
      if (this.isStepSfxPlaying) {
        return;
      }

      const sound = SfxManager.start(this, STEP_SFX_KEY, {
        loop: true,
        volume: GameData.sfxVolume ?? 0.7,
        rate: STEP_SFX_RATE,
      });
      this.isStepSfxPlaying = Boolean(sound);
      return;
    }

    this.stopStepSfx();
  }

  private stopStepSfx(): void {
    if (!this.isStepSfxPlaying) {
      return;
    }

    SfxManager.stop(this, STEP_SFX_KEY);
    this.isStepSfxPlaying = false;
  }
}
