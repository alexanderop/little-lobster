import * as Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  private failed = false;
  constructor(private onError: (error: Error) => void) {
    super('preloader');
  }
  private loadFailed = (file: Phaser.Loader.File) => {
    this.failed = true;
    this.onError(new Error(`Could not load ${file.key}`));
  };
  preload() {
    this.load.spritesheet('lobster-poses', '/assets/lobster-poses.png', {
      frameWidth: 256,
      frameHeight: 288,
      endFrame: 7,
    });
    this.load.image('reef', '/assets/reef.png');
    this.load.image('creatures', '/assets/creatures.png');
    this.load.on('loaderror', this.loadFailed);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.load.off('loaderror', this.loadFailed),
    );
  }
  create() {
    if (this.failed) return;
    const atlas = this.textures.get('creatures');
    atlas.add('sepia', 0, 0, 0, 627, 605);
    atlas.add('catfish', 0, 627, 0, 627, 605);
    atlas.add('bigfin', 0, 630, 610, 624, 644);
    // The narwhal's horn crosses its atlas cell; clip the neighboring squid while rendering.
    const buddyTexture = this.textures.createCanvas('narwhal', 800, 644);
    if (buddyTexture) {
      const c = buddyTexture.context;
      c.save();
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(800, 0);
      c.lineTo(800, 205);
      c.lineTo(590, 280);
      c.lineTo(590, 644);
      c.lineTo(0, 644);
      c.closePath();
      c.clip();
      const source = atlas.getSourceImage();
      if (
        source instanceof HTMLImageElement ||
        source instanceof HTMLCanvasElement
      )
        c.drawImage(source, 0, 610, 800, 644, 0, 0, 800, 644);
      c.restore();
      buddyTexture.refresh();
    }
    this.scene.start('ocean');
  }
}
