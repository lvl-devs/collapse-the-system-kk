import Phaser from "phaser";

export interface MapMetadata {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    spawnX: number;
    spawnY: number;
    tilesets: Phaser.Tilemaps.Tileset[];
    layers: Phaser.Tilemaps.TilemapLayer[];
    map: Phaser.Tilemaps.Tilemap;
    rawObjectLayers: any[];
}

export default class MapProcessor {
    static readonly COLLISION_PROP = "collision";
    static readonly IS_FLOOR_PROP = "isFloor";
    static readonly SPAWN_TYPE = "SpawnPoint";

    /**
     * Recursively extracts objectgroups from Tiled JSON data, traversing group layers.
     */
    static extractObjectLayers(rawLayers: any[]): any[] {
        let objectLayers: any[] = [];
        if (!rawLayers) return objectLayers;
        for (const layer of rawLayers) {
            if (layer.type === "objectgroup") {
                objectLayers.push(layer);
            } else if (layer.type === "group" && layer.layers) {
                objectLayers = objectLayers.concat(this.extractObjectLayers(layer.layers));
            }
        }
        return objectLayers;
    }

    /**
     * Processes a tilemap dynamically, determining layers, collisions, and spawn points based on properties and naming conventions.
     */
    static processMap(scene: Phaser.Scene, mapKey: string, tilesetMapping: Record<string, string> = {}): MapMetadata {
        const map = scene.make.tilemap({ key: mapKey });
        const tilesets: Phaser.Tilemaps.Tileset[] = [];

        // Dynamic Tileset assignment
        map.tilesets.forEach(t => {
            const textureKey = tilesetMapping[t.name] || t.name;
            if (scene.textures.exists(textureKey)) {
                const added = map.addTilesetImage(t.name, textureKey);
                if (added) tilesets.push(added);
            } else {
                // Try fuzzy matching if exact key doesn't exist
                const keys = scene.textures.getTextureKeys();
                const matchedKey = keys.find(k => k.includes(t.name) || t.name.includes(k));
                if (matchedKey) {
                    const added = map.addTilesetImage(t.name, matchedKey);
                    if (added) tilesets.push(added);
                }
            }
        });

        // Parse raw map data to extract nested object groups
        let rawObjectLayers: any[] = [];
        const rawMapData = scene.cache.tilemap.get(mapKey)?.data;
        if (rawMapData && rawMapData.layers) {
            rawObjectLayers = this.extractObjectLayers(rawMapData.layers);
        } else {
            // Fallback to Phaser's parsed objects if raw data is unavailable
            rawObjectLayers = map.objects || [];
        }

        const activeLayers: Phaser.Tilemaps.TilemapLayer[] = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const floorTiles: { x: number, y: number }[] = [];

        map.layers.forEach(layerData => {
            const layer = map.createLayer(layerData.name, tilesets, 0, 0);
            if (!layer) return;

            const lx = layerData.x || 0;
            const ly = layerData.y || 0;
            layer.setX(lx);
            layer.setY(ly);

            const hasCollisionProp = this.getProperty(layerData, this.COLLISION_PROP) === true;
            const isFloorProp = this.getProperty(layerData, this.IS_FLOOR_PROP) === true;

            const lowerName = layerData.name.toLowerCase();
            const isFloorName = lowerName.includes("floor") || lowerName.includes("pavimento") || lowerName.includes("ground");
            const isWallName = lowerName.includes("wall") || lowerName.includes("mura") || lowerName.includes("ostacoli") || lowerName.includes("obstacle") || lowerName.includes("collision");

            // Hardcoded fallback for the current map if no properties are present
            const isWallsLayer = layerData.name === "walls";

            if (hasCollisionProp || isWallsLayer || (isWallName && !isFloorProp)) {
                // If it's a collision layer, we might still want to exclude some specific GIDs if they are floor
                // But generally, the user wants versatility, so we rely on Tiled setup.
                layer.setCollisionByExclusion([-1]);
            }

            // Assign depth based on layer name semantics to ensure proper rendering order
            if (isFloorName) {
                layer.setDepth(0);
            } else if (lowerName.includes("top-wall")) {
                layer.setDepth(15);
            } else if (lowerName.includes("doors")) {
                layer.setDepth(5);
            } else if (isWallName) {
                layer.setDepth(1);
            } else {
                layer.setDepth(2);
            }

            activeLayers.push(layer);

            layer.forEachTile(tile => {
                if (tile.index === -1) return;
                const px = tile.pixelX + lx;
                const py = tile.pixelY + ly;
                minX = Math.min(minX, px);
                minY = Math.min(minY, py);
                maxX = Math.max(maxX, px + map.tileWidth);
                maxY = Math.max(maxY, py + map.tileHeight);

                // Identify potential spawn areas
                const tileProps = (tile as any).properties || {};
                if (tileProps[this.IS_FLOOR_PROP] === true || isFloorProp || isFloorName) {
                    floorTiles.push({ x: px + map.tileWidth / 2, y: py + map.tileHeight / 2 });
                }
            });
        });

        if (minX === Infinity) {
            minX = 0; minY = 0; maxX = scene.scale.width; maxY = scene.scale.height;
        }

        // Spawn point selection
        let spawnX = (minX + maxX) / 2;
        let spawnY = (minY + maxY) / 2;

        const spawnObject = map.findObject("objects", (obj) =>
            obj.type === this.SPAWN_TYPE ||
            obj.name?.toLowerCase().includes("spawn") ||
            obj.name === "player"
        );

        if (spawnObject && spawnObject.x != null && spawnObject.y != null) {
            spawnX = spawnObject.x;
            spawnY = spawnObject.y;
        } else if (floorTiles.length > 0) {
            const centerX = (minX + maxX) / 2;
            const centerY = ((minY + maxY) / 2) + 200; // Spostiamo lo spawn ideale più in basso
            let bestDist = Infinity;
            floorTiles.forEach(t => {
                const dist = Phaser.Math.Distance.Between(centerX, centerY, t.x, t.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    spawnX = t.x;
                    spawnY = t.y;
                }
            });
        }

        return { minX, minY, maxX, maxY, spawnX, spawnY, tilesets, layers: activeLayers, map, rawObjectLayers };
    }

    static getProperty(data: any, name: string): any {
        if (!data || !data.properties) return undefined;
        if (Array.isArray(data.properties)) {
            return data.properties.find((p: any) => p.name === name)?.value;
        }
        return data.properties[name];
    }
}
