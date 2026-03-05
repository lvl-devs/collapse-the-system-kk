import Phaser from "phaser";
import GameData from "../../GameData";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import SfxManager from "../audio/SfxManager";

export default class Menu extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";

  private _selectedIndex = 0;
  private _menuItems: Phaser.GameObjects.Text[] = [];

  constructor(){ super({ key: "Menu" }); }

  create(){
    this.sound.pauseOnBlur = false;
    AssetPipeline.startDeferredPreload(this);
    MusicManager.start(this, Menu.MENU_MUSIC_KEY, {
      loop: true,
      volume: GameData.musicVolume ?? GameData.settings.audio
    });
    SfxManager.start(this, Menu.RAIN_SFX_KEY, {
      loop: true,
      volume: GameData.sfxVolume ?? 0.35
    });
    const { width, height } = this.scale;
    const bgVideo = this.add.video(width / 2, height / 2, "bg-menu");

    bgVideo.setOrigin(0.5);
    bgVideo.play(true);
    bgVideo.on("created", () => {
      const scaleX = width / bgVideo.width;
      const scaleY = height / bgVideo.height;
      const scale = Math.max(scaleX, scaleY);
      bgVideo.setScale(scale);
    });

    this.add
      .text(width * 0.05, height * 0.05, GameData.globals.gameTitle, {
        color: "#70fdc2",
        wordWrap: { width: width * 0.8 }
      })
      .setFontSize(150)
      .setFontFamily(GameData.preloader.loadingTextFont)
      .setScale(Math.min(width / 1920, height / 1080) * 1.05);

    GameData.menu.items.forEach((item, index) => {
      const label = item.label.toUpperCase();
      const baseX = width * 0.05;
      const baseY = height * 0.6;
      const gap = 80;
      const startY = baseY + index * gap;

      const menuItem = this.add
        .text(baseX, startY, label, {
          color: "#70fdc2"
        })
        .setFontSize(GameData.menu.fontSize)
        .setFontFamily(GameData.preloader.loadingTextFont)
        .setShadow(3, 3, "#001E17", 0, false, true)
        .setInteractive()
        .on("pointerover", () => {
          this._selectedIndex = index;
          this.updateMenu();
        })

        .on("pointerdown", () => {
          if (item.scene === "GamePlay") {
            MusicManager.stop(this, Menu.MENU_MUSIC_KEY);
            SfxManager.stop(this, Menu.RAIN_SFX_KEY);
          }
          this.scene.stop(this);
          this.scene.start(item.scene);
          if(localStorage.getItem("soundEffectsEnabled") === "true")
            this.sound.play("menuSelect");
          this.selectItem(index);
        });
      this._menuItems.push(menuItem);
    });

    this.updateMenu();

    this.input.keyboard!.on("keydown-UP", () => {
      this._selectedIndex = (this._selectedIndex - 1 + this._menuItems.length) % this._menuItems.length;
      this.updateMenu();
      if(localStorage.getItem("soundEffectsEnabled") === "true")
        this.sound.play("menuSelect");
    });

    this.input.keyboard!.on("keydown-DOWN", () => {
      this._selectedIndex = (this._selectedIndex + 1) % this._menuItems.length;
      this.updateMenu();
      if(localStorage.getItem("soundEffectsEnabled") === "true")
        this.sound.play("menuSelect");
    });

    this.input.keyboard!.on("keydown-ENTER", () => {
      if(localStorage.getItem("soundEffectsEnabled") === "true")
        this.sound.play("menuSelect");
      this.selectItem(this._selectedIndex);
    });

    this.input.keyboard!.on("keydown-SPACE", () => {
      if(localStorage.getItem("soundEffectsEnabled") === "true")
        this.sound.play("menuSelect");
      this.selectItem(this._selectedIndex);
    });
  }

  private updateMenu(){
    this._menuItems.forEach((item, i) => {
      const label = GameData.menu.items[i].label.toUpperCase();
      if(i === this._selectedIndex) item.setText(`> ${label}`);
      else item.setText(label);
    });
  }

  private selectItem(index: number){
    const item = GameData.menu.items[index];
    this.scene.stop(this);
    this.scene.start(item.scene);
  }

}