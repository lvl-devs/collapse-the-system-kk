import Phaser from "phaser";

export default class MiniGame4 extends Phaser.Scene {

    private sequence: number[] = [];
    private numbers: Phaser.GameObjects.Text[][] = [];

    private showing: boolean = true;
    private currentRow: number = 0;
    private clickedRows: boolean[] = [];

    constructor() {
        super({ key: "MiniGame4" });
    }

    preload(): void {

        this.load.image("bg", "../assets/images/display.png");

    }

    create(): void {

        // SFONDO
        const bg = this.add.image(
            this.scale.width / 2,
            this.scale.height / 2,
            "bg"
        );

        bg.setDisplaySize(800, 600);

        const gapX = 120;
        const gapY = 80;

        const startX = this.scale.width / 2 - (gapX * 1.5);
        const startY = this.scale.height / 2 - (gapY * 1.5);

        // CREA NUMERI
        for (let row = 0; row < 4; row++) {

            this.numbers[row] = [];

            for (let col = 0; col < 4; col++) {

                const x = startX + col * gapX;
                const y = startY + row * gapY;

                const number = this.add.text(
                    x,
                    y,
                    "0",
                    {
                        fontFamily: '"Press Start 2P"',
                        fontSize: "28px",
                        color: "#ffffff"
                    }
                )
                .setOrigin(0.5)
                .setInteractive();

                number.on("pointerdown", () => {

                    if (this.showing) return;

                    this.handleClick(row, col);

                });

                this.numbers[row][col] = number;

            }
        }

        this.generateSequence();
        this.showSequence();
    }

    private generateSequence(): void {

        this.sequence = [];
        this.currentRow = 0;
        this.clickedRows = [false, false, false, false];

        for (let row = 0; row < 4; row++) {

            const randomCol = Phaser.Math.Between(0,3);
            this.sequence.push(randomCol);

        }

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {

                this.numbers[r][c].setColor("#ffffff");

                this.numbers[r][c].setText(
                    Phaser.Math.Between(0,1).toString()
                );

            }
        }

    }

    private showSequence(): void {

        this.showing = true;

        this.sequence.forEach((col, row) => {

            this.time.delayedCall(row * 700, () => {

                this.numbers[row][col].setColor("#00ff00");

                this.time.delayedCall(400, () => {

                    this.numbers[row][col].setColor("#ffffff");

                });

            });

        });

        this.time.delayedCall(3200, () => {

            this.showing = false;

        });

    }

    private handleClick(row: number, col: number): void {

        if (this.clickedRows[row]) return;

        const correctCol = this.sequence[row];

        if (col === correctCol && row === this.currentRow) {

            this.numbers[row][col].setColor("#00ff00");

            this.clickedRows[row] = true;
            this.currentRow++;

            if (this.currentRow === 4) {

                this.showWin();

            }

        } else {

            this.numbers[row][col].setColor("#ff0000");

            this.time.delayedCall(1000, () => {

                this.generateSequence();
                this.showSequence();

            });

        }

    }

    private showWin(): void {

        this.showing = true;

        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {

                this.numbers[r][c].destroy();

            }
        }

        this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            "ACCESSO GARANTITO",
            {
                fontFamily: '"Press Start 2P"',
                fontSize: "28px",
                color: "#00ff00"
            }
        ).setOrigin(0.5);

    }

}

const config: Phaser.Types.Core.GameConfig = {

    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#000000",
    scene: [MiniGame4]

};

new Phaser.Game(config);