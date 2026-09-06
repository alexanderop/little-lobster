import type * as Phaser from 'phaser';
import type { Creature } from '../model/simulation';

const enemyAppearance = {
  catfish: {
    texture: 'creatures',
    size: 118,
    sideSwimmer: true,
    proportional: false,
  },
  sepia: {
    texture: 'creatures',
    size: 100,
    sideSwimmer: false,
    proportional: false,
  },
  bigfin: {
    texture: 'creatures',
    size: 225,
    sideSwimmer: false,
    proportional: false,
  },
  'costume-cat': {
    texture: 'costume-cat',
    size: 136,
    sideSwimmer: true,
    proportional: false,
  },
  'sepia-dog': {
    texture: 'wild-enemies',
    size: 146,
    sideSwimmer: false,
    proportional: true,
  },
  gorilla: {
    texture: 'wild-enemies',
    size: 168,
    sideSwimmer: false,
    proportional: true,
  },
  'shark-raccoon': {
    texture: 'shark-raccoon',
    size: 164,
    sideSwimmer: true,
    proportional: true,
  },
  'puffer-hedgehog': {
    texture: 'puffer-hedgehog',
    size: 160,
    sideSwimmer: false,
    proportional: true,
  },
  'crab-crocodile': {
    texture: 'crab-crocodile',
    size: 176,
    sideSwimmer: true,
    proportional: true,
  },
} satisfies Record<
  Creature['kind'],
  {
    texture: string;
    size: number;
    sideSwimmer: boolean;
    proportional: boolean;
  }
>;

export class EnemyView {
  readonly container: Phaser.GameObjects.Container;
  private gorilla: Phaser.GameObjects.Image | null = null;
  private healthLabel: Phaser.GameObjects.Text | null = null;
  private strips: Phaser.GameObjects.Image[] = [];
  private defeatedAt: number | null = null;
  private readonly size: number;

  constructor(scene: Phaser.Scene, creature: Creature) {
    const appearance = enemyAppearance[creature.kind];
    const { texture, size, sideSwimmer, proportional } = appearance;
    const frameName =
      texture === 'creatures' || texture === 'wild-enemies'
        ? creature.kind
        : undefined;
    this.size = size;
    this.container = scene.add
      .container(creature.x, creature.y)
      .setName(`enemy-${creature.id}`);
    if (creature.kind === 'gorilla') {
      this.gorilla = scene.add
        .image(0, 0, 'gorilla-poses', 0)
        .setDisplaySize(210, 210)
        .setName('gorilla-pose');
      this.healthLabel = scene.add
        .text(0, -112, 'GORILLA  2/2 HP', {
          fontFamily: 'Arial',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#ffe575',
          stroke: '#241039',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setName('gorilla-health');
      this.container.add([this.gorilla, this.healthLabel]);
      return;
    }
    const frame = scene.textures.getFrame(texture, frameName);
    const horizontal = !sideSwimmer;
    const length = horizontal ? frame.height : frame.width;
    for (let i = 0; i < 48; i++) {
      const start = Math.floor((i * length) / 48);
      const end = Math.floor(((i + 1) * length) / 48);
      const strip = scene.add
        .image(0, 0, texture, frameName)
        .setDisplaySize(
          proportional ? (this.size * frame.width) / frame.height : this.size,
          this.size,
        )
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

  render(
    creature: Creature,
    elapsed: number,
    cameraX: number,
    playerX = creature.x - 1,
  ) {
    if (creature.active) this.defeatedAt = null;
    if (!creature.active && this.defeatedAt === null) this.defeatedAt = elapsed;
    const defeat =
      this.defeatedAt === null
        ? 0
        : Math.min(1, (elapsed - this.defeatedAt) / 0.32);
    this.container.setVisible(defeat < 1).setAlpha(1 - defeat);
    if (defeat === 1) return;

    if (this.gorilla && creature.boss) {
      const cooldown = creature.boss.cooldown;
      const winding = cooldown < 0.6;
      const release = creature.boss.throwTime > 0;
      const windup = winding ? (0.6 - cooldown) / 0.6 : 0;
      const recoil = release ? creature.boss.throwTime / 0.25 : 0;
      const facing = playerX < creature.x ? 1 : -1;
      this.container.setPosition(
        creature.x - cameraX,
        creature.y - defeat * 22,
      );
      this.gorilla
        .setFrame(winding ? 1 : release ? 2 : 0)
        .setFlipX(facing < 0)
        .setDisplaySize(
          210 * (1 + windup * 0.06 + recoil * 0.05),
          210 * (1 - windup * 0.08 - defeat * 0.5),
        )
        .setPosition(
          -facing * windup * 8 + facing * recoil * 7,
          Math.sin(elapsed * 3) * 3,
        )
        .setRotation(facing * (windup * 0.13 - recoil * 0.14 + defeat * 0.8))
        .setTint(creature.boss.hurtTime > 0 ? 0xff9999 : 0xffffff);
      this.healthLabel?.setText(
        'GORILLA  ' +
          creature.boss.health +
          '/2 HP' +
          (winding ? ' · THROW!' : ''),
      );
      return;
    }
    const phase =
      elapsed *
        (creature.kind === 'catfish'
          ? 7
          : creature.kind === 'sepia' || creature.kind === 'sepia-dog'
            ? 5
            : 2.8) +
      creature.id * 1.7;
    const pulse = Math.sin(phase);
    const ink =
      creature.kind === 'sepia' || creature.kind === 'sepia-dog'
        ? Math.max(0, (Math.sin(elapsed * 1.4 + creature.id) - 0.8) / 0.2)
        : 0;
    const direction = Math.cos(
      elapsed * (creature.kind === 'catfish' ? 0.8 : 0.5) + creature.id,
    );
    const turn = Math.min(1, Math.abs(direction) / 0.18);
    const { sideSwimmer } = enemyAppearance[creature.kind];
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
