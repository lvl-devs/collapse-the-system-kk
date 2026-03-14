import Phaser from "phaser";

export default class Scene1 extends Phaser.Scene {

    private scene1!: Phaser.GameObjects.Image;
    private scene2!: Phaser.GameObjects.Image;
    private text!: Phaser.GameObjects.Text;
    private skipText!: Phaser.GameObjects.Text;

    private voice1!: Phaser.Sound.BaseSound;
    private voice2!: Phaser.Sound.BaseSound;
    private voice3!: Phaser.Sound.BaseSound;
    private voice4!: Phaser.Sound.BaseSound;

    private typingEvent!: Phaser.Time.TimerEvent;

    private skipped = false;
    private textStarted = false;

    private message = `Se stai leggendo questo significa che 
il CORE non ha intercettato il messaggio. 
    
Un componente del collettivo lavora come 
agente della sicurezza  nell’aeroporto.

               Contattalo e informalo che 
               domani dovrà far passare ai 
    controlli la valigia XXX e dirottare il volo 
    su cui salirà verso la centrale nucleare.


                                        Anonimo`;

    constructor(){
        super("Scene1");
    }

    preload(){

        this.load.image("scene1","../assets/images/scena-1.png");
        this.load.image("scene2","../assets/images/image1.png");

        this.load.audio("voice1","../assets/sounds/voice-hacker-1.mp3");
        this.load.audio("voice2","../assets/sounds/voice-hacker-2.mp3");
        this.load.audio("voice3","../assets/sounds/voice-hacker-3.mp3");
        this.load.audio("voice4","../assets/sounds/voice-hacker-4.mp3");

    }

    create(){

        const {width,height} = this.scale;

        this.scene1 = this.add.image(width/2,height/2,"scene1")
            .setDisplaySize(width,height)
            .setAlpha(0);

        this.tweens.add({
            targets:this.scene1,
            alpha:1,
            duration:2000
        });

        this.time.delayedCall(2000, ()=>{
            this.showSecondImage();
        });

        this.input.keyboard?.on("keydown-SPACE", ()=>{
            this.skipScene();
        });

    }

    showSecondImage(){

        const {width,height} = this.scale;

        this.scene2 = this.add.image(width/2,height/2,"scene2")
            .setDisplaySize(width,height)
            .setAlpha(0);

        this.tweens.add({
            targets:this.scene1,
            alpha:0,
            duration:2000
        });

        this.tweens.add({
            targets:this.scene2,
            alpha:1,
            duration:2000
        });

        this.time.delayedCall(1700, ()=>{
            this.createText();
        });

    }

    createText(){

        const {width,height} = this.scale;

        const textX = width/2 - 233;
        const textY = height/2 - 270;

        this.text = this.add.text(textX,textY,"",{
            fontFamily:"Pixelify Sans",
            fontSize:"22px",
            color:"#000000",
            align:"left",
            wordWrap:{width:520},
            lineSpacing:6
        });

        this.skipText = this.add.text(width/2,height-40,"Press SPACE to skip",{
            fontFamily:"Pixelify Sans",
            fontSize:"16px",
            color:"#ffffff"
        }).setOrigin(0.5);

        this.textStarted = true;

        this.startAudio();
        this.typeWriter();

    }

    startAudio(){

        this.voice1 = this.sound.add("voice1");
        this.voice2 = this.sound.add("voice2");
        this.voice3 = this.sound.add("voice3");
        this.voice4 = this.sound.add("voice4");

        this.voice1.play();

        this.voice1.once("complete", ()=>{
            this.voice2.play();
        });

        this.voice2.once("complete", ()=>{
            this.voice3.play();
        });

        this.voice3.once("complete", ()=>{

            this.time.delayedCall(2800, ()=>{
                this.voice4.play();
            });

        });

    }

    typeWriter(){

        let i = 0;

        this.typingEvent = this.time.addEvent({

            delay:57,
            repeat:this.message.length - 1,

            callback:()=>{

                if(this.skipped) return;

                this.text.text += this.message[i];
                i++;

            }

        });

    }

    skipScene(){

        if(!this.textStarted) return;
        if(this.skipped) return;

        this.skipped = true;

        // mostra tutto il testo subito
        this.text.setText(this.message);

        // ferma la scrittura
        if(this.typingEvent){
            this.typingEvent.remove();
        }

        // nasconde il messaggio di skip
        this.skipText.setVisible(false);

        // le voci continuano normalmente
    }

}