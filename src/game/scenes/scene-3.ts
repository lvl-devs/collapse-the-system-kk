import Phaser from "phaser";

export default class Scene3 extends Phaser.Scene {

    private sceneAereo!: Phaser.GameObjects.Image;
    private sceneDialog!: Phaser.GameObjects.Image;
    private rainSound!: Phaser.Sound.BaseSound;

    constructor(){
        super("Scene3");
    }

    preload(){

        this.load.image("scena-aereo","../assets/images/scena-aereo.png");
        this.load.image("scena-hacker-scientist","../assets/images/scena-hacker-scientist.png");

        // suono pioggia
        this.load.audio("rain","../assets/sounds/rain.mp3");

    }

    create(){

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

        // dopo 3 secondi parte la dissolvenza
        this.time.delayedCall(3000, ()=>{

            this.fadeToSecond();

        });

    }

    fadeToSecond(){

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

    }

}