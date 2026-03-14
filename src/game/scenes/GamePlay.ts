import Phaser from "phaser";
import { GameData } from "../../GameData";
import MapProcessor from "../systems/MapProcessor";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import SfxManager from "../audio/SfxManager";
import LevelStorage from "../systems/LevelStorage";
import CharacterController, { createKeyboardMovementInput } from "../entities/CharacterController";

const PLAYER_SPEED = 125;
const STEP_SFX_KEY = "step-sfx";
const STEP_SFX_RATE = 1.1;
const OBJECT_TOP_DEPTH = 1000;
const DOOR_INTERACT_DISTANCE = 72;
const DOOR_HINT_TEXT = "Premi B per aprire";
const DOOR_OBJECT_OPEN_BY_CLOSED: Record<string, string> = {
  "door": "door-open",
  "door-closed": "door-open",
  "left-side-doors-closed": "left-side-doors-open",
  "right-side-doors-closed": "right-side-doors-open",
  "left-side-door-closed": "left-side-door-open",
  "right-side-door-closed": "right-side-door-open",
};

export default class GamePlay extends Phaser.Scene {
  private static readonly LEVEL_MUSIC_BY_LEVEL: Record<number, string> = {
    1: "level-1-theme",
  };

  private static readonly LORE_SCENE_BY_LEVEL: Array<{ level: number; sceneKey: string }> = [
    { level: 4, sceneKey: "Scene1" },
    { level: 7, sceneKey: "Scene2" },
    { level: 9, sceneKey: "Scene3" },
  ];

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
  private doorInteractKey?: Phaser.Input.Keyboard.Key;
  private doorLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private closedToOpenDoorIndex = new Map<number, number>();
  private doorObjectEntries: Array<{ sprite: Phaser.GameObjects.Sprite; openTextureKey: string }> = [];
  private doorHintText?: Phaser.GameObjects.Text;
  private doorCollisionZones = new Map<string, Phaser.GameObjects.Zone>();
  private interactKey?: Phaser.Input.Keyboard.Key;
  private interactHintText?: Phaser.GameObjects.Text;
  private interactables: Array<{ target: { x: number, y: number }, type: string }> = [];
  private numberKeys: Record<string, Phaser.Input.Keyboard.Key> = {};

  private resolveTextureKeyFromImage(imageName: string, fallbackKey: string): string {
    const fileName = imageName.split(/[/\\]/).pop() ?? "";
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const normalized = baseName.replace(/_/g, "-").toLowerCase();

    const aliasMap: Record<string, string> = {
      "left-side-door-closed": "left-side-doors-closed",
      "left-side-door-open": "left-side-doors-open",
      "right-side-door-closed": "right-side-doors-closed",
      "right-side-door-open": "right-side-doors-open",
    };

    const candidate = aliasMap[normalized] ?? normalized;
    if (this.textures.exists(candidate)) {
      return candidate;
    }

    if (this.textures.exists(baseName)) {
      return baseName;
    }

    return fallbackKey;
  }

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

  private syncCurrentLevelFromStorage(): void {
    this.currentLevel = LevelStorage.getCurrentLevel();
  }

  private getPendingLoreSceneKey(level: number): string | undefined {
    const sortedMilestones = [...GamePlay.LORE_SCENE_BY_LEVEL].sort((a, b) => a.level - b.level);
    const pending = sortedMilestones.find(
      ({ level: threshold, sceneKey }) => level >= threshold && !LevelStorage.hasSeenLoreScene(sceneKey)
    );
    return pending?.sceneKey;
  }

  private startPendingLoreSceneIfNeeded(): boolean {
    const loreScene = this.getPendingLoreSceneKey(this.currentLevel);
    if (!loreScene) {
      return false;
    }

    LevelStorage.markLoreSceneSeen(loreScene);
    this.stopStepSfx();
    if (this.currentLevelMusicKey) {
      MusicManager.stop(this, this.currentLevelMusicKey);
    }
    this.scene.start(loreScene);
    return true;
  }

  private handleSceneResume(): void {
    this.syncCurrentLevelFromStorage();
    if (this.startPendingLoreSceneIfNeeded()) {
      return;
    }
    this.resumeCurrentLevelMusic();
  }

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

    // Ensure previous collision zones are cleaned up if re-configured
    this.doorCollisionZones.forEach(zone => zone.destroy());
    this.doorCollisionZones.clear();

    const frontDoorClosedIndices = [firstgid + 0, firstgid + 2];
    const sideDoorClosedIndices = [firstgid + 3, firstgid + 5];

