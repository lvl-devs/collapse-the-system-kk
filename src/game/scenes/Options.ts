import Phaser from 'phaser';
import { GameData } from '../../GameData';

export default class Options extends Phaser.Scene {
    constructor() {
        super('Options');
    }

    preload() {
        this.load.image('bg_options', '../assets/images/bg_core.png');
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. SFONDO
        const bg = this.add.image(centerX, centerY, 'bg_options');
        bg.setDisplaySize(width, height);

        // 2. PANNELLO CENTRALE
        const panelWidth = 700;
        const panelHeight = 500;
        const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x000000, 0.8);
        panel.setStrokeStyle(3, 0x00ffff);

        // 3. TITOLI
        this.add.text(centerX, centerY - 160, 'COLLAPSE', {
            fontFamily: 'Pixelify Sans', fontSize: '70px', color: '#00ffff', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#00ffff', 15, true, true);

        this.add.text(centerX, centerY - 100, 'THE SYSTEM', {
            fontFamily: 'Pixelify Sans', fontSize: '35px', color: '#ff00ff', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#ff00ff', 10, true, true);

        // 4. IMPOSTAZIONI DINAMICHE (Centrate verticalmente nel pannello)
        // Abbiamo rimosso Invert Y e Vibration come richiesto
        this.createDynamicSlider(centerX, centerY, 'Graphics', 'graphics');
        this.createDynamicSlider(centerX, centerY + 80, 'Audio', 'audio');

        // 5. PULSANTE BACK
        const backBtn = this.add.text(centerX, centerY + 180, '[ BACK ]', {
            fontFamily: 'Pixelify Sans', fontSize: '32px', color: '#00ffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ffffff' }).setScale(1.1));
        backBtn.on('pointerout', () => backBtn.setStyle({ color: '#00ffff' }).setScale(1));
        backBtn.on('pointerdown', () => this.scene.start('Menu'));
    }

    /**
     * Crea uno slider funzionante che aggiorna GameData.settings
     */
    private createDynamicSlider(x: number, y: number, label: string, settingKey: 'graphics' | 'audio') {
        const sliderWidth = 250;
        
        // Label (allineata a sinistra dell'area slider)
        this.add.text(x - 280, y, label, { 
            fontSize: '28px', color: '#00ffff', fontFamily: 'Pixelify Sans' 
        }).setOrigin(0, 0.5);

        // Barra di sfondo (Binario dello slider)
        const track = this.add.rectangle(x + 20, y, sliderWidth, 10, 0x333333).setOrigin(0, 0.5);
        
        // Barra di riempimento (Parte colorata)
        const initialValue = GameData.settings[settingKey];
        const fill = this.add.rectangle(x + 20, y, sliderWidth * initialValue, 10, 0x00ffff).setOrigin(0, 0.5);

        // Pallino di controllo (Handle)
        const handle = this.add.circle(x + 20 + (sliderWidth * initialValue), y, 14, 0xffffff)
            .setStrokeStyle(3, 0x00ffff)
            .setInteractive({ useHandCursor: true, draggable: true });

        // LOGICA DI TRASCINAMENTO
        handle.on('drag', (pointer: Phaser.Input.Pointer, dragX: number) => {
            // Limita il movimento dentro i confini della barra
            const minX = track.x;
            const maxX = track.x + sliderWidth;
            const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);

            handle.x = clampedX;

            // Calcola il valore percentuale (0.0 a 1.0)
            const newValue = (clampedX - minX) / sliderWidth;
            
            // Aggiorna la barra di riempimento visiva
            fill.width = clampedX - minX;

            // Aggiorna i dati reali nel GameData
            GameData.settings[settingKey] = newValue;

            // Esempio: Se è audio, potresti aggiornare il volume globale di Phaser qui
            if (settingKey === 'audio') {
                this.sound.volume = newValue;
            }
        });

        // Effetto visivo al tocco
        handle.on('pointerover', () => handle.setScale(1.2));
        handle.on('pointerout', () => handle.setScale(1.0));
    }
}