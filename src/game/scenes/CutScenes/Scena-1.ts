import Phaser from "phaser";

interface NarrativeBlock {
    text: string;
    imageIndex: number;
}

export default class Scene1 extends Phaser.Scene {
    private images: Phaser.GameObjects.Image[] = [];
    private textGameObject!: Phaser.GameObjects.Text;
    private skipBtn!: Phaser.GameObjects.Text;

    private currentIndex = 0;
    private isTyping = false;
    private typingTimer?: Phaser.Time.TimerEvent;

    // Messaggio diviso in blocchi per seguire la nuova logica
    private narrative: NarrativeBlock[] = [
        { text: "Se stai leggendo questo significa che il CORE non ha intercettato il messaggio.", imageIndex: 0 },
        { text: "Un componente del collettivo lavora come agente della sicurezza nell’aeroporto.", imageIndex: 1 },
        { text: "Contattalo e informalo che domani dovrà far passare ai controlli la valigia XXX...", imageIndex: 1 },
        { text: "...e dirottare il volo su cui salirà verso la centrale nucleare.", imageIndex: 1 },
        { text: "Anonimo", imageIndex: 1 }
    ];

    constructor() {
        super("Scene1");
    }

    preload() {
        // Caricamento Immagini (Assicurati che i percorsi siano corretti)
        this.load.image("scene1_bg1", "");
        this.load.image("scene1_bg2", "../assets/images/scena-2.png"); // Esempio per la seconda immagine
    }

    create() {
        const { width, height } = this.scale;

        // 1. Setup Sfondi (Gestione array come in Introduction)
        const keys = ["scene1_bg1", "scene1_bg2"];
        keys.forEach((key, i) => {
            const img = this.add.image(width / 2, height / 2, key)
                .setDisplaySize(width, height)
                .setAlpha(i === 0 ? 1 : 0);
            this.images.push(img);
        });

        // 2. Setup Testo (Stile simile al tuo originale ma centrato/adattato)
        this.textGameObject = this.add.text(width / 2, height / 2, "", {
            fontFamily: "Pixelify Sans",
            fontSize: "24px",
            color: "#000000", // Nero come nel tuo originale
            align: "center",
            wordWrap: { width: 600 },
            lineSpacing: 8
        }).setOrigin(0.5);

        // 3. Tasto SKIP
        this.skipBtn = this.add.text(width - 40, 40, ">> SALTA [ESC]", {
            fontFamily: "Pixelify Sans",
            fontSize: "18px",
            color: "#000000",
            backgroundColor: "#ffffffaa",
            padding: { x: 10, y: 5 }
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.6);

        this.skipBtn.on('pointerdown', () => this.skipToEnd());

        // 4. Input Comandi
        this.input.keyboard?.on('keydown-ESC', () => this.skipToEnd());
        this.input.keyboard?.on('keydown-SPACE', () => this.handleSkip());
        this.input.on('pointerdown', (pointer: any, currentlyOver: any[]) => {
            if (!currentlyOver.includes(this.skipBtn)) this.handleSkip();
        });

        // Avvio narrazione
        this.playBlock(0);
    }

    private playBlock(index: number) {
        if (index >= this.narrative.length) {
            this.onComplete();
            return;
        }

        this.currentIndex = index;
        const data = this.narrative[index];

        // Cambio Sfondo con dissolvenza
        this.updateBackground(data.imageIndex);

        // Avvio Scrittura Testo
        this.typeText(data.text);
    }

    private typeText(fullText: string) {
        this.isTyping = true;
        this.textGameObject.setText("");
        let charIndex = 0;

        if (this.typingTimer) this.typingTimer.remove();

        this.typingTimer = this.time.addEvent({
            delay: 40,
            repeat: fullText.length - 1,
            callback: () => {
                if (this.textGameObject) {
                    this.textGameObject.text += fullText[charIndex];
                    charIndex++;
                    if (charIndex === fullText.length) {
                        this.isTyping = false;
                    }
                }
            }
        });
    }

    private handleSkip() {
        if (this.currentIndex >= this.narrative.length) return;
        
        if (this.isTyping) {
            if (this.typingTimer) this.typingTimer.remove();
            this.textGameObject.setText(this.narrative[this.currentIndex].text);
            this.isTyping = false;
        } else {
            this.playBlock(this.currentIndex + 1);
        }
    }

    private skipToEnd() {
        this.cameras.main.fade(800, 0, 0, 0, false, (camera: any, progress: number) => {
            if (progress === 1) this.onComplete();
        });
    }

    private updateBackground(targetIdx: number) {
        this.images.forEach((img, i) => {
            const targetAlpha = (i === targetIdx) ? 1 : 0;
            if (img.alpha !== targetAlpha) {
                this.tweens.add({
                    targets: img,
                    alpha: targetAlpha,
                    duration: 1500,
                    ease: "Power2"
                });
            }
        });
    }

    private onComplete() {
        // Passa alla scena successiva (es. Scene2 o il gioco vero e proprio)
        this.scene.start("Scene2");
    }
}