    this.doorLayers.forEach((layer) => {
      layer.setCollision(closedIndices, true, true);
      layer.setCollision(openIndices, false, true);

      layer.forEachTile((tile) => {
        if (!closedIndices.includes(tile.index)) return;

        let width = 32;
        let height = 32;
        let offsetX = 16;
        let offsetY = 16;

        if (frontDoorClosedIndices.includes(tile.index)) {
          width = 64;
          height = 64;
          offsetX = 32;
          offsetY = 0; // Center is bottom-left pixelY + 32, but Zone origin naturally pushes it correctly
        } else if (sideDoorClosedIndices.includes(tile.index)) {
          width = 32;
          height = 64;
          offsetX = 16;
          offsetY = 0;
        } else {
          return;
        }

        const zone = this.add.zone(tile.pixelX + offsetX, tile.pixelY + offsetY, width, height);
        this.physics.add.existing(zone, true);
        this.physics.add.collider(this.playerController!.sprite, zone);
        this.doorCollisionZones.set(`${tile.x},${tile.y}`, zone);
      });
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

    const zone = this.doorCollisionZones.get(`${nearbyDoor.tile.x},${nearbyDoor.tile.y}`);
    if (zone && zone.body) {
      (zone.body as Phaser.Physics.Arcade.Body).enable = false;
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

  private getNearbyInteractable(): { target: { x: number, y: number }, type: string } | undefined {
    if (!this.playerController) return undefined;
    let bestCandidate: { target: { x: number, y: number }, type: string } | undefined = undefined;
    let bestDist = Infinity;
    const player = this.playerController.sprite;
    this.interactables.forEach(item => {
       const distance = Phaser.Math.Distance.Between(player.x, player.y, item.target.x, item.target.y);
       if (distance <= DOOR_INTERACT_DISTANCE && distance < bestDist) {
          bestDist = distance;
          bestCandidate = item;
       }
    });
    return bestCandidate;
  }

  private updateInteractHintPopup(): void {
    if (!this.interactHintText || !this.playerController) {
      return;
    }

    const nearby = this.getNearbyInteractable();
    if (!nearby) {
      this.interactHintText.setVisible(false);
      return;
    }

    this.interactHintText.setVisible(true);
    this.interactHintText.setPosition(this.playerController.sprite.x, this.playerController.sprite.y - 65);
  }

  private tryInteract(): void {
    const nearby = this.getNearbyInteractable();
    if (!nearby) return;
    
    // Fermiamo l'audio come quando andiamo in pausa
    this.pauseCurrentLevelAudio();
    
    if (nearby.type === "west-corridor") {
       this.scene.launch("Minigame1", { parentSceneKey: this.scene.key });
    } else if (nearby.type === "pc-west") {
       this.scene.launch("Minigame2", { parentSceneKey: this.scene.key });
    } else if (nearby.type === "server-north") {
       this.scene.launch("Minigame3", { parentSceneKey: this.scene.key });
    } else if (nearby.type === "pc-east") {
       this.scene.launch("Minigame4", { parentSceneKey: this.scene.key });
    } else {
       // Lanciamo la scena del terminale come fallback (per eventuali altri PC/Server generici)
       this.scene.launch("TerminalScene", { parentSceneKey: this.scene.key, type: nearby.type });
    }
    this.scene.pause();
  }

  preload() {
    AssetPipeline.startDeferredPreload(this);
  }

  create() {
    this.input.keyboard?.resetKeys();

    this.syncCurrentLevelFromStorage();

    if (this.startPendingLoreSceneIfNeeded()) {
      return;
    }

    this.hasPlayerReachedStairs = false;
    this.startLevelMusic(this.currentLevel);

    this.events.on(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);

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

                    if (layer.name === "computers" || layer.name === "servers") {
                       let type = layer.name === "computers" ? "pc" : "server";
                       
                       // Distinguo in base alle coordinate per decidere il minigioco
                       if (type === "pc") {
                          if (obj.x < -200) type = "pc-west";
                          else if (obj.x > 500) type = "pc-east";
                       } else if (type === "server") {
                          if (obj.y < -150) type = "server-north";
                       }

                       this.interactables.push({ target: sprite, type });
                    }

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


    // Aggiungo zona interattiva per l'ingresso del corridoio ovest
    // Le stime dal json danno l'ingresso intorno a x: -160, y: -96
    this.interactables.push({
      target: { x: -160, y: -96 },
      type: "west-corridor"
    });

    this.escPauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.collisionDebugKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.doorInteractKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.interactKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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

    this.interactHintText = this.add
      .text(0, 0, "Premi E per interagire", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 12, y: 6 },
      })
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

    // Scorciatoie debug per minigiochi (1-9)
    const keys = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
    keys.forEach((k, i) => {
        this.numberKeys[(i + 1).toString()] = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes[k as keyof typeof Phaser.Input.Keyboard.KeyCodes]);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.handleSceneResume, this);
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.escPauseKey = undefined;
      this.collisionDebugKey = undefined;
      this.doorInteractKey = undefined;
      this.doorLayers = [];
      this.closedToOpenDoorIndex.clear();
      this.doorObjectEntries = [];
      this.doorHintText?.destroy();
      this.doorHintText = undefined;
      this.interactKey = undefined;
      this.interactHintText?.destroy();
      this.interactHintText = undefined;
      this.interactables = [];
      this.tileDebugGraphics?.destroy();
      this.stopStepSfx();
    });

    console.log(
      `[GamePlay] Level ${this.currentLevel}`
    );
  }

  update(): void {
    if (this.hasPlayerReachedStairs) return;

    if (this.collisionDebugKey != null && Phaser.Input.Keyboard.JustDown(this.collisionDebugKey)) {
      this.toggleCollisionDebug();
    }

    this.updateDoorHintPopup();

    if (this.doorInteractKey != null && Phaser.Input.Keyboard.JustDown(this.doorInteractKey)) {
      this.tryOpenNearbyDoor();
    }

    if (this.interactKey != null && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryInteract();
    }

    // Gestione scorciatoie numeriche
    const minigameMap: Record<string, string> = {
        "1": "Minigame1",
        "2": "Minigame2",
        "3": "Minigame3",
        "4": "Minigame4",
        "5": "Minigame5",
        "6": "MiniGame6",
        "7": "Minigame7",
        "9": "Minigame9"
    };

    for (const [keyNum, sceneKey] of Object.entries(minigameMap)) {
        const key = this.numberKeys[keyNum];
        if (key && Phaser.Input.Keyboard.JustDown(key)) {
            this.pauseCurrentLevelAudio();
            this.scene.launch(sceneKey, { parentSceneKey: this.scene.key });
            this.scene.pause();
            break;
        }
    }
    this.updateInteractHintPopup();

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
