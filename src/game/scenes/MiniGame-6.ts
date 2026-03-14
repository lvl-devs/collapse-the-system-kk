import Phaser from 'phaser';

export default class MiniGame6 extends Phaser.Scene {

    private static readonly NUMERIC_BUTTON_KEYS = [
        'button_0',
        'button_1',
        'button_2',
        'button_3',
        'button_4',
        'button_5',
        'button_6',
        'button_7',
        'button_8',
        'button_9',
    ] as const;

    private static readonly ACTION_BUTTON_KEYS = [
        'button_c',
        'button_ok',
    ] as const;

    private code: string = '';
    private secretCode: string = '';

    private titleText!: Phaser.GameObjects.Text;
    private codeDisplay!: Phaser.GameObjects.Text;
    private errorText!: Phaser.GameObjects.Text;
    private successText!: Phaser.GameObjects.Text;

    private buttons: Phaser.GameObjects.GameObject[] = [];
    private inputEnabled: boolean = true;

    private imageButtons: Map<number, Phaser.GameObjects.Image> = new Map();

    private clearButton?: Phaser.GameObjects.Image;
    private okButton?: Phaser.GameObjects.Image;

    private keySound!: Phaser.Sound.BaseSound;

    constructor() {
        super('MiniGame6');
    }

    preload() {

        this.loadImageIfMissing('background_wall', 'images/bg-hacker.png');
        this.loadImageIfMissing('keypad_bg', 'images/KEYPAD.png');

        MiniGame6.NUMERIC_BUTTON_KEYS.forEach((key) => {
            const digit = key.replace('button_', '');
            this.loadImageIfMissing(key, `images/${digit}.png`);
            this.loadImageIfMissing(`${key}_pressed`, `images/${digit}_pressed.png`);
        });

        MiniGame6.ACTION_BUTTON_KEYS.forEach((key) => {
            const action = key.replace('button_', '');
            this.loadImageIfMissing(key, `images/${action}.png`);
            this.loadImageIfMissing(`${key}_pressed`, `images/${action}_pressed.png`);
        });

        this.loadAudioIfMissing('key_beep', 'sounds/keypad_beep.mp3');
    }

    private loadImageIfMissing(key: string, path: string): void {
        if (!this.textures.exists(key)) {
            this.load.image(key, path);
        }
    }

    private loadAudioIfMissing(key: string, path: string): void {
        if (!this.cache.audio.exists(key)) {
            this.load.audio(key, path);
        }
    }

    private exitMinigame() {
  this.scene.stop();
  this.scene.resume("GamePlay");
}

