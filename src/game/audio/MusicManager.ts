import Phaser from "phaser";

type UnlockHandlerMap = Map<string, () => void>;
type SceneHookMap = Map<string, boolean>;

export default class MusicManager {
  private static readonly MUSIC_GAIN = 1.8;
  private static unlockHandlers = new WeakMap<Phaser.Scene, UnlockHandlerMap>();
  private static sceneHooks = new WeakMap<Phaser.Scene, SceneHookMap>();

  static toEngineVolume(userVolume: number): number {
    const normalized = Phaser.Math.Clamp(userVolume, 0, 1);
    return normalized * this.MUSIC_GAIN;
  }

  static start(
    scene: Phaser.Scene,
    key: string,
    config: Phaser.Types.Sound.SoundConfig = {}
  ): Phaser.Sound.BaseSound | undefined {
    if (!scene.cache.audio.exists(key)) {
      return undefined;
    }

    const sound = scene.sound.get(key) ?? scene.sound.add(key, {
      loop: true,
      ...config,
    });
    const soundAny = sound as any;

    if (config.volume != null) {
      soundAny.volume = config.volume;
    }
    if (config.loop != null) {
      soundAny.loop = config.loop;
    }

    if (scene.sound.locked) {
      this.registerUnlock(scene, key, sound);
      return sound;
    }

    if (!sound.isPlaying) {
      sound.play();
    }

    this.clearUnlock(scene, key);
    return sound;
  }

  static stop(scene: Phaser.Scene, key: string): void {
    scene.sound.stopByKey(key);
    this.clearUnlock(scene, key);
  }

  static startForScene(
    scene: Phaser.Scene,
    key: string,
    config: Phaser.Types.Sound.SoundConfig = {}
  ): Phaser.Sound.BaseSound | undefined {
    this.ensureSceneStopHook(scene, key);
    return this.start(scene, key, config);
  }

  private static registerUnlock(scene: Phaser.Scene, key: string, sound: Phaser.Sound.BaseSound): void {
    this.clearUnlock(scene, key);

    const tryUnlockAndPlay = () => {
      scene.sound.unlock();
      if (!sound.isPlaying) {
        sound.play();
      }
      this.clearUnlock(scene, key);
    };

    scene.input.once(Phaser.Input.Events.POINTER_DOWN, tryUnlockAndPlay);
    scene.input.keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, tryUnlockAndPlay);
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, tryUnlockAndPlay, scene);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearUnlock(scene, key));

    const byKey = this.unlockHandlers.get(scene) ?? new Map<string, () => void>();
    byKey.set(key, tryUnlockAndPlay);
    this.unlockHandlers.set(scene, byKey);
  }

  private static clearUnlock(scene: Phaser.Scene, key: string): void {
    const byKey = this.unlockHandlers.get(scene);
    if (!byKey) {
      return;
    }

    const handler = byKey.get(key);
    if (!handler) {
      return;
    }

    scene.input.off(Phaser.Input.Events.POINTER_DOWN, handler);
    scene.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, handler);
    scene.sound.off(Phaser.Sound.Events.UNLOCKED, handler, scene);
    byKey.delete(key);

    if (byKey.size === 0) {
      this.unlockHandlers.delete(scene);
    }
  }

  private static ensureSceneStopHook(scene: Phaser.Scene, key: string): void {
    const byKey = this.sceneHooks.get(scene) ?? new Map<string, boolean>();
    if (byKey.get(key)) {
      return;
    }

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stop(scene, key));
    byKey.set(key, true);
    this.sceneHooks.set(scene, byKey);
  }
}
