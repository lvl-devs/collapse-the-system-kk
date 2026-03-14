import Phaser from "phaser";

export default class GamePlay extends Phaser.Scene {

  private canOpenPause = true;

  constructor() {
    super("GamePlay");
  }

  create() {

    this.canOpenPause = true;

    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, "GAMEPLAY\nPress ESC to pause\nPress E for MiniGame", {
        fontFamily: "Pixelify Sans",
        fontSize: "58px",
        color: "#70fdc2",
        align: "center",
      })
      .setOrigin(0.5);


    // -------- ESC (PAUSE MENU) --------

    const onEscPress = () => {
      console.log("[GamePlay] ESC pressed");

      if (!this.canOpenPause) {
        return;
      }

      this.canOpenPause = false;

      if (this.scene.isSleeping("PauseMenu")) {
        this.scene.wake("PauseMenu", { parentSceneKey: this.scene.key });
      } else {
        this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
      }

      this.scene.pause();
    };


    // -------- E (MINIGAME) --------

    const onEPress = () => {
      console.log("[GamePlay] Opening MiniGame");

      this.scene.start("MiniGame4"); // cambia scena completamente
    };


    // -------- RESUME --------

    const onResume = () => {
      console.log("[GamePlay] resumed");
      this.canOpenPause = true;
      this.input.keyboard?.resetKeys();
    };


    // -------- CONTROLLI --------

    this.input.keyboard?.on("keydown-ESC", onEscPress);
    this.input.keyboard?.on("keydown-E", onEPress);

    this.events.on(Phaser.Scenes.Events.RESUME, onResume);


    // -------- CLEANUP --------

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {

      this.input.keyboard?.off("keydown-ESC", onEscPress);
      this.input.keyboard?.off("keydown-E", onEPress);
  private configureDoorInteractions(
    map: Phaser.Tilemaps.Tilemap,
    layers: Phaser.Tilemaps.TilemapLayer[],
  ): void {
    const doorTileset = map.tilesets.find((tileset) => tileset.name.toLowerCase() === "doors");
    if (!doorTileset) {
      this.doorLayers = [];
      this.closedToOpenDoorIndex.clear();
      return;
    }

    const firstgid = doorTileset.firstgid;
    const closedToOpen = new Map<number, number>([
      [firstgid + 0, firstgid + 1],
      [firstgid + 2, firstgid + 1],
      [firstgid + 3, firstgid + 4],
      [firstgid + 5, firstgid + 6],
    ]);

    const closedIndices = Array.from(closedToOpen.keys());
    const openIndices = Array.from(new Set(closedToOpen.values()));

    this.closedToOpenDoorIndex = closedToOpen;
    this.doorLayers = layers.filter((layer) => layer.layer.name.toLowerCase().includes("door"));

    this.doorLayers.forEach((layer) => {
      layer.setCollision(closedIndices, true, true);
      layer.setCollision(openIndices, false, true);
    });
  }

  private tryOpenNearbyDoor(): void {
    if (
      (this.doorLayers.length === 0 || this.closedToOpenDoorIndex.size === 0)
      && this.doorObjectEntries.length === 0
    ) {
      return;
    }

    const nearbyDoor = this.findNearestClosedDoorCandidate();
    if (!nearbyDoor) {
      return;
    }

    if (nearbyDoor.kind === "object") {
      nearbyDoor.entry.sprite.setTexture(nearbyDoor.entry.openTextureKey);
      const body = nearbyDoor.entry.sprite.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) {
        body.enable = false;
      }
      return;
    }

    const nextIndex = this.closedToOpenDoorIndex.get(nearbyDoor.tile.index);
    if (nextIndex == null) {
      return;
    }

    nearbyDoor.layer.putTileAt(nextIndex, nearbyDoor.tile.x, nearbyDoor.tile.y, true);

    const updatedTile = nearbyDoor.layer.getTileAt(nearbyDoor.tile.x, nearbyDoor.tile.y, true);
    if (updatedTile) {
      updatedTile.setCollision(false, false, false, false);
    }

    nearbyDoor.layer.calculateFacesWithin(nearbyDoor.tile.x, nearbyDoor.tile.y, 1, 1);
  }

