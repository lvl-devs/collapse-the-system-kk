import Phaser from "phaser";

export default class Introduction extends Phaser.Scene {

    private images: Phaser.GameObjects.Image[] = [];
    private text!: Phaser.GameObjects.Text;
    private voice!: Phaser.Sound.BaseSound;

    private imageIndex = 0;
    private blockIndex = 0;

    private blocks: string[] = [

`Benvenuto hacker. Ti trovi in un’agenzia governativa.
Non dovresti essere qui.`,

`Hai accesso alla rete interna e a diversi terminali del sistema.
Ci sono alcune operazioni da completare. Devi completare tutti i task.`,

`È solo una piccola parte del piano.Ma ogni passaggio è importante.
Se tutto va come previsto…
il sistema inizierà a cedere.`

    ];

    constructor() {
        super("Introduction");
    }

    preload() {

        this.load.image("intro1","../assets/images/introduzione-1.png");
        this.load.image("intro2","../assets/images/introduzione-4.png");
        this.load.image("intro3","../assets/images/introduzione-2.png");

        this.load.audio("voice","../assets/sounds/voice-introduction-1.mp3");

    }

    create() {

        const { width, height } = this.scale;

        const keys = ["intro1","intro2","intro3"];

        keys.forEach((key,i)=>{

            const img = this.add.image(width/2,height/2,key)
                .setDisplaySize(width,height)
                .setAlpha(i === 0 ? 1 : 0);

            this.images.push(img);

        });

        this.text = this.add.text(width/2,height-150,"",{

            fontFamily:"Pixelify Sans",
            fontSize:"30px",
            color:"#ffffff",
            align:"center",
            wordWrap:{width:width-300},
            lineSpacing:10

        }).setOrigin(0.5);

        this.voice = this.sound.add("voice");

        if (this.sound.locked) {
            this.sound.once("unlock", () => this.voice.play());
        } else {
            this.voice.play();
        }

        this.playNextBlock();

    }

    playNextBlock(){

        if(this.blockIndex >= this.blocks.length){
            return;
        }

        const block = this.blocks[this.blockIndex];

        this.typeBlock(block, ()=>{

            // se NON è l'ultimo blocco
            if(this.blockIndex < this.blocks.length - 1){

                this.text.setText("");

                this.changeImage(()=>{
                    this.blockIndex++;
                    this.playNextBlock();
                });

            }

        });

    }

    typeBlock(text:string, onComplete:Function){

        let i = 0;

        this.time.addEvent({

            delay:70,
            repeat:text.length -1,

            callback:()=>{

                this.text.text += text[i];
                i++;

                if(i === text.length){
                    onComplete();
                }

            }

        });

    }

    changeImage(onComplete:Function){

        if(this.imageIndex >= this.images.length-1) return;

        const current = this.images[this.imageIndex];
        const next = this.images[this.imageIndex+1];

        this.tweens.add({
            targets:current,
            alpha:0,
            duration:1500,
            ease:"Sine.easeInOut"
        });

        this.tweens.add({
            targets:next,
            alpha:1,
            duration:1500,
            ease:"Sine.easeInOut",
            onComplete:()=>{
                this.imageIndex++;
                onComplete();
            }
        });

    }

}