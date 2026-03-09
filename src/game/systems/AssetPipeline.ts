import Phaser from "phaser";
import { GameData } from "../../GameData";

type Phase = "critical" | "deferred";

const CRITICAL_IMAGE_KEYS = new Set(["bg_logo", "title_img"]);
const CRITICAL_VIDEO_KEYS = new Set(["bg-menu"]);
const CRITICAL_SOUND_KEYS = new Set(["menu-theme", "rain-sfx"]);

export default class AssetPipeline {
  private static deferredStarted = false;

  static preloadCritical(scene: Phaser.Scene): void {
    this.loadAssets(scene, "critical");
  }

  static startDeferredPreload(scene: Phaser.Scene): void {
    if (this.deferredStarted) {
      return;
    }

    this.deferredStarted = true;
    this.loadAssets(scene, "deferred");
    scene.load.start();
  }

  private static loadAssets(scene: Phaser.Scene, phase: Phase): void {
    // IMAGES
    if (GameData.images != null) {
      GameData.images.forEach((element: ImageAsset) => {
        const isCritical = CRITICAL_IMAGE_KEYS.has(element.name);
        if (!this.shouldQueue(phase, isCritical) || scene.textures.exists(element.name)) return;
        scene.load.image(element.name, element.path);
      });
    }

    // TILEMAPS
    if (GameData.tilemaps != null && phase === "deferred") {
      GameData.tilemaps.forEach((element: TilemapAsset) => {
        if (!scene.cache.tilemap.exists(element.key)) {
          scene.load.tilemapTiledJSON(element.key, element.path);
        }
      });
    }

    // ATLAS
    if (GameData.atlas != null && phase === "deferred") {
      GameData.atlas.forEach((element: AtlasAsset) => {
        if (!scene.textures.exists(element.key)) {
          scene.load.atlas(element.key, element.path, element.jsonpath);
        }
      });
    }

    // SPRITESHEETS
    if (GameData.spritesheets != null && phase === "deferred") {
      GameData.spritesheets.forEach((element: SpritesheetsAsset) => {
        if (!scene.textures.exists(element.name)) {
          scene.load.spritesheet(element.name, element.path, {
            frameWidth: element.width,
            frameHeight: element.height,
            endFrame: element.frames
          });
        }
      });
    }

    // VIDEO
    if (GameData.videos != null) {
      GameData.videos.forEach((element: VideoAsset) => {
        const isCritical = CRITICAL_VIDEO_KEYS.has(element.name);
        if (!this.shouldQueue(phase, isCritical) || scene.cache.video.exists(element.name)) return;
        scene.load.video(element.name, element.path, true);
      });
    }

    // SOUNDS
    if (GameData.sounds != null) {
      GameData.sounds.forEach((element: SoundAsset) => {
        const isCritical = CRITICAL_SOUND_KEYS.has(element.name);
        if (!this.shouldQueue(phase, isCritical) || scene.cache.audio.exists(element.name)) return;
        scene.load.audio(element.name, element.paths);
      });
    }

    // SCRIPT
    if (GameData.scripts != null && phase === "deferred") {
      GameData.scripts.forEach((element: ScriptAsset) => {
        scene.load.script(element.key, element.path);
      });
    }

    // BITMAP FONTS
    if (GameData.bitmapfonts != null && phase === "deferred") {
      GameData.bitmapfonts.forEach((element: FontAsset) => {
        if (!scene.cache.bitmapFont.exists(element.key)) {
          scene.load.bitmapFont(element.key, element.path, element.xmlpath);
        }
      });
    }

    // LOCAL FONTS
    if (GameData.fonts != null && phase === "critical") {
      GameData.fonts.forEach((element: FontAsset) => {
        scene.load.font(element.key, element.path);
      });
    }
  }

  private static shouldQueue(phase: Phase, isCritical: boolean): boolean {
    return phase === "critical" ? isCritical : !isCritical;
  }
}
