import Phaser from "phaser";

type PlaySfxConfig = Omit<Phaser.Types.Sound.SoundConfig, "loop" | "volume"> & {
  volume?: number;
};

export default class SfxManager {
  private static scene?: Phaser.Scene;
  private static volume = 1;
  private static muted = false;

  static init(scene: Phaser.Scene, initialVolume = 1): void {
    this.scene = scene;
    this.volume = Phaser.Math.Clamp(initialVolume, 0, 1);
  }

  static preload(
    scene: Phaser.Scene,
    assets: Array<{ key: string; path: string | string[] }>
  ): void {
    assets.forEach((asset) => {
      if (!scene.cache.audio.exists(asset.key)) {
        scene.load.audio(asset.key, asset.path);
      }
    });
  }

  static play(key: string, config: PlaySfxConfig = {}): void {
    if (this.muted || !this.scene) {
      return;
    }

    if (!this.scene.cache.audio.exists(key)) {
      return;
    }

    const finalVolume = Phaser.Math.Clamp((config.volume ?? 1) * this.volume, 0, 1);
    this.scene.sound.play(key, {
      ...config,
      volume: finalVolume,
      loop: false
    });
  }

  static setVolume(value: number): void {
    this.volume = Phaser.Math.Clamp(value, 0, 1);
  }

  static setMuted(muted: boolean): void {
    this.muted = muted;
  }
}
