import Phaser from "phaser";

export default class Scene2 extends Phaser.Scene {

    private background!: Phaser.GameObjects.Image;
    private text!: Phaser.GameObjects.Text;

    private dialogIndex = 0;

    private dialog = [

        {
            speaker: "hacker",
            text: `Agente, se stai ascoltando questa trasmissione significa che il messaggio è arrivato.
Il CORE non ha intercettato nulla… per ora.
Ma il tempo che abbiamo è limitato.`,
            sound: "hacker-text-1"
        },

        {
            speaker: "agent",
            text: `Ricevuto. I controlli all’aeroporto sono più rigidi del solito.
Se qualcuno scopre quello che stiamo facendo, la mia copertura salta.`,
            sound: "agent-text-1"
        },

        {
            speaker: "hacker",
            text: `Lo so. È per questo che abbiamo scelto proprio te.
Domani mattina arriverà una valigia.
Non sarà registrata nei sistemi ufficiali.
Il tuo compito è semplice: farla passare ai controlli.`,
            sound: "hacker-text-2"
        },

        {
            speaker: "agent",
            text: `E poi?`,
            sound: "agent-text-2"
        },

        {
            speaker: "hacker",
            text: `Poi dovrai assicurarti che salga sul volo giusto.
Una volta in aria, il piano entrerà nella seconda fase.`,
            sound: "hacker-text-3"
        }

    ];

    constructor(){
        super("Scene2");
    }

    preload(){

        this.load.image("scena-hacker","../assets/images/scena-hacker.svg");
        this.load.image("scena-agent","../assets/images/scena-agent.svg");

        // suoni dialogo
        this.load.audio("hacker-text-1","../assets/sounds/hacker-text-1.mp3");
        this.load.audio("agent-text-1","../assets/sounds/agent-text-1.mp3");
        this.load.audio("hacker-text-2","../assets/sounds/hacker-text-2.mp3");
        this.load.audio("agent-text-2","../assets/sounds/agent-text-2.mp3");
        this.load.audio("hacker-text-3","../assets/sounds/hacker-text-3.mp3");

    }

    create(){

        const {width,height} = this.scale;

        this.background = this.add.image(width/2,height/2,"scena-hacker")
        .setDisplaySize(width,height);

        this.text = this.add.text(width/2,height-150,"",{

            fontFamily:"Pixelify Sans",
            fontSize:"24px",
            color:"#ffffff",
            align:"center",
            wordWrap:{width:900},
            lineSpacing:8,
            stroke:"#000000",
            strokeThickness:5

        }).setOrigin(0.5);

        this.showDialog();

    }

    showDialog(){

        const current = this.dialog[this.dialogIndex];

        // cambia immagine
        if(current.speaker === "hacker"){
            this.background.setTexture("scena-hacker");
        }else{
            this.background.setTexture("scena-agent");
        }

        // riproduce suono
        this.sound.play(current.sound);

        const speakerName = current.speaker === "hacker" ? "Hacker" : "Agente";
        const fullText = `${speakerName}:\n${current.text}`;

        this.typeText(fullText);

    }

    typeText(message:string){

        this.text.setText("");
        let i = 0;

        this.time.addEvent({

            delay:60,
            repeat:message.length - 1,

            callback:()=>{

                this.text.text += message[i];
                i++;

                if(i === message.length){

                    this.time.delayedCall(2000,()=>{
                        this.nextDialog();
                    });

                }

            }

        });

    }

    nextDialog(){

        this.dialogIndex++;

        if(this.dialogIndex >= this.dialog.length){
            return;
        }

        this.showDialog();

    }

}