import Phaser from 'phaser';
import { GameData } from '../../GameData';

export default class Options extends Phaser.Scene {

    constructor() {
        super('Options');
    }

    preload() {
        this.load.image('bg_logo', '../assets/images/bg_logo.png');
    }

    create() {

        const { width, height } = this.scale;

        // ===== SFONDO CENTRATO =====
        const bg = this.add.image(width / 2, height / 2, 'bg_logo');
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale);

        const centerX = width / 2;
        const centerY = height / 2;

        // ===== CONTENITORE SETTINGS (CORNICE NEON) =====
        const panelWidth = 420;
        const panelHeight = 500;

        const panel = this.add.rectangle(
            centerX,
            centerY,
            panelWidth,
            panelHeight,
            0x000000,
            0.35
        );

        panel.setStrokeStyle(2, 0x00ffcc);

        // ===== HEADER SETTINGS =====
        const header = this.add.text(centerX, centerY - 230, 'SETTINGS', {
            fontFamily: 'Pixelify Sans',
            fontSize: '42px',
            color: '#00ffcc',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        header.setShadow(0, 0, '#00ffcc', 15, true, true);

        // ===== SLIDER SOUND EFFECTS =====
        this.createCyberSlider(centerX, centerY - 80, 'Sound Effects', 'graphics');

        // ===== SLIDER MUSIC =====
        this.createCyberSlider(centerX, centerY + 10, 'Music', 'audio');

        // ===== BACK BUTTON CIRCOLARE =====
        const backCircle = this.add.circle(centerX, centerY + 150, 45)
            .setStrokeStyle(2, 0x00ffcc)
            .setFillStyle(0x000000, 0.4)
            .setInteractive({ useHandCursor: true });

        const backText = this.add.text(centerX, centerY + 150, 'Back', {
            fontFamily: 'Pixelify Sans',
            fontSize: '22px',
            color: '#00ffcc'
        }).setOrigin(0.5);

        backCircle.on('pointerover', () => {
            backCircle.setScale(1.1);
            backText.setColor('#ffffff');
        });

        backCircle.on('pointerout', () => {
            backCircle.setScale(1);
            backText.setColor('#00ffcc');
        });

        backCircle.on('pointerdown', () => {
            this.scene.start('Menu');
        });
    }

    // =============================
    // CYBER SLIDER
    // =============================
    private createCyberSlider(
        x: number,
        y: number,
        label: string,
        settingKey: 'graphics' | 'audio'
    ) {

        const sliderWidth = 220;

        // LABEL
        const labelText = this.add.text(x, y - 30, label, {
            fontFamily: 'Pixelify Sans',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // TRACK (linea tratteggiata tech)
        const track = this.add.rectangle(x - sliderWidth / 2, y, sliderWidth, 4, 0x00ffcc)
            .setOrigin(0, 0.5)
            .setAlpha(0.6);

        const initialValue = GameData.settings[settingKey];

        // FILL
        const fill = this.add.rectangle(
            x - sliderWidth / 2,
            y,
            sliderWidth * initialValue,
            4,
            0x00ffcc
        ).setOrigin(0, 0.5);

        // HANDLE (quadrato tech)
        const handle = this.add.rectangle(
            x - sliderWidth / 2 + sliderWidth * initialValue,
            y,
            14,
            14,
            0x000000
        )
        .setStrokeStyle(2, 0x00ffcc)
        .setInteractive({ draggable: true, useHandCursor: true });

        this.input.setDraggable(handle);

        handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {

            const minX = track.x;
            const maxX = track.x + sliderWidth;

            const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
            handle.x = clampedX;

            const newValue = (clampedX - minX) / sliderWidth;

            fill.width = clampedX - minX;
            GameData.settings[settingKey] = newValue;

            if (settingKey === 'audio') {
                this.sound.volume = newValue;
            }
        });

        handle.on('pointerover', () => handle.setScale(1.2));
        handle.on('pointerout', () => handle.setScale(1));
    }
}