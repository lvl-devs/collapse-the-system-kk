import { GameData } from "../../GameData";

export default class SettingsStorage {
  private static readonly MUSIC_VOLUME_KEY = "settings.musicVolume";
  private static readonly SFX_VOLUME_KEY = "settings.sfxVolume";

  static loadVolumeSettings(): void {
    const musicVolume = this.readNumber(this.MUSIC_VOLUME_KEY);
    const sfxVolume = this.readNumber(this.SFX_VOLUME_KEY);

    if(musicVolume != null) GameData.musicVolume = musicVolume;
    if(sfxVolume != null) GameData.sfxVolume = sfxVolume;
  }

  static saveMusicVolume(value: number): void { this.writeNumber(this.MUSIC_VOLUME_KEY, value); }
  static saveSfxVolume(value: number): void { this.writeNumber(this.SFX_VOLUME_KEY, value); }

  private static readNumber(key: string): number | undefined {
    const raw = localStorage.getItem(key);
    if(raw == null) return undefined;

    const parsed = Number(raw);
    if(!Number.isFinite(parsed)) return undefined;

    return Math.min(1, Math.max(0, parsed));
  }

  private static writeNumber(key: string, value: number): void {
    const clamped = Math.min(1, Math.max(0, value));
    localStorage.setItem(key, String(clamped));
  }
}