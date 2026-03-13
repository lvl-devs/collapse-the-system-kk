import Phaser from "phaser";

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export default class Pathfinder {
  private layer: Phaser.Tilemaps.TilemapLayer;
  private width: number;
  private height: number;

  constructor(layer: Phaser.Tilemaps.TilemapLayer) {
    this.layer = layer;
    this.width = layer.tilemap.width;
    this.height = layer.tilemap.height;
  }

  public findPath(startWorld: Phaser.Math.Vector2, endWorld: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
    const startTile = this.layer.worldToTileXY(startWorld.x, startWorld.y);
    const endTile = this.layer.worldToTileXY(endWorld.x, endWorld.y);

    if (!startTile || !endTile || !this.isWalkable(startTile.x, startTile.y)) {
      return [];
    }
    
    const openList: Node[] = [];
    const closedList: boolean[][] = Array.from({ length: this.height }, () => Array(this.width).fill(false));

    const startNode: Node = {
      x: startTile.x,
      y: startTile.y,
      g: 0,
      h: this.heuristic(startTile.x, startTile.y, endTile.x, endTile.y),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    
    openList.push(startNode);

    let emergencyBreak = 2000;

    while (openList.length > 0 && emergencyBreak > 0) {
      emergencyBreak--;
      
      let lowestIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[lowestIndex].f) {
          lowestIndex = i;
        }
      }

      const current = openList.splice(lowestIndex, 1)[0];
      closedList[current.y][current.x] = true;

      if (current.x === endTile.x && current.y === endTile.y) {
        return this.reconstructPath(current);
      }

      const neighbors = this.getNeighbors(current.x, current.y);
      for (const neighbor of neighbors) {
        if (closedList[neighbor.y][neighbor.x]) {
          continue;
        }

        const gScore = current.g + 1;
        
        let neighborNode = openList.find(n => n.x === neighbor.x && n.y === neighbor.y);
        if (!neighborNode) {
          neighborNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: this.heuristic(neighbor.x, neighbor.y, endTile.x, endTile.y),
            f: 0,
            parent: current
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openList.push(neighborNode);
        } else if (gScore < neighborNode.g) {
          neighborNode.g = gScore;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    return [];
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const tile = this.layer.getTileAt(x, y);
    // tile exists, is not empty, and collides is false (or index is part of floor)
    // Actually, in DungeonGenerator, collision is set by exclusion of floor tiles.
    // So if it has physical collision on the layer, it's NOT walkable.
    return tile != null && tile.index >= 0 && !tile.collides;
  }

  private getNeighbors(x: number, y: number): {x: number, y: number}[] {
    const neighbors: {x: number, y: number}[] = [];
    if (this.isWalkable(x, y - 1)) neighbors.push({ x, y: y - 1 });
    if (this.isWalkable(x, y + 1)) neighbors.push({ x, y: y + 1 });
    if (this.isWalkable(x - 1, y)) neighbors.push({ x: x - 1, y });
    if (this.isWalkable(x + 1, y)) neighbors.push({ x: x + 1, y });
    return neighbors;
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private reconstructPath(node: Node): Phaser.Math.Vector2[] {
    const path: Phaser.Math.Vector2[] = [];
    let current: Node | null = node;
    while (current != null) {
      const worldX = current.x * this.layer.tilemap.tileWidth + this.layer.tilemap.tileWidth / 2;
      const worldY = current.y * this.layer.tilemap.tileHeight + this.layer.tilemap.tileHeight / 2;
      path.push(new Phaser.Math.Vector2(worldX, worldY));
      current = current.parent;
    }
    return path.reverse();
  }
}
