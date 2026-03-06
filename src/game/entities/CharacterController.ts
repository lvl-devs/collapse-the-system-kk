import Phaser from "phaser";

export type CharacterDirection = "up" | "down" | "left" | "right";

export interface CharacterInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type CharacterInputProvider = () => CharacterInputState;

export interface CharacterFrameConfig {
  walk: Record<CharacterDirection, { start: number; end: number }>;
  idle: Record<CharacterDirection, number>;
}

export interface CharacterControllerConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  textureKey: string;
  frameConfig: CharacterFrameConfig;
  speed: number;
  animationNamespace?: string;
  frameRate?: number;
  repeat?: number;
  depth?: number;
  bounce?: number;
  collideWorldBounds?: boolean;
  initialDirection?: CharacterDirection;
  prioritizeVertical?: boolean;
  inputProvider?: CharacterInputProvider;
}

export function createKeyboardMovementInput(scene: Phaser.Scene): CharacterInputProvider {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    return () => ({ up: false, down: false, left: false, right: false });
  }

  const cursors = keyboard.createCursorKeys();
  const wasd = {
    up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
  };

  return () => ({
    up: !!(cursors.up?.isDown || wasd.up.isDown),
    down: !!(cursors.down?.isDown || wasd.down.isDown),
    left: !!(cursors.left?.isDown || wasd.left.isDown),
    right: !!(cursors.right?.isDown || wasd.right.isDown),
  });
}

export default class CharacterController {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;

  private readonly scene: Phaser.Scene;
  private readonly frameConfig: CharacterFrameConfig;
  private readonly inputProvider: CharacterInputProvider;
  private readonly speed: number;
  private readonly prioritizeVertical: boolean;
  private readonly animationKeys: Record<CharacterDirection, string>;

  private lastDirection: CharacterDirection;

  constructor(config: CharacterControllerConfig) {
    this.scene = config.scene;
    this.frameConfig = config.frameConfig;
    this.speed = config.speed;
    this.prioritizeVertical = config.prioritizeVertical ?? true;
    this.inputProvider = config.inputProvider ?? (() => ({ up: false, down: false, left: false, right: false }));
    this.lastDirection = config.initialDirection ?? "down";

    const namespace = config.animationNamespace ?? config.textureKey;
    this.animationKeys = {
      up: `${namespace}-walk-up`,
      down: `${namespace}-walk-down`,
      left: `${namespace}-walk-left`,
      right: `${namespace}-walk-right`,
    };

    this.sprite = this.scene.physics.add.sprite(config.x, config.y, config.textureKey);
    this.sprite.setDepth(config.depth ?? 10);
    this.sprite.setBounce(config.bounce ?? 0);
    this.sprite.setCollideWorldBounds(config.collideWorldBounds ?? true);

    this.ensureAnimations(config.textureKey, config.frameRate ?? 8, config.repeat ?? -1);
    this.sprite.setFrame(this.frameConfig.idle[this.lastDirection]);
  }

  update(): void {
    const input = this.inputProvider();

    const vx = input.left ? -this.speed : input.right ? this.speed : 0;
    const vy = input.up ? -this.speed : input.down ? this.speed : 0;

    this.sprite.setVelocity(vx, vy);

    if (vx === 0 && vy === 0) {
      this.sprite.stop();
      this.sprite.setFrame(this.frameConfig.idle[this.lastDirection]);
      return;
    }

    const direction = this.resolveDirection(vx, vy);
    this.lastDirection = direction;
    this.sprite.play(this.animationKeys[direction], true);
  }

  stop(): void {
    this.sprite.setVelocity(0, 0);
    this.sprite.stop();
    this.sprite.setFrame(this.frameConfig.idle[this.lastDirection]);
  }

  private resolveDirection(vx: number, vy: number): CharacterDirection {
    if (this.prioritizeVertical) {
      if (vy < 0) return "up";
      if (vy > 0) return "down";
      if (vx < 0) return "left";
      return "right";
    }

    if (vx < 0) return "left";
    if (vx > 0) return "right";
    if (vy < 0) return "up";
    return "down";
  }

  private ensureAnimations(textureKey: string, frameRate: number, repeat: number): void {
    const { walk } = this.frameConfig;
    const keys = this.animationKeys;

    if (!this.scene.anims.exists(keys.down)) {
      this.scene.anims.create({
        key: keys.down,
        frames: this.scene.anims.generateFrameNumbers(textureKey, walk.down),
        frameRate,
        repeat,
      });
    }

    if (!this.scene.anims.exists(keys.left)) {
      this.scene.anims.create({
        key: keys.left,
        frames: this.scene.anims.generateFrameNumbers(textureKey, walk.left),
        frameRate,
        repeat,
      });
    }

    if (!this.scene.anims.exists(keys.right)) {
      this.scene.anims.create({
        key: keys.right,
        frames: this.scene.anims.generateFrameNumbers(textureKey, walk.right),
        frameRate,
        repeat,
      });
    }

    if (!this.scene.anims.exists(keys.up)) {
      this.scene.anims.create({
        key: keys.up,
        frames: this.scene.anims.generateFrameNumbers(textureKey, walk.up),
        frameRate,
        repeat,
      });
    }
  }
}