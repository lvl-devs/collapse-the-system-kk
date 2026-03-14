import Phaser from "phaser";

export default class MenuBackdrop extends Phaser.Scene {
  private video?: Phaser.GameObjects.Video;

  constructor() {
    super({ key: "MenuBackdrop" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.video = this.add.video(width / 2, height / 2, "bg-menu");
    this.video.setOrigin(0.5);
    this.video.play(true);

    const layout = () => {
      if (!this.video) return;
      this.video.setPosition(this.scale.width / 2, this.scale.height / 2);

      const sourceW = this.video.width || 1;
      const sourceH = this.video.height || 1;
      const scale = Math.max(this.scale.width / sourceW, this.scale.height / sourceH);
      this.video.setScale(scale);
    };

    this.video.on("created", layout);
    layout();
    this.scale.on("resize", layout);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", layout);
      this.video?.off("created", layout);
    });
  }
}
