import Phaser from "phaser";

export default class Scene4 extends Phaser.Scene {

    private scientist1!: Phaser.GameObjects.Image;
    private scientist2!: Phaser.GameObjects.Image;
    private scientist3!: Phaser.GameObjects.Image;

    private explosionSound!: Phaser.Sound.BaseSound;
    private winSound!: Phaser.Sound.BaseSound;

    private winText!: Phaser.GameObjects.Text;

    constructor(){
        super("Scene4");
    }

    preload(){

        // immagini
        this.load.image("scientist1","../assets/images/scientist-1.png");
        this.load.image("scientist2","../assets/images/scientist-2.png");
        this.load.image("scientist3","../assets/images/scientist-3.png");

        // suoni
        this.load.audio("explosive","../assets/sounds/Explosion.mp3");
        this.load.audio("win","../assets/sounds/Win.mp3");

    }

    create(){

        const width = this.scale.width;
        const height = this.scale.height;

        // inizializza suoni
        this.explosionSound = this.sound.add("explosive");
        this.winSound = this.sound.add("win");

        // prima immagine
        this.scientist1 = this.add.image(width/2,height/2,"scientist1")
        .setDisplaySize(width,height);

        // seconda immagine
        this.scientist2 = this.add.image(width/2,height/2,"scientist2")
        .setDisplaySize(width,height)
        .setAlpha(0);

        // terza immagine
        this.scientist3 = this.add.image(width/2,height/2,"scientist3")
        .setDisplaySize(width,height)
        .setAlpha(0);

        // testo vittoria (inizialmente invisibile)
        this.winText = this.add.text(width/2,height/2,"YOU WIN!!!!",{

            fontFamily:"Pixelify Sans",
            fontSize:"72px",
            color:"#ffffff",
            stroke:"#000000",
            strokeThickness:8,
            align:"center"

        }).setOrigin(0.5).setAlpha(0);

        // dopo 3 secondi passa alla seconda
        this.time.delayedCall(3000,()=>{

            this.fadeToSecond();

        });

    }

    fadeToSecond(){

        // suono esplosione
        this.explosionSound.play();

        this.tweens.add({
            targets:this.scientist1,
            alpha:0,
            duration:2000
        });

        this.tweens.add({
            targets:this.scientist2,
            alpha:1,
            duration:2000
        });

        this.time.delayedCall(4000,()=>{

            this.fadeToThird();

        });

    }

    fadeToThird(){

        this.tweens.add({
            targets:this.scientist2,
            alpha:0,
            duration:2000
        });

        this.tweens.add({
            targets:this.scientist3,
            alpha:1,
            duration:2000
        });

        // suono vittoria
        this.winSound.play();

        // mostra testo YOU WIN
        this.tweens.add({
            targets:this.winText,
            alpha:1,
            duration:1000
        });

    }

}