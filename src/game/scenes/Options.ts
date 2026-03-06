import Phaser from "phaser";
import { GameData } from "../../GameData";
import SfxManager from "../audio/SfxManager";
import MusicManager from "../audio/MusicManager";
import SettingsStorage from "../systems/SettingsStorage";

type OptionsSceneData = {
  returnMode?: "menu" | "pause";
  pauseMenuSceneKey?: string;
};

export default class Options extends Phaser.Scene {

  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";
  private returnMode: "menu" | "pause" = "menu";
  private pauseMenuSceneKey = "PauseMenu";

  constructor() {
    super("Options");
  }

  preload(){
    this.load.image("bg_options","../assets/images/bg_options.png");
  }

  init(data: OptionsSceneData): void {
    this.returnMode = data.returnMode ?? "menu";
    this.pauseMenuSceneKey = data.pauseMenuSceneKey ?? "PauseMenu";
    console.log("[Options] init with returnMode:", this.returnMode, "pauseMenuKey:", this.pauseMenuSceneKey);
  }

  create() {
    console.log("[Options] create() called");
    SettingsStorage.loadVolumeSettings();

    this.sound.pauseOnBlur = false;

    if (this.returnMode === "menu") {
      MusicManager.start(this, Options.MENU_MUSIC_KEY, {
        loop: true,
        volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6)
      });

      SfxManager.start(this, Options.RAIN_SFX_KEY, {
        loop: true,
        volume: GameData.sfxVolume ?? 0.7
      });
    }

    const { width, height } = this.scale;

    // BACKGROUND
    const bg = this.add.image(width/2, height/2, "bg_options");
    const scale = Math.max(width/bg.width, height/bg.height);
    bg.setScale(scale);

    // =========================
    // SLIDERS
    // =========================

    this.createSlider(
      width/2,
      height/2 + 20, 
      GameData.sfxVolume ?? 0.7,
      (v:number)=>{
        GameData.sfxVolume = v;
        SettingsStorage.saveSfxVolume(v);

        if (this.returnMode === "menu") {
          SfxManager.setVolume(this, Options.RAIN_SFX_KEY, v);
        }
      }
    );

    this.createSlider(
      width/2,
      height/2 + 120, 
      GameData.musicVolume ?? 0.6,
      (v:number)=>{
        GameData.musicVolume = v;
        SettingsStorage.saveMusicVolume(v);

        if (this.returnMode === "menu") {
          MusicManager.start(this, Options.MENU_MUSIC_KEY, {
            loop: true,
            volume: MusicManager.toEngineVolume(v)
          });
        }
      }
    );

    // =========================
    // BACK BUTTON
    // =========================

    const back = this.add.text(
      width/2,
      height/2 + 200, 
      "BACK",
      {
        fontFamily:"Pixelify Sans",
        fontSize:"40px",
        color:"#70fdc2"
      }
    )
    .setOrigin(0.5)
    .setInteractive({useHandCursor:true});

    back.on("pointerover", ()=>{
      back.setScale(1.1);
      back.setColor("#ffffff");
    });

    back.on("pointerout", ()=>{
      back.setScale(1);
      back.setColor("#70fdc2");
    });

    back.on("pointerdown", ()=>{
      SfxManager.start(this,"ui_click",{volume:0.6 * (GameData.sfxVolume ?? 0.7)});
      this.goBack();
    });

    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    escKey?.on("down", this.goBack, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escKey?.off("down", this.goBack, this);
    });

    const neon = "#70fdc2";

// ===== SETTINGS TITLE =====
this.add.text(
  width/2,
  height/2 - 205,
  "S E T T I N G S",
  {
    fontFamily: "Pixelify Sans",
    fontSize: "48px",
    color: neon
  }
)
.setOrigin(0.5)


// ===== SOUND EFFECTS =====
this.add.text(
  width/2,
  height/2 - 27,
  "SOUND EFFECTS",
  {
    fontFamily: "Pixelify Sans",
    fontSize: "34px",
    color: neon
  }
)
.setOrigin(0.53)

// ===== MUSIC =====
this.add.text(
  width/2,
  height/2 + 72,
  "MUSIC",
  {
    fontFamily: "Pixelify Sans",
    fontSize: "34px",
    color: neon
  }
)
.setOrigin(0.55)

  }

  private createSlider(
    cx:number,
    cy:number,
    initial:number,
    callback:(v:number)=>void
  ){

    const neon = 0x70fdc2;
    const width = 260;

    this.add.rectangle(
      cx,
      cy,
      width,
      3,
      neon
    );

    const knob = this.add.rectangle(
      cx - width/2 + width*initial,
      cy,
      18,
      18
    )
    .setStrokeStyle(3, neon)
    .setFillStyle(0x000000,0.5)
    .setInteractive({draggable:true, useHandCursor:true});

    this.input.setDraggable(knob);

    knob.on("drag", (_:any, dragX:number)=>{

      const min = cx - width/2;
      const max = cx + width/2;

      const clamped = Phaser.Math.Clamp(dragX, min, max);

      knob.x = clamped;

      const v = (clamped-min)/width;

      callback(v);

    });

  }

  private goBack(): void {
    if (this.returnMode === "pause") {
      console.log("[Options] Going back to pause menu:", this.pauseMenuSceneKey);
      this.scene.stop();
      this.scene.resume(this.pauseMenuSceneKey);
      return;
    }

    console.log("[Options] Going back to main menu");
    this.scene.start("Menu");
  }

}