  private findNearestClosedDoorCandidate():
    | {
        kind: "tile";
        layer: Phaser.Tilemaps.TilemapLayer;
        tile: Phaser.Tilemaps.Tile;
        distance: number;
      }
    | {
        kind: "object";
        entry: { sprite: Phaser.GameObjects.Sprite; openTextureKey: string };
        distance: number;
      }
    | undefined {
    const player = this.playerController.sprite;
    let bestTileCandidate:
      | {
          kind: "tile";
          layer: Phaser.Tilemaps.TilemapLayer;
          tile: Phaser.Tilemaps.Tile;
          distance: number;
        }
      | undefined;

    this.doorLayers.forEach((layer) => {
      layer.forEachTile((tile) => {
        if (!this.closedToOpenDoorIndex.has(tile.index)) {
          return;
        }

        const distance = Phaser.Math.Distance.Between(player.x, player.y, tile.getCenterX(), tile.getCenterY());
        if (distance > DOOR_INTERACT_DISTANCE) {
          return;
        }

        if (!bestTileCandidate || distance < bestTileCandidate.distance) {
          bestTileCandidate = { kind: "tile", layer, tile, distance };
        }
      });
    });

    let bestObjectCandidate:
      | {
          kind: "object";
          entry: { sprite: Phaser.GameObjects.Sprite; openTextureKey: string };
          distance: number;
        }
      | undefined;

    this.doorObjectEntries.forEach((entry) => {
      const body = entry.sprite.body as Phaser.Physics.Arcade.Body | undefined;
      const isStillClosed = body != null && body.enable;
      if (!isStillClosed) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(player.x, player.y, entry.sprite.x, entry.sprite.y);
      if (distance > DOOR_INTERACT_DISTANCE) {
        return;
      }

      if (!bestObjectCandidate || distance < bestObjectCandidate.distance) {
        bestObjectCandidate = { kind: "object", entry, distance };
      }
    });

    if (!bestTileCandidate) {
      return bestObjectCandidate;
    }

    if (!bestObjectCandidate) {
      return bestTileCandidate;
    }

    return bestObjectCandidate.distance < bestTileCandidate.distance ? bestObjectCandidate : bestTileCandidate;
  }

  private updateDoorHintPopup(): void {
    if (!this.doorHintText || !this.playerController) {
      return;
    }

    const nearbyDoor = this.findNearestClosedDoorCandidate();
    if (!nearbyDoor) {
      this.doorHintText.setVisible(false);
      return;
    }

    this.doorHintText.setVisible(true);
    // Position popup over player's head
    this.doorHintText.setPosition(this.playerController.sprite.x, this.playerController.sprite.y - 45);
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
      "doors": "door-closed",
    };

    const mapData = MapProcessor.processMap(this, "static-map", TS_MAP);
    const { map, layers, rawObjectLayers, spawnX, spawnY, minX, minY, maxX, maxY } = mapData;

    this.configureDoorInteractions(map, layers);
    this.doorObjectEntries = [];

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
                  textureKey = this.resolveTextureKeyFromImage(imageName, textureKey);
                    // console.log(`[Mapping Debug] imageName: ${imageName} -> textureKey: ${textureKey}`);
                } else {
                    frame = this.getOrCreateTilesetFrame(textureKey, tileset, localId);
                }

                if (this.textures.exists(textureKey)) {
                    const sprite = this.add.sprite(obj.x!, obj.y!, textureKey, frame);
                    sprite.setOrigin(0, 1);
                    sprite.setFlip(flipX, flipY);

                    const objectDoorOpenTexture = DOOR_OBJECT_OPEN_BY_CLOSED[textureKey];
                    if (objectDoorOpenTexture && this.textures.exists(objectDoorOpenTexture)) {
                      this.doorObjectEntries.push({ sprite, openTextureKey: objectDoorOpenTexture });
                    }
                    
                    // console.log(`[Object Spawned] ${textureKey} at (${obj.x}, ${obj.y})`);

                    // Gestione depth e collisioni dinamiche
                    sprite.setDepth(OBJECT_TOP_DEPTH);
                    const hasCollision = objectDoorOpenTexture != null || MapProcessor.getProperty(obj, "collision") !== false;
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
    this.cameras.main.setZoom(1.1);


    this.escPauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.collisionDebugKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.doorInteractKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.escPauseKey?.on("down", this.openPauseMenu, this);

    this.doorHintText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height - 72, DOOR_HINT_TEXT, {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize: "24px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 12, y: 6 },
      })
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setDepth(1001)
      .setVisible(false);

    this.add
      .text(100, 75, "Agency", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize: "35px",
        color: "#fff",
        backgroundColor: "#00000020",
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
      this.doorInteractKey = undefined;
      this.doorLayers = [];
      this.closedToOpenDoorIndex.clear();
      this.doorObjectEntries = [];
      this.doorHintText?.destroy();
      this.doorHintText = undefined;
      this.tileDebugGraphics?.destroy();
      this.stopStepSfx();
    });

    console.log(
      `[GamePlay] Level ${this.currentLevel}`
    );
  }

      this.events.off(Phaser.Scenes.Events.RESUME, onResume);

    });

  }

    if (this.collisionDebugKey != null && Phaser.Input.Keyboard.JustDown(this.collisionDebugKey)) {
      this.toggleCollisionDebug();
    }

    this.updateDoorHintPopup();

    if (this.doorInteractKey != null && Phaser.Input.Keyboard.JustDown(this.doorInteractKey)) {
      this.tryOpenNearbyDoor();
      this.updateDoorHintPopup();
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
