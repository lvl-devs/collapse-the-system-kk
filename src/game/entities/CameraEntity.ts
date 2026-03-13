import Phaser from "phaser";
import type { DungeonWallSide } from "../systems/DungeonGenerator";

export default class CameraEntity extends Phaser.GameObjects.Container {
  private beamGraphics: Phaser.GameObjects.Graphics;
  private roomBounds: Phaser.Geom.Rectangle;
  private collisionLayer: Phaser.Tilemaps.TilemapLayer;
  
  private currentAngle: number;
  private minAngle: number;
  private maxAngle: number;
  private rotationSpeed: number;
  private sweepDirection: number = 1;

  public readonly radius: number;
  public readonly fov: number; // in radians

  constructor(
    scene: Phaser.Scene, 
    x: number, 
    y: number, 
    wall: DungeonWallSide,
    roomBounds: Phaser.Geom.Rectangle,
    collisionLayer: Phaser.Tilemaps.TilemapLayer,
    radius: number = 200, 
    fovDeg: number = 60
  ) {
    super(scene, x, y);
    this.roomBounds = new Phaser.Geom.Rectangle(roomBounds.x, roomBounds.y, roomBounds.width, roomBounds.height);
    this.collisionLayer = collisionLayer;

    this.radius = radius;
    this.fov = Phaser.Math.DegToRad(fovDeg);

    // Setup base angles according to which wall it's on
    let baseAngle = 0;
    if (wall === "top") baseAngle = 90;
    else if (wall === "bottom") baseAngle = -90;
    else if (wall === "left") baseAngle = 0;
    else if (wall === "right") baseAngle = 180;

    this.minAngle = Phaser.Math.DegToRad(baseAngle - 45);
    this.maxAngle = Phaser.Math.DegToRad(baseAngle + 45);
    this.currentAngle = this.minAngle;
    this.rotationSpeed = 0.5; // rad per sec

    // Draw the "camera" body
    const body = scene.add.circle(0, 0, 8, 0x333333);
    body.setStrokeStyle(2, 0x000000);
    body.setDepth(20);
    this.add(body);

    // Draw the beam directly in world space to avoid container/RT offset issues.
    this.beamGraphics = scene.add.graphics();
    this.beamGraphics.setDepth(15);

    scene.add.existing(this);
  }

  update(dt: number) {
    const delta = dt / 1000;

    // Sweep animation
    this.currentAngle += this.rotationSpeed * this.sweepDirection * delta;
    if (this.currentAngle >= this.maxAngle) {
      this.currentAngle = this.maxAngle;
      this.sweepDirection = -1;
    } else if (this.currentAngle <= this.minAngle) {
      this.currentAngle = this.minAngle;
      this.sweepDirection = 1;
    }

    this.drawBeam();
  }

  private drawBeam() {
    this.beamGraphics.clear();

    const startAngle = this.currentAngle - this.fov / 2;
    const endAngle = this.currentAngle + this.fov / 2;
    
    // Draw a tile-clamped cone polygon so the beam stays inside walls.
    const segments = 28;
    this.beamGraphics.fillStyle(0xff0000, 0.35); // semi-transparent red
    this.beamGraphics.moveTo(this.x, this.y);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const dist = this.castRayDistance(angle);
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;
      this.beamGraphics.lineTo(px, py);
    }
    this.beamGraphics.closePath();
    this.beamGraphics.fillPath();
  }

  override destroy(fromScene?: boolean): void {
    this.beamGraphics.destroy();
    super.destroy(fromScene);
  }

  detectsTarget(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container): boolean {
    const targetX = target.x;
    const targetY = target.y;

    // Do not detect outside this camera's room area.
    if (!this.roomBounds.contains(targetX, targetY)) {
      return false;
    }

    // 1. Distance check
    const distSq = Phaser.Math.Distance.Squared(this.x, this.y, targetX, targetY);
    if (distSq > this.radius * this.radius) {
      return false;
    }

    // 2. Angle check
    const angleToTarget = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    
    // Normalize angles for comparison
    const diff = Phaser.Math.Angle.ShortestBetween(
        Phaser.Math.RadToDeg(this.currentAngle), 
        Phaser.Math.RadToDeg(angleToTarget)
    );

    const fovDeg = Phaser.Math.RadToDeg(this.fov);
    if (Math.abs(diff) <= fovDeg / 2) {
      return this.hasLineOfSight(targetX, targetY);
    }

    return false;
  }

  private castRayDistance(angle: number): number {
    const step = Math.max(4, this.collisionLayer.tilemap.tileWidth / 4);
    const originTileX = this.collisionLayer.worldToTileX(this.x);
    const originTileY = this.collisionLayer.worldToTileY(this.y);

    for (let dist = step; dist <= this.radius; dist += step) {
      const wx = this.x + Math.cos(angle) * dist;
      const wy = this.y + Math.sin(angle) * dist;

      if (!this.roomBounds.contains(wx, wy)) {
        return Math.max(0, dist - step);
      }

      const tile = this.collisionLayer.getTileAtWorldXY(wx, wy, true);
      if (tile?.collides) {
        const sameOriginTile = tile.x === originTileX && tile.y === originTileY;
        if (!sameOriginTile) {
          return Math.max(0, dist - step);
        }
      }
    }

    return this.radius;
  }

  private hasLineOfSight(targetX: number, targetY: number): boolean {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= 1) {
      return true;
    }

    const dirX = dx / distance;
    const dirY = dy / distance;
    const step = Math.max(4, this.collisionLayer.tilemap.tileWidth / 4);
    const originTileX = this.collisionLayer.worldToTileX(this.x);
    const originTileY = this.collisionLayer.worldToTileY(this.y);

    for (let dist = step; dist < distance; dist += step) {
      const wx = this.x + dirX * dist;
      const wy = this.y + dirY * dist;

      if (!this.roomBounds.contains(wx, wy)) {
        return false;
      }

      const tile = this.collisionLayer.getTileAtWorldXY(wx, wy, true);
      if (tile?.collides) {
        const sameOriginTile = tile.x === originTileX && tile.y === originTileY;
        if (!sameOriginTile) {
          return false;
        }
      }
    }

    return true;
  }
}
