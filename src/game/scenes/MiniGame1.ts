import Phaser from 'phaser';

export default class MiniGame1 extends Phaser.Scene {
    private code: string = '';
    private secretCode: string = '';
    private codeDisplay: Phaser.GameObjects.Text;
    private buttons: Phaser.GameObjects.Rectangle[] = [];
    private feedbackText: Phaser.GameObjects.Text;
    private inputEnabled: boolean = true;
    private keyboardListener: Phaser.Events.EventEmitter;
    private imageButtons: Map<number, Phaser.GameObjects.Image> = new Map();

    constructor() {
        super('MiniGame');
    }

    create() {
        this.generateSecretCode();
        
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Titolo
        this.add.text(centerX, 40, 'Inserisci il codice', {
            fontSize: '32px',
            color: '#fff'
        }).setOrigin(0.5);

        // Display codice segreto (a destra)
        this.add.text(this.cameras.main.width - 20, 40, `Codice: ${this.secretCode}`, {
            fontSize: '18px',
            color: '#fff'
        }).setOrigin(1, 0);

        // Display codice inserito
        this.codeDisplay = this.add.text(centerX, 110, '_ _ _ _', {
            fontSize: '56px',
            color: '#0f0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Tastierino 3x3 + C, 0, OK
        this.createNumericKeypad();
        this.createActionButtons();

        // Feedback
        this.feedbackText = this.add.text(centerX, centerY + 180, '', {
            fontSize: '24px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Input da tastiera
        this.keyboardListener = this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
            if (!this.inputEnabled) return;
            const key = event.key;
            if (key >= '0' && key <= '9') {
                this.addDigit(key);
            } else if (key.toLowerCase() === 'c') {
                this.resetCode();
            } else if (key === 'Backspace') {
                this.removeLastDigit();
            } else if (key === 'Enter') {
                this.checkCode();
            }
        });
    }

    private generateSecretCode(): void {
        this.secretCode = '';
        for (let i = 0; i < 4; i++) {
            this.secretCode += Math.floor(Math.random() * 10);
        }
    }

    private createNumericKeypad(): void {
        const centerX = this.cameras.main.width / 2;
        const buttonSize = 62; // leggermente più piccolo
        const spacing = 30; // più spazio tra i pulsanti
        const startX = centerX - ((3 * buttonSize + 2 * spacing) / 2);
        const startY = 200;

        // Grid 3x3 con numeri 1-9
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const x = startX + col * (buttonSize + spacing);
                const y = startY + row * (buttonSize + spacing);
                const buttonNum = row * 3 + col + 1;
                this.createImageButton(x, y, buttonNum.toString(), buttonNum, `button_${buttonNum}`, `button_${buttonNum}_pressed`);
            }
        }
    }

    private createButton(x: number, y: number, label: string, value: number): void {
        const size = 62;
        const button = this.add.rectangle(x, y, size, size, 0x00dd00);
        button.setStrokeStyle(3, 0x000000);
        button.setInteractive({ useHandCursor: true });
        
        this.add.text(x, y, label, {
            fontSize: '22px',
            color: '#00ffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        button.on('pointerdown', () => {
            if (this.inputEnabled) this.addDigit(value.toString());
        });
        this.buttons.push(button);
    }

    private createImageButton(x: number, y: number, label: string, value: number, imageKey: string, pressedImageKey: string): void {
        const button = this.add.image(x, y, imageKey);
        button.setScale(0.72); // leggermente più piccolo
        button.setInteractive({ useHandCursor: true });

        // Mantieni pressed mentre il mouse è premuto: azione eseguita al rilascio
        button.on('pointerdown', () => {
            if (this.inputEnabled) {
                button.setTexture(pressedImageKey);
            }
        });

        button.on('pointerup', () => {
            if (this.inputEnabled) {
                // Gestisci i diversi bottoni al rilascio
                if (value === -1) { // Bottone C
                    this.resetCode();
                } else if (value === -2) { // Bottone OK
                    this.checkCode();
                } else {
                    // Numero normale
                    this.addDigit(value.toString());
                }
                button.setTexture(imageKey);
            }
        });

        button.on('pointerout', () => {
            if (this.inputEnabled) {
                button.setTexture(imageKey);
            }
        });

        // Registra il bottone per illuminarlo da tastiera (solo per i numeri)
        if (value >= 0) {
            this.imageButtons.set(value, button);
        }

        this.buttons.push(button);
    }

    private createActionButtons(): void {
        const centerX = this.cameras.main.width / 2;
        const buttonSize = 62;
        const spacing = 30;
        const startX = centerX - ((3 * buttonSize + 2 * spacing) / 2);
        const startY = 200 + 3 * (buttonSize + spacing);

        // C (Clear)
        this.createImageButton(startX, startX ? startY : startY, 'C', -1, 'button_c', 'button_c_pressed');

        // 0
        this.createImageButton(startX + (buttonSize + spacing), startY, '0', 0, 'button_0', 'button_0_pressed');

        // OK
        this.createImageButton(startX + 2 * (buttonSize + spacing), startY, 'OK', -2, 'button_ok', 'button_ok_pressed');
    }

    private addDigit(digit: string): void {
        if (this.code.length < 4) {
            this.code += digit;
            this.updateDisplay();
            
            // Illumina il bottone immagine se esiste
            const value = parseInt(digit);
            if (this.imageButtons.has(value)) {
                const button = this.imageButtons.get(value);
                if (button) {
                    button.setTexture(`button_${value}_pressed`);
                    this.time.delayedCall(100, () => {
                        button.setTexture(`button_${value}`);
                    });
                }
            }
        }
    }

    private removeLastDigit(): void {
        if (this.code.length > 0) {
            this.code = this.code.slice(0, -1);
            this.updateDisplay();
        }
    }

    private updateDisplay(): void {
        const display = this.code.split('').map(d => d).join(' ') + 
            ' '.repeat((4 - this.code.length) * 2);
        this.codeDisplay.setText(display);
    }

    private checkCode(): void {
        if (this.code === this.secretCode) {
            this.feedbackText.setText('✓ Codice Corretto!');
            this.feedbackText.setColor('#00ff00');
            this.inputEnabled = false;
            this.time.delayedCall(2000, () => this.scene.stop());
        } else {
            this.inputEnabled = false;
            this.feedbackText.setText('✗ Codice Sbagliato!');
            this.feedbackText.setColor('#ff0000');
            // Reset automatico dopo 2 secondi
            this.time.delayedCall(2000, () => {
                this.resetCode();
                this.inputEnabled = true;
                this.feedbackText.setText('');
            });
        }
    }

    private resetCode(): void {
        this.code = '';
        this.feedbackText.setText('');
        this.updateDisplay();
    }
}