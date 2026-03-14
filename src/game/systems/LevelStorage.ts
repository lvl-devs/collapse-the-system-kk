export default class LevelStorage {
  private static readonly CURRENT_LEVEL_KEY = "progress.currentLevel";
  private static readonly LORE_SCENE_SEEN_PREFIX = "progress.loreSeen.";
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
    this.resetProgress();
  }

  static resetProgress(): void {
    this.setCurrentLevel(this.FIRST_LEVEL);
    ["Scene1", "Scene2", "Scene3"].forEach((sceneKey) => {
      localStorage.removeItem(`${this.LORE_SCENE_SEEN_PREFIX}${sceneKey}`);
    });
  }

  static advanceLevel(amount = 1): number {
    const nextLevel = this.getCurrentLevel() + Math.max(1, Math.floor(amount));
    this.setCurrentLevel(nextLevel);
    return nextLevel;
  }

  static markLoreSceneSeen(sceneKey: string): void {
    localStorage.setItem(`${this.LORE_SCENE_SEEN_PREFIX}${sceneKey}`, "1");
  }

  static hasSeenLoreScene(sceneKey: string): boolean {
    return localStorage.getItem(`${this.LORE_SCENE_SEEN_PREFIX}${sceneKey}`) === "1";
  }
}