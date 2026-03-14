import Phaser from "phaser";
import LevelStorage from "../systems/LevelStorage";

export default class Scene3 extends Phaser.Scene {

    private sceneAereo!: Phaser.GameObjects.Image;
    private sceneDialog!: Phaser.GameObjects.Image;
    private rainSound!: Phaser.Sound.BaseSound;
    private skipText?: Phaser.GameObjects.Text;
    private transitionStarted = false;
    private fadeTimer?: Phaser.Time.TimerEvent;
    private endTimer?: Phaser.Time.TimerEvent;

    constructor(){
        super("Scene3");
    }

    preload(){

        this.load.image("scena-aereo","images/scena-aereo.png");
        this.load.image("scena-hacker-scientist","images/scena-hacker-scientist.png");

        // suono pioggia
        this.load.audio("rain","sounds/rain.mp3");

    }

    create(){
        LevelStorage.markLoreSceneSeen("Scene3");
        this.transitionStarted = false;

        const {width,height} = this.scale;

        // avvia suono pioggia in loop
        this.rainSound = this.sound.add("rain", { loop: true, volume: 0.6 });
        this.rainSound.play();

        // prima immagine
        this.sceneAereo = this.add.image(width/2,height/2,"scena-aereo")
        .setDisplaySize(width,height);

        // seconda immagine (invisibile)
        this.sceneDialog = this.add.image(width/2,height/2,"scena-hacker-scientist")
        .setDisplaySize(width,height)
        .setAlpha(0);

        this.skipText = this.add.text(width / 2, height - 36, "Press SPACE or click to skip", {
            fontFamily: "Pixelify Sans",
            fontSize: "16px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 4,
        }).setOrigin(0.5);

        this.input.keyboard?.on("keydown-SPACE", () => {
            this.skipScene();
        });

        this.input.on("pointerdown", () => {
            this.skipScene();
        });

        // dopo 3 secondi parte la dissolvenza
        this.fadeTimer = this.time.delayedCall(3000, ()=>{

            this.fadeToSecond();

        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off("keydown-SPACE");
            this.input.off("pointerdown");
            this.fadeTimer?.remove();
            this.endTimer?.remove();
            this.tweens.killTweensOf(this.sceneAereo);
            this.tweens.killTweensOf(this.sceneDialog);
        });

    }

    fadeToSecond(){
        if (this.transitionStarted) return;
        this.transitionStarted = true;
        this.skipText?.setVisible(false);

        // dissolvenza prima immagine
        this.tweens.add({
            targets:this.sceneAereo,
            alpha:0,
            duration:2000
        });

        // dissolvenza seconda immagine
        this.tweens.add({
            targets:this.sceneDialog,
            alpha:1,
            duration:2000
        });

        // dopo la dissolvenza passa alla scena 4
        this.endTimer = this.time.delayedCall(5000, ()=>{
            this.startNextScene();
        });

    }

    private skipScene(){
        if (this.transitionStarted) {
            this.startNextScene();
            return;
        }

        this.fadeTimer?.remove();
        this.fadeToSecond();
    }

    private startNextScene(){
        if (!this.scene.isActive()) return;

        this.fadeTimer?.remove();
        this.endTimer?.remove();
        this.rainSound?.stop();
        this.scene.start("Scene4");

    }

}