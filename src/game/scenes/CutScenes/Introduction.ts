import Phaser from "phaser";

interface NarrativeBlock {
    text: string;
    audioKey: string;
    imageIndex: number;
}

export default class Introduction extends Phaser.Scene {
    private images: Phaser.GameObjects.Image[] = [];
    private textGameObject!: Phaser.GameObjects.Text;
    private currentVoice?: Phaser.Sound.BaseSound;
    private skipBtn!: Phaser.GameObjects.Text;

    private currentIndex = 0;
    private isTyping = false;
    private typingTimer?: Phaser.Time.TimerEvent;
    private autoForwardTimer?: Phaser.Time.TimerEvent;

    // Configurazione 1:1 come da screenshot
    private narrative: NarrativeBlock[] = [
        { text: "Benvenuto hacker.", audioKey: "benvenuto_hacker", imageIndex: 0 },
        { text: "Ti trovi in un’agenzia governativa.", audioKey: "ti_trovi_in_un_agenzia_governativa", imageIndex: 0 },
        { text: "Non dovresti essere qui.", audioKey: "non_dovresti_essere_qui", imageIndex: 0 },
        { text: "Hai accesso alla rete interna e a diversi terminali del sistema.", audioKey: "hai_accesso_alla_rete_interna_e_a_diversi_terminali_del_sistema", imageIndex: 1 },
        { text: "Ci sono alcune operazioni da completare.", audioKey: "ci_sono_alcune_operazioni_da_completare", imageIndex: 1 },
        { text: "Devi completare tutti i task.", audioKey: "devi_completare_tutti_i_task", imageIndex: 1 },
        { text: "È solo una piccola parte del piano.", audioKey: "e_solo_una_piccola_parte_del_piano", imageIndex: 2 },
        { text: "Ma ogni passaggio è importante.", audioKey: "ma_ogni_passaggio_e_importante", imageIndex: 2 },
        { text: "Se tutto va come previsto...", audioKey: "se_tutto_va_come_previsto", imageIndex: 2 },
        { text: "il sistema inizierà a cedere.", audioKey: "il_sistema_iniziera_a_cedere", imageIndex: 2 }
    ];

    constructor() {
        super("Introduction");
    }

    preload() {
        // Caricamento Immagini
        this.load.image("intro1", "images/intro/img0.png");
        this.load.image("intro2", "images/intro/img1.png");
        this.load.image("intro3", "images/intro/img2.png");

        // Caricamento Audio
        this.narrative.forEach(item => {
            this.load.audio(item.audioKey, `sounds/intro_audio/${item.audioKey}.mp3`);
        });
    }

    create() {
        const { width, height } = this.scale;

        // 1. Setup Sfondi
        const keys = ["intro1", "intro2", "intro3"];
        keys.forEach((key, i) => {
            const img = this.add.image(width / 2, height / 2, key)
                .setDisplaySize(width, height)
                .setAlpha(i === 0 ? 1 : 0);
            this.images.push(img);
        });

        // 2. Setup Testo Narrativo
        this.textGameObject = this.add.text(width / 2, height - 150, "", {
            fontFamily: "Pixelify Sans",
            fontSize: "30px",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: width - 300 },
            lineSpacing: 10
        }).setOrigin(0.5);

        // 3. Tasto SKIP ALL (Grafica Hacker)
        this.skipBtn = this.add.text(width - 40, 40, ">> ESCI DALL'INTRO [ESC]", {
            fontFamily: "Pixelify Sans",
            fontSize: "18px",
            color: "#00ff00",
            backgroundColor: "#000000aa",
            padding: { x: 10, y: 5 }
        })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .setAlpha(0.6);

        this.skipBtn.on('pointerover', () => this.skipBtn.setAlpha(1).setScale(1.05));
        this.skipBtn.on('pointerout', () => this.skipBtn.setAlpha(0.6).setScale(1));
        this.skipBtn.on('pointerdown', () => this.skipToEnd());

        // 4. Input Comandi
        this.input.keyboard?.on('keydown-ESC', () => this.skipToEnd());
        this.input.keyboard?.on('keydown-SPACE', () => this.handleSkip());
        this.input.keyboard?.on('keydown-RIGHT', () => this.handleSkip());
        this.input.keyboard?.on('keydown-ENTER', () => this.handleSkip());
        
        this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, currentlyOver: any[]) => {
            if (!currentlyOver.includes(this.skipBtn)) {
                this.handleSkip();
            }
        });

        // Avvio prima frase
        this.playBlock(0);
    }

    private playBlock(index: number) {
        // Controllo fine introduzione
        if (index >= this.narrative.length) {
            this.onIntroductionComplete();
            return;
        }

        this.currentIndex = index;
        const data = this.narrative[index];

        // Cambio Sfondo
        this.updateBackground(data.imageIndex);

        // Gestione Audio
        if (this.currentVoice) {
            this.currentVoice.removeAllListeners();
            this.currentVoice.stop();
        }
        if (this.autoForwardTimer) this.autoForwardTimer.remove();

        this.currentVoice = this.sound.add(data.audioKey);
        
        // Auto-forward: quando finisce l'audio, aspetta 500ms e va avanti
        this.currentVoice.once('complete', () => {
            this.autoForwardTimer = this.time.addEvent({
                delay: 500,
                callback: () => {
                    if (this.currentIndex === index) { // Verifica che l'utente non abbia già skippato
                        this.playBlock(this.currentIndex + 1);
                    }
                }
            });
        });

        this.currentVoice.play();

        // Avvio Scrittura Testo
        this.typeText(data.text);
    }

    private typeText(fullText: string) {
        this.isTyping = true;
        this.textGameObject.setText("");
        let charIndex = 0;

        if (this.typingTimer) this.typingTimer.remove();

        this.typingTimer = this.time.addEvent({
            delay: 50,
            repeat: fullText.length - 1,
            callback: () => {
                this.textGameObject.text += fullText[charIndex];
                charIndex++;
                if (charIndex === fullText.length) {
                    this.isTyping = false;
                }
            }
        });
    }

    private handleSkip() {
        if (this.currentIndex >= this.narrative.length) return;
        
        const currentData = this.narrative[this.currentIndex];

        if (this.isTyping) {
            // Se sta scrivendo, mostro tutto il testo subito
            if (this.typingTimer) this.typingTimer.remove();
            this.textGameObject.setText(currentData.text);
            this.isTyping = false;
        } else {
            // Se il testo è già completo, passo alla prossima frase forzatamente
            this.playBlock(this.currentIndex + 1);
        }
    }

    private skipToEnd() {
        if (this.typingTimer) this.typingTimer.remove();
        if (this.autoForwardTimer) this.autoForwardTimer.remove();
        if (this.currentVoice) {
            this.currentVoice.removeAllListeners();
            this.currentVoice.stop();
        }

        this.cameras.main.fade(800, 0, 0, 0, false, (_camera: any, progress: number) => {
            if (progress === 1) {
                this.onIntroductionComplete();
            }
        });
    }

    private updateBackground(targetIdx: number) {
        this.images.forEach((img, i) => {
            const targetAlpha = (i === targetIdx) ? 1 : 0;
            if (img.alpha !== targetAlpha) {
                this.tweens.add({
                    targets: img,
                    alpha: targetAlpha,
                    duration: 1000,
                    ease: "Sine.easeInOut"
                });
            }
        });
    }

    private onIntroductionComplete() {
        console.log("Fine Intro. Avvio gioco...");
        this.scene.start("Scene1");
    }
}