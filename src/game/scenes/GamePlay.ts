export default class GamePlay extends Phaser.Scene {
  constructor() { super({ key: "GamePlay" }); }

  preload() {
    this.load.image("bg_core", "../assets/images/bg_core.png");
  }
  
  create() {
    const { width, height } = this.scale;
    const bg = this.add.image(width / 2, height / 2, "bg_core");
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0);

 

    const applyChrome = (txt: Phaser.GameObjects.Text, colors: { t: string, m: string, b: string }) => {
        const ctx = txt.context as CanvasRenderingContext2D;
        const grad = ctx.createLinearGradient(0, 0, 0, txt.height);
        grad.addColorStop(0, "#FFFFFF");
        grad.addColorStop(0.15, colors.t);
        grad.addColorStop(0.48, colors.m);
        grad.addColorStop(0.50, "#000000");
        grad.addColorStop(0.52, colors.m);
        grad.addColorStop(1, colors.b);
        txt.setFill(grad);
    };

    const collapse = this.add.text(width / 2, height * 0.28, "C O L L A P S E", {
        fontFamily: "Orbitron", 
        fontSize: "95px", 
        fontStyle: "900", 
        stroke: "#ffffffae", 
        strokeThickness: 5
    }).setOrigin(0.5).setShadow(0, 0, "#00F5FF", 20, true, true);
    applyChrome(collapse, { t: "#A0FFFF", m: "#00F5FF", b: "#003A45" });

    const system = this.add.text(width / 2, height * 0.38, "THE SYSTEM", {
        fontFamily: "Orbitron", 
        fontSize: "72px", 
        fontStyle: "900", 
        stroke: "#ffffff", 
        strokeThickness: 5
    }).setOrigin(0.5).setShadow(0, 0, "#FF2E9E", 20, true, true);
    applyChrome(system, { t: "#FFD5F5", m: "#FF2E9E", b: "#330033" });



    const buttons = [{ t: 'PLAY', y: 0.60 }, { t: 'OPTIONS', y: 0.69 }, { t: 'CREDITS', y: 0.78 }];
    buttons.forEach((data, index) => {
        const btn = this.add.text(width / 2, height * data.y, data.t, {
            fontFamily: "Orbitron", fontSize: "55px", fontStyle: "bold", stroke: "#000000", strokeThickness: 5
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setShadow(0, 0, "#00F5FF", 10, true, true);

        const bCtx = btn.context as CanvasRenderingContext2D;
        const bGrad = bCtx.createLinearGradient(0, 0, 0, btn.height);
        bGrad.addColorStop(0, "#FFFFFF");
        bGrad.addColorStop(0.5, "#00F5FF");
        bGrad.addColorStop(1, "#005F6B");
        btn.setFill(bGrad);

        // --- AGGIUNTA DINAMICA: Floating (Oscillazione dei tasti) ---
        this.tweens.add({
            targets: btn,
            y: btn.y +6,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            delay: index * 200,
            ease: 'Sine.easeInOut'
        });

        btn.on("pointerover", () => { btn.setScale(1.1); btn.setTint(0xffffff); });
        btn.on("pointerout", () => { btn.setScale(1.0); btn.clearTint(); });

        btn.on("pointerdown", () => {
        if(data.t === "OPTIONS") {
        this.scene.start("Options");
    }
});
    });
}

}
