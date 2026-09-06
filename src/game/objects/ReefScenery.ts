import type * as Phaser from 'phaser';
import { WORLD, platforms } from '../model/level';

export class ReefScenery {
  private water: Phaser.GameObjects.Image[] = [];
  private ledges: { x: number; image: Phaser.GameObjects.Image }[] = [];
  private floor: Phaser.GameObjects.TileSprite;

  constructor(private scene: Phaser.Scene) {
    for (const platform of platforms) {
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
        WORLD.floor,
        scene.scale.width,
        86,
        'reef-props',
        'ledge-middle',
      )
      .setOrigin(0)
      .setDepth(-5)
      .setTileScale(0.5);
  }

  render(cameraX: number) {
    const width = this.scene.scale.width;
    const tileWidth = 1080;
    const scroll = cameraX * 0.16;
    const first = Math.floor(scroll / tileWidth);
    const count = Math.ceil(width / tileWidth) + 1;
    while (this.water.length < count) {
      this.water.push(
        this.scene.add.image(0, 0, 'reef-distant').setOrigin(0).setDepth(-20),
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
