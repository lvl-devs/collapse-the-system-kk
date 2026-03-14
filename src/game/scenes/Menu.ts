import Phaser from "phaser";
import GameData from "../../GameData";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import SfxManager from "../audio/SfxManager";
import LevelStorage from "../systems/LevelStorage";
import SettingsStorage from "../systems/SettingsStorage";

export default class Menu extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";

  private _selectedIndex = 0;
  private _menuItems: Phaser.GameObjects.Text[] = [];

  constructor(){ super({ key: "Menu" }); }

  private canPlayUiSfx(): boolean {
    return (GameData.sfxVolume ?? 0.7) > 0;
  }

  private playSelectSfx(): void {
    if (!this.canPlayUiSfx()) return;
    SfxManager.start(this, "menuSelect", { volume: 0.6 * (GameData.sfxVolume ?? 0.7) });
  }

  create(){
    SettingsStorage.loadVolumeSettings();

    this._selectedIndex = 0;
    this._menuItems = [];

    this.sound.pauseOnBlur = false;
    AssetPipeline.startDeferredPreload(this);
    MusicManager.start(this, Menu.MENU_MUSIC_KEY, {
      loop: true,
      volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6)
    });
    SfxManager.start(this, Menu.RAIN_SFX_KEY, {
      loop: true,
      volume: GameData.sfxVolume ?? 0.7
    });
    if (!this.scene.isActive("MenuBackdrop") && !this.scene.isSleeping("MenuBackdrop")) {
      this.scene.launch("MenuBackdrop");
    } else if (this.scene.isSleeping("MenuBackdrop")) {
      this.scene.wake("MenuBackdrop");
    }
    this.scene.sendToBack("MenuBackdrop");

    const { width, height } = this.scale;

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
          this.playSelectSfx();
          this.selectItem(index);
        });
      this._menuItems.push(menuItem);
    });

    this.updateMenu();

    const onUp = () => {
      this._selectedIndex = (this._selectedIndex - 1 + this._menuItems.length) % this._menuItems.length;
      this.updateMenu();
      this.playSelectSfx();
    };

    const onDown = () => {
      this._selectedIndex = (this._selectedIndex + 1) % this._menuItems.length;
      this.updateMenu();
      this.playSelectSfx();
    };

    const onEnter = () => {
      this.playSelectSfx();
      this.selectItem(this._selectedIndex);
    };

    const onSpace = () => {
      this.playSelectSfx();
      this.selectItem(this._selectedIndex);
    };

    this.input.keyboard!.on("keydown-UP", onUp);
    this.input.keyboard!.on("keydown-DOWN", onDown);
    this.input.keyboard!.on("keydown-ENTER", onEnter);
    this.input.keyboard!.on("keydown-SPACE", onSpace);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-UP", onUp);
      this.input.keyboard?.off("keydown-DOWN", onDown);
      this.input.keyboard?.off("keydown-ENTER", onEnter);
      this.input.keyboard?.off("keydown-SPACE", onSpace);
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
    console.log("[Menu] selectItem - starting scene:", item.scene);
    if (item.scene === "GamePlay" || item.scene === "Introduction") {
      LevelStorage.resetProgress();
      MusicManager.stop(this, Menu.MENU_MUSIC_KEY);
      SfxManager.stop(this, Menu.RAIN_SFX_KEY);
      this.scene.stop("MenuBackdrop");

      if (item.scene === "Introduction") {
        this.scene.start(item.scene);
        return;
      }

      const startGameplay = () => {
        this.scene.start(item.scene);
      };

      if (AssetPipeline.isDeferredReady()) {
        startGameplay();
        return;
      }

      const loadingLabel = this.add
        .text(this.scale.width * 0.05, this.scale.height * 0.82, "LOADING MISSION DATA...", {
          color: "#70fdc2",
        })
        .setFontSize(24)
        .setFontFamily(GameData.preloader.loadingTextFont)
        .setShadow(2, 2, "#001E17", 0, false, true);

      if (!AssetPipeline.isDeferredLoading()) {
        AssetPipeline.startDeferredPreload(this);
      }

      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        loadingLabel.destroy();
        startGameplay();
      });
      return;
    }
    this.scene.start(item.scene);
  }

}
