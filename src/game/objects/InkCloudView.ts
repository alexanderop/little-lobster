import type * as Phaser from 'phaser';
import type { Creature } from '../model/simulation';

const PERIOD = Math.PI * 2;
const RELEASE_PHASE = Math.asin(0.8);
const LIFETIME = 2.4;
const TEXTURE = 'sepia-ink-puff';

export class InkCloudView {
  private readonly puffs: Phaser.GameObjects.Image[];
  private cycle: number | null = null;
  private origin = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene) {
    if (!scene.textures.exists(TEXTURE)) {
      const texture = scene.textures.createCanvas(TEXTURE, 96, 96);
      if (texture) {
        const context = texture.context;
        const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 46);
        gradient.addColorStop(0, 'rgba(39, 24, 65, 0.75)');
        gradient.addColorStop(0.3, 'rgba(53, 32, 78, 0.6)');
        gradient.addColorStop(0.65, 'rgba(67, 43, 91, 0.25)');
        gradient.addColorStop(1, 'rgba(67, 43, 91, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 96, 96);
        texture.refresh();
      }
    }
    this.puffs = Array.from({ length: 12 }, () =>
      scene.add.image(0, 0, TEXTURE).setVisible(false),
    );
  }

  reset() {
    this.cycle = null;
    for (const puff of this.puffs) puff.setVisible(false);
  }

  render(creature: Creature, elapsed: number, cameraX: number) {
    const phase = elapsed * 1.4 + creature.id - RELEASE_PHASE;
    const cycle = Math.floor(phase / PERIOD);
    const age = (phase - cycle * PERIOD) / 1.4;
    if (cycle !== this.cycle) {
      this.cycle = cycle;
      this.origin = { x: creature.x - 12, y: creature.y + 24 };
    }
    this.puffs.forEach((puff, index) => {
      const time = age - index * 0.035;
      const visible =
        creature.active && cycle >= 0 && time > 0 && time < LIFETIME;
      puff.setVisible(visible);
      if (!visible) return;
      const progress = time / LIFETIME;
      const angle = index * 2.39996 + creature.id;
      const spread = 9 + time * (15 + (index % 4) * 6);
      const size = 20 + Math.sqrt(progress) * (65 + (index % 3) * 18);
      puff
        .setPosition(
          this.origin.x - cameraX - time * 24 + Math.cos(angle) * spread,
          this.origin.y + time * 8 + Math.sin(angle) * spread * 0.7,
        )
        .setDisplaySize(size, size * (0.8 + (index % 3) * 0.13))
        .setAlpha(Math.min(1, time / 0.16) * (1 - progress) ** 1.5 * 0.55);
    });
  }
}
