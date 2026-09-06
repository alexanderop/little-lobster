import type * as Phaser from 'phaser';
import { generateLevel, type Level } from '../model/level';

export class ReefScenery {
  private water: Phaser.GameObjects.Image[] = [];
  private ledges: { x: number; image: Phaser.GameObjects.Image }[] = [];
  private floor: Phaser.GameObjects.TileSprite;

  constructor(
    private scene: Phaser.Scene,
    private level: Level = generateLevel(),
  ) {
    const texture =
      level.biome === 'kelp' ? 'kelp-forest-props' : 'crystal-cave-props';
    if (level.biome !== 'reef') {
      for (let i = 0; i < 15; i++) {
        const x = 240 + i * 250;
        this.ledges.push({
          x,
          image: scene.add
            .image(
              x,
              level.world.floor + 8,
              texture,
              i % 3 === 0 ? 'rock' : i % 3 === 1 ? 'plant' : 'plant-small',
            )
            .setOrigin(0.5, 1)
            .setDisplaySize(i % 3 === 1 ? 105 : 90, i % 3 === 1 ? 180 : 100)
            .setAlpha(0.8)
            .setDepth(-8),
        });
      }
    }
    for (const platform of level.platforms) {
      if (level.biome !== 'reef') {
        this.ledges.push({
          x: platform.x,
          image: scene.add
            .image(platform.x, platform.y - 5, texture, 'platform')
            .setOrigin(0)
            .setDisplaySize(platform.width, 65)
            .setDepth(-5),
        });
        continue;
      }
      const height = platform.height + 10;
      const cap = 22;
      for (const piece of [
        { frame: 'ledge-left', x: platform.x, width: cap },
        {
          frame: 'ledge-middle',
          x: platform.x + cap,
          width: platform.width - cap * 2,
        },
        {
          frame: 'ledge-right',
          x: platform.x + platform.width - cap,
          width: cap,
        },
      ]) {
        this.ledges.push({
          x: piece.x,
          image: scene.add
            .image(piece.x, platform.y, 'reef-props', piece.frame)
            .setOrigin(0)
            .setDisplaySize(piece.width, height)
            .setDepth(-5),
        });
      }
    }
    this.floor = scene.add
      .tileSprite(
        0,
        level.world.floor,
        scene.scale.width,
        86,
        level.biome === 'reef' ? 'reef-props' : texture,
        level.biome === 'reef' ? 'ledge-middle' : 'floor',
      )
      .setOrigin(0)
      .setDepth(-5)
      .setTileScale(0.5);
    if (level.biome !== 'reef') this.floor.setTileScale(0.5, 0.6);
  }

  render(cameraX: number) {
    const width = this.scene.scale.width;
    const tileWidth = 1080;
    const scroll = cameraX * 0.16;
    const first = Math.floor(scroll / tileWidth);
    const count = Math.ceil(width / tileWidth) + 1;
    while (this.water.length < count) {
      this.water.push(
        this.scene.add
          .image(
            0,
            0,
            this.level.biome === 'reef'
              ? 'reef-distant'
              : this.level.biome === 'kelp'
                ? 'kelp-forest-background'
                : 'crystal-cave-background',
          )
          .setOrigin(0)
          .setDepth(-20),
      );
    }
    this.water.forEach((image, index) => {
      const tile = first + index;
      // Adjacent tiles share the same source edge, even when the painted texture is imperfect.
      image
        .setVisible(index < count)
        .setFlipX(tile % 2 !== 0)
        .setDisplaySize(tileWidth, 720)
        .setPosition(tile * tileWidth - scroll, 0);
    });
    for (const ledge of this.ledges) {
      const x = ledge.x - cameraX;
      ledge.image
        .setX(x)
        .setVisible(x < width && x + ledge.image.displayWidth > 0);
    }
    this.floor.setSize(width, 86);
    this.floor.tilePositionX = cameraX / 0.5;
  }
}
