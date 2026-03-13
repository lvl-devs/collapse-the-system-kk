import Phaser from "phaser";
import Pathfinder from "../systems/Pathfinder";

export default class ChaserEntity extends Phaser.Physics.Arcade.Sprite {
  private target: Phaser.GameObjects.Sprite;
  private maxSpeed: number;
  private minDistance: number;
  private activeTimeRemaining: number;
  private isActiveChaser: boolean = false;
  private animationNamespace: string;
  
  private pathfinder?: Pathfinder;
  private currentPath: Phaser.Math.Vector2[] = [];
  private pathUpdateTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, textureSpace: string, target: Phaser.GameObjects.Sprite) {
    super(scene, x, y, textureSpace);
    
    this.target = target;
    this.maxSpeed = 150; // Slightly slower than player (160)
    this.minDistance = 50; // Stop before touching
    this.animationNamespace = textureSpace;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(10);
    this.setCollideWorldBounds(true);
    // Ignore collisions with ground/stuff layer for now so it can ghost through walls
    // or we can add it later in GamePlay

    this.initAnimations();
    this.setVisible(false);
    this.setActive(false);
    
    // Will be active for 5 seconds when spawned
    this.activeTimeRemaining = 0;
  }

  // Called when camera detects player
  spawn(x: number, y: number, pathfinder: Pathfinder) {
    this.pathfinder = pathfinder;
    this.setPosition(x, y);
    this.setVisible(true);
    this.setActive(true);
    this.isActiveChaser = true;
    this.activeTimeRemaining = 5000; // 5 seconds in ms
    this.currentPath = [];
    this.pathUpdateTimer = 0;
  }

  update(delta: number) {
    if (!this.isActiveChaser) return;

    const dist = Phaser.Math.Distance.BetweenPoints(this, this.target);
    
    // We update paths periodically or if we don't have one
    this.pathUpdateTimer -= delta;
    if (this.pathUpdateTimer <= 0 && this.pathfinder) {
      this.currentPath = this.pathfinder.findPath(
        new Phaser.Math.Vector2(this.x, this.y),
        new Phaser.Math.Vector2(this.target.x, this.target.y)
      );
      this.pathUpdateTimer = 500; // update path every 500ms
    }

    if (dist <= this.minDistance) {
      // Very close, stop
      this.setVelocity(0, 0);
      this.stop();
      this.activeTimeRemaining = 5000; // keep alive as long as player is pinned
      return;
    }

    if (this.currentPath.length > 0) {
      // we have a path
      this.activeTimeRemaining = 5000; // Reset timer as long as we can track player
      
      const nextNode = this.currentPath[0];
      const distToNode = Phaser.Math.Distance.Between(this.x, this.y, nextNode.x, nextNode.y);
      
      if (distToNode < 10 && this.currentPath.length > 1) {
        // Reached this node, move to next
        this.currentPath.shift();
      }
      
      const targetNode = this.currentPath[0];
      this.scene.physics.moveTo(this, targetNode.x, targetNode.y, this.maxSpeed);
      this.updateAnimation();
    } else {
      // no path? player might be hiding behind blocked door. Stop and countdown.
      this.setVelocity(0, 0);
      this.stop();
      this.activeTimeRemaining -= delta;
      
      if (this.activeTimeRemaining <= 0) {
        this.despawn();
      }
    }
  }

  private despawn() {
    this.isActiveChaser = false;
    this.setVisible(false);
    this.setActive(false);
    this.setVelocity(0, 0);
    this.stop();
  }

  private updateAnimation() {
    const vx = this.body?.velocity.x || 0;
    const vy = this.body?.velocity.y || 0;

    if (Math.abs(vx) > Math.abs(vy)) {
      if (vx < 0) this.play(`${this.animationNamespace}-walk-left`, true);
      else this.play(`${this.animationNamespace}-walk-right`, true);
    } else {
      if (vy < 0) this.play(`${this.animationNamespace}-walk-up`, true);
      else this.play(`${this.animationNamespace}-walk-down`, true);
    }
  }

  private initAnimations() {
    const frameRate = 8;
    const repeat = -1;
    const textureKey = this.animationNamespace; // e.g. "policeman"

    const frames = {
      walk: {
        down: { start: 0, end: 2 },
        left: { start: 3, end: 5 },
        right: { start: 6, end: 8 },
        up: { start: 9, end: 11 },
      }
    };

    if (!this.scene.anims.exists(`${textureKey}-walk-down`)) {
      this.scene.anims.create({
        key: `${textureKey}-walk-down`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, frames.walk.down),
        frameRate,
        repeat,
      });
      this.scene.anims.create({
        key: `${textureKey}-walk-left`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, frames.walk.left),
        frameRate,
        repeat,
      });
      this.scene.anims.create({
        key: `${textureKey}-walk-right`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, frames.walk.right),
        frameRate,
        repeat,
      });
      this.scene.anims.create({
        key: `${textureKey}-walk-up`,
        frames: this.scene.anims.generateFrameNumbers(textureKey, frames.walk.up),
        frameRate,
        repeat,
      });
    }
  }
}
