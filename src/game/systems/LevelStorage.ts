export default class LevelStorage {
  private static readonly CURRENT_LEVEL_KEY = "progress.currentLevel";
  private static readonly FIRST_LEVEL = 1;

  static getCurrentLevel(): number {
    const raw = localStorage.getItem(this.CURRENT_LEVEL_KEY);
    if (raw == null) {
      this.setCurrentLevel(this.FIRST_LEVEL);
      return this.FIRST_LEVEL;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < this.FIRST_LEVEL) {
      this.setCurrentLevel(this.FIRST_LEVEL);
      return this.FIRST_LEVEL;
    }

    return parsed;
  }

  static setCurrentLevel(level: number): void {
    const safeLevel = Math.max(this.FIRST_LEVEL, Math.floor(level));
    localStorage.setItem(this.CURRENT_LEVEL_KEY, String(safeLevel));
  }

  static resetToFirstLevel(): void {
    this.setCurrentLevel(this.FIRST_LEVEL);
  }
}