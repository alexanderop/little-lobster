import type * as Phaser from 'phaser';
import type { Creature } from '../model/simulation';

export class EnemyView {
  readonly container: Phaser.GameObjects.Container;
  private strips: Phaser.GameObjects.Image[] = [];
  private defeatedAt: number | null = null;
  private readonly size: number;

  constructor(scene: Phaser.Scene, creature: Creature) {
    const costumeCat = creature.kind === 'costume-cat';
    const sideSwimmer = creature.kind === 'catfish' || costumeCat;
    const texture = costumeCat ? 'costume-cat' : 'creatures';
    const frameName = costumeCat ? undefined : creature.kind;
    this.size = costumeCat
      ? 136
      : creature.kind === 'bigfin'
        ? 225
        : creature.kind === 'catfish'
          ? 118
          : 100;
    this.container = scene.add
      .container(creature.x, creature.y)
      .setName(`enemy-${creature.id}`);
    const frame = scene.textures.getFrame(texture, frameName);
    const horizontal = !sideSwimmer;
    const length = horizontal ? frame.height : frame.width;
    for (let i = 0; i < 48; i++) {
      const start = Math.floor((i * length) / 48);
      const end = Math.floor(((i + 1) * length) / 48);
      const strip = scene.add
        .image(0, 0, texture, frameName)
        .setDisplaySize(this.size, this.size)
        .setCrop(
          horizontal ? 0 : start,
          horizontal ? start : 0,
          horizontal ? frame.width : end - start,
          horizontal ? end - start : frame.height,
        );
      this.strips.push(strip);
      this.container.add(strip);
    }
  }

  reset(creature: Creature) {
    this.defeatedAt = null;
    this.container.setVisible(creature.active).setAlpha(1);
  }

  render(creature: Creature, elapsed: number, cameraX: number) {
    if (!creature.active && this.defeatedAt === null) this.defeatedAt = elapsed;
    const defeat =
      this.defeatedAt === null
        ? 0
        : Math.min(1, (elapsed - this.defeatedAt) / 0.32);
    this.container.setVisible(defeat < 1).setAlpha(1 - defeat);
    if (defeat === 1) return;

    const phase =
      elapsed *
        (creature.kind === 'catfish'
          ? 7
          : creature.kind === 'sepia'
            ? 5
            : 2.8) +
      creature.id * 1.7;
    const pulse = Math.sin(phase);
    const ink =
      creature.kind === 'sepia'
        ? Math.max(0, (Math.sin(elapsed * 1.4 + creature.id) - 0.8) / 0.2)
        : 0;
    const direction = Math.cos(
      elapsed * (creature.kind === 'catfish' ? 0.8 : 0.5) + creature.id,
    );
    const turn = Math.min(1, Math.abs(direction) / 0.18);
    const sideSwimmer =
      creature.kind === 'catfish' || creature.kind === 'costume-cat';
    const facing = sideSwimmer && direction > 0 ? -1 : 1;
    this.container
      .setPosition(creature.x - cameraX, creature.y - defeat * 22)
      .setScale(
        facing *
          (0.86 + turn * 0.14) *
          (1 + pulse * 0.045 + ink * 0.1 + defeat * 0.35),
        1 - pulse * 0.045 - ink * 0.08 - defeat * 0.65,
      )
      .setRotation(Math.sin(phase * 0.5) * 0.055 + pulse * 0.025);

    this.strips.forEach((strip, index) => {
      const along = (index + 0.5) / this.strips.length;
      // Keep the face steady while the tail or tentacle tips carry the stroke.
      const bend = Math.max(0, (along - 0.35) / 0.65) ** 2;
      const wave =
        Math.sin(phase - along * 5) *
        bend *
        this.size *
        (creature.kind === 'bigfin' ? 0.075 : 0.055);
      strip.setPosition(sideSwimmer ? 0 : wave, sideSwimmer ? wave : 0);
    });
  }
}
