import Phaser from "phaser";
import GameData from "../../GameData";

export default class Menu extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly MENU_MUSIC_PATH = "music/menu.mp3";
  private menuMusic?: Phaser.Sound.BaseSound;
  private unlockHandler?: () => void;

  constructor(){ super({ key: "Menu" }); }

  preload(){
    if (!this.cache.audio.exists(Menu.MENU_MUSIC_KEY)) {
      this.load.audio(Menu.MENU_MUSIC_KEY, Menu.MENU_MUSIC_PATH);
    }
  }

  create(){
    this.sound.pauseOnBlur = false;
    this.startMenuMusic();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearUnlockListeners());

    const { width, height } = this.scale;
    const items = [
      { label: "Play", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" },
    ];
    const bgVideo = this.add.video(width / 2, height / 2, "bg-menu");
    bgVideo.setOrigin(0.5);
    bgVideo.play(true); // loop
    bgVideo.on('created', () => {
      const scaleX = width / bgVideo.width;
      const scaleY = height / bgVideo.height;
      const scale = Math.max(scaleX, scaleY);
      bgVideo.setScale(scale);
    });
    
    this.add
      .text(width * 0.05, height * 0.05, GameData.globals.gameTitle, {
        color: "#70fdc2",
        wordWrap: { width: width * 0.8 },
      })
      .setFontSize(150)
      .setFontFamily(GameData.preloader.loadingTextFont)
      .setScale(Math.min(width / 1920, height / 1080) * 1.05);

    items.forEach((item, index) => {
      const baseX = width * 0.05;
      const baseY = height * 0.6;
      const gap = 80;
      const startY = baseY + index * gap;

      this.add
        .text(baseX, startY, item.label.toUpperCase(), {
          color: "#70fdc2",
        })
        .setFontSize(60)
        .setFontFamily(GameData.preloader.loadingTextFont)
        .setShadow(3, 3, "#001E17", 0, false, true);
    });
  }

  private startMenuMusic(): void {
    if (!this.cache.audio.exists(Menu.MENU_MUSIC_KEY)) {
      return;
    }

    const existing = this.sound.get(Menu.MENU_MUSIC_KEY);
    this.menuMusic = existing ?? this.sound.add(Menu.MENU_MUSIC_KEY, {
      loop: true,
      volume: GameData.musicVolume ?? GameData.settings.audio
    });

    if (this.sound.locked) {
      this.registerUnlockListeners();
      return;
    }

    this.playMenuMusic();
  }

  private playMenuMusic(): void {
    if (!this.menuMusic || this.menuMusic.isPlaying) {
      return;
    }

    this.menuMusic.play();
    this.clearUnlockListeners();
  }

  private registerUnlockListeners(): void {
    this.clearUnlockListeners();
    const tryUnlock = () => {
      this.sound.unlock();
      this.playMenuMusic();
    };

    this.unlockHandler = tryUnlock;
    this.input.once(Phaser.Input.Events.POINTER_DOWN, tryUnlock);
    this.input.keyboard?.once(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, tryUnlock);
    this.sound.once(Phaser.Sound.Events.UNLOCKED, tryUnlock, this);
  }

  private clearUnlockListeners(): void {
    if (!this.unlockHandler) {
      return;
    }

    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.unlockHandler);
    this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.unlockHandler);
    this.sound.off(Phaser.Sound.Events.UNLOCKED, this.unlockHandler, this);
    this.unlockHandler = undefined;
  }
}