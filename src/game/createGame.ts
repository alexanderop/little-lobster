import { readJourney } from './journey';
import * as Phaser from 'phaser';
import { OceanScene } from './scenes/OceanScene';
import { Preloader } from './scenes/Preloader';
import type { GameCallbacks, GameController } from './contracts';

export function createOceanGame(
  parent: HTMLElement,
  callbacks: GameCallbacks,
): GameController {
  const readiness = Promise.withResolvers<void>();
  const scene = new OceanScene(
    callbacks,
    () => readiness.resolve(),
    readJourney(),
  );
  const width = () =>
    Math.round((720 * parent.clientWidth) / Math.max(1, parent.clientHeight));
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: width(),
    height: 720,
    backgroundColor: '#145366',
    transparent: false,
    antialias: true,
    scene: [new Preloader(readiness.reject), scene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    banner: false,
  });
  let destroyed = false;
  const observer = new ResizeObserver(() => {
    if (!destroyed && game.isBooted) game.scale.setGameSize(width(), 720);
  });
  observer.observe(parent);

  return {
    ready: readiness.promise,
    setInput: (input) => scene.setInput(input),
    pause: (paused) => scene.pause(paused),
    restart: () => scene.restart(),
    continue: () => scene.continue(),
    snapshot: () => scene.snapshot(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      readiness.reject(new DOMException('Game disposed', 'AbortError'));
      game.destroy(true);
    },
  };
}