    create() {

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // SFONDO
        const bg = this.add.image(centerX, centerY, 'background_wall');

        bg.setDisplaySize(
            this.cameras.main.width,
            this.cameras.main.height
        );

        this.generateSecretCode();

        const titleY = 110;
        const codeDisplayY = titleY + 60;
        const keypadStartY = codeDisplayY + 60;

        this.keySound = this.sound.add('key_beep');

        this.add.image(centerX, centerY, 'keypad_bg').setScale(0.45);

        this.titleText = this.add.text(centerX - 5, titleY - 10, 'Enter Pin', {
            fontSize: '30px',
            color: '#0f0',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.codeDisplay = this.add.text(centerX - 5, titleY + 30, '_ _ _ _', {
            fontSize: '40px',
            color: '#0f0',
            fontFamily: '"DigitalDisco"',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.errorText = this.add.text(centerX - 5, titleY + 10, '', {
            fontSize: '32px',
            color: '#ff0000',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setVisible(false);

        this.successText = this.add.text(centerX - 5, titleY + 10, '', {
            fontSize: '32px',
            color: '#00ff00',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setVisible(false);

        // DEBUG
        /*this.add.text(
            this.cameras.main.width - 20,
            40,
            `Codice: ${this.secretCode}`,
            {
                fontSize: '26px',
                color: '#ffffff',
                fontFamily: '"DigitalDisco"',
            }
        ).setOrigin(1, 0);*/

        this.createNumericKeypad(keypadStartY);
        this.createActionButtons(keypadStartY);

        this.createCloseButton();

        const keyboard = this.input.keyboard;

        keyboard?.on('keydown', (event: KeyboardEvent) => {

            if (!this.inputEnabled) return;

            const key = event.key;

            if (key >= '0' && key <= '9') {

                this.playKeySound();

                const num = parseInt(key);

                const button = this.imageButtons.get(num);
                if (button) this.animateButtonPress(button, `button_${num}`);

                this.addDigit(key);
            }

            else if (key === 'Backspace') {

                this.playKeySound();

                if (this.clearButton)
                    this.animateButtonPress(this.clearButton, 'button_c');

                this.removeLastDigit();
            }

            else if (key === 'Enter') {

                if (this.okButton)
                    this.animateButtonPress(this.okButton, 'button_ok');

                this.checkCode();
            }

            else if (key.toLowerCase() === 'c') {

                this.playKeySound();

                if (this.clearButton)
                    this.animateButtonPress(this.clearButton, 'button_c');

                this.resetCode();
            }
             else if (key === 'Escape') {
        this.exitMinigame();
    }

        });
    }

    private createCloseButton(): void {

        const centerX = this.cameras.main.width / 2;

        const x = centerX + 220;
        const y = 90;

        const radius = 14;

        const graphics = this.add.graphics();

        graphics.lineStyle(3, 0xff0000);
        graphics.strokeCircle(x, y, radius);

        graphics.lineStyle(3, 0xffffff);
        graphics.beginPath();
        graphics.moveTo(x - 6, y - 6);
        graphics.lineTo(x + 6, y + 6);
        graphics.moveTo(x + 6, y - 6);
        graphics.lineTo(x - 6, y + 6);
        graphics.strokePath();

        const hitArea = this.add.circle(x, y, radius + 4, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {

            this.scene.start('GamePlay');

        });
    }

    private playKeySound(): void {

        this.keySound.stop();
        this.keySound.play();
    }

    private animateButtonPress(button: Phaser.GameObjects.Image, baseTexture: string): void {

        button.setTexture(`${baseTexture}_pressed`);

        this.time.delayedCall(120, () => {

            button.setTexture(baseTexture);

        });
    }

    private generateSecretCode(): void {

        this.secretCode = '';

        for (let i = 0; i < 4; i++) {
            this.secretCode += Math.floor(Math.random() * 10);
        }
    }

    private createNumericKeypad(startY: number): void {

        const centerX = this.cameras.main.width / 2;

        const buttonSize = 50;
        const spacingX = 60;
        const spacingY = 34;

        const startX = centerX - ((3 * buttonSize + 2 * spacingX) / 2) + 28;

        for (let row = 0; row < 3; row++) {

            for (let col = 0; col < 3; col++) {

                const x = startX + col * (buttonSize + spacingX);
                const y = startY + row * (buttonSize + spacingY);

                const buttonNum = row * 3 + col + 1;

                this.createImageButton(
                    x,
                    y,
                    buttonNum,
                    `button_${buttonNum}`,
                    `button_${buttonNum}_pressed`
                );
            }
        }
    }

    private createImageButton(
        x: number,
        y: number,
        value: number,
        imageKey: string,
        pressedImageKey: string
    ): void {

        const button = this.add.image(x, y, imageKey);

        button.setScale(0.72);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => {

            if (!this.inputEnabled) return;

            button.setTexture(pressedImageKey);
            this.playKeySound();
        });

        button.on('pointerup', () => {

            if (!this.inputEnabled) return;

            if (value === -1) this.removeLastDigit();
            else if (value === -2) this.checkCode();
            else this.addDigit(value.toString());

            button.setTexture(imageKey);
        });

        button.on('pointerout', () => {

            if (this.inputEnabled)
                button.setTexture(imageKey);
        });

        if (value >= 0)
            this.imageButtons.set(value, button);

        if (value === -1)
            this.clearButton = button;

        if (value === -2)
            this.okButton = button;

        this.buttons.push(button);
    }

    private createActionButtons(startY: number): void {

        const centerX = this.cameras.main.width / 2;

        const buttonSize = 50;
        const spacingX = 60;
        const spacingY = 34;

        const startX = centerX - ((3 * buttonSize + 2 * spacingX) / 2) + 27;

        const actionButtonsY = startY + 3 * (buttonSize + spacingY);

        this.createImageButton(startX, actionButtonsY, -1, 'button_c', 'button_c_pressed');

        this.createImageButton(
            startX + (buttonSize + spacingX),
            actionButtonsY,
            0,
            'button_0',
            'button_0_pressed'
        );

        this.createImageButton(
            startX + 2 * (buttonSize + spacingX),
            actionButtonsY,
            -2,
            'button_ok',
            'button_ok_pressed'
        );
    }

    private addDigit(digit: string): void {

        if (this.code.length >= 4) return;

        this.code += digit;

        this.updateDisplay();

        if (this.code.length === 4) {

            this.time.delayedCall(150, () => {

                if (this.inputEnabled)
                    this.checkCode();

            });
        }
    }

    private removeLastDigit(): void {

        if (this.code.length > 0) {

            this.code = this.code.slice(0, -1);
            this.updateDisplay();
        }
    }

    private updateDisplay(): void {

        const filled = this.code.split('').join(' ');
        const emptyCount = 4 - this.code.length;
        const empty = Array(emptyCount).fill('_').join(' ');

        const display =
            filled +
            (filled && emptyCount > 0 ? ' ' + empty : empty);

        this.codeDisplay.setText(display);
    }

    private checkCode(): void {

        this.inputEnabled = false;

        this.titleText.setVisible(false);
        this.codeDisplay.setVisible(false);

        if (this.code === this.secretCode) {

            this.successText.setText('Correct Pin');
            this.successText.setVisible(true);

            this.time.delayedCall(2000, () => {

                this.scene.stop();

            });

        }
        else {

            this.cameras.main.shake(300, 0.01);

            this.errorText.setText('Incorrect Pin');
            this.errorText.setVisible(true);

            this.time.delayedCall(1800, () => {

                this.errorText.setVisible(false);

                this.resetCode();

                this.titleText.setVisible(true);
                this.codeDisplay.setVisible(true);

                this.inputEnabled = true;

            });
        }
    }

    private resetCode(): void {

        this.code = '';
        this.updateDisplay();
    }
}