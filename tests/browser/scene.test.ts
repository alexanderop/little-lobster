import { afterEach, expect, test } from 'vitest';
import * as Phaser from 'phaser';
import { OceanScene } from '../../src/game/scenes/OceanScene';
import { Preloader } from '../../src/game/scenes/Preloader';
import { createOceanGame } from '../../src/game/createGame';
import { EnemyView } from '../../src/game/objects/EnemyView';
import { OceanEffects } from '../../src/game/objects/OceanEffects';
import { OceanView } from '../../src/game/objects/OceanView';
import { generateLevel } from '../../src/game/model/level';
import { createGame, idleInput } from '../../src/game/model/simulation';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function boot(initialState = createGame()) {
  const parent = document.createElement('div');
  parent.style.cssText = 'width:960px;height:720px';
  document.body.append(parent);
  const ready = Promise.withResolvers<void>();
  const scene = new OceanScene(
    { onSnapshot() {}, onEvent() {} },
    ready.resolve,
    initialState,
  );
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 960,
    height: 720,
    banner: false,
    audio: { noAudio: true },
    scene: [new Preloader(ready.reject), scene],
  });
  cleanups.push(async () => {
    game.destroy(true);
    game.loop.wake();
    await expect.poll(() => parent.querySelector('canvas')).toBeNull();
    parent.remove();
  });
  await ready.promise;
  game.loop.sleep();
  return { game, scene, parent };
}

test('real assets boot a scene and model movement updates the lobster sprite', async () => {
  const { scene, game } = await boot();
  expect(game.textures.exists('lobster-poses')).toBe(true);
  expect(game.textures.get('lobster-poses').getFrameNames()).toHaveLength(8);
  const lobster = scene.children.getByName('lobster');
  expect(lobster).toBeInstanceOf(Phaser.GameObjects.Sprite);
  if (!(lobster instanceof Phaser.GameObjects.Sprite))
    throw new Error('Lobster sprite missing');
  const startX = lobster.x;
  scene.setInput({ ...idleInput(), right: true });
  for (let i = 0; i < 30; i++) scene.update(i * 17, 1000 / 60);
  expect(lobster.x).toBeGreaterThan(startX + 40);
  expect(lobster.texture.key).toBe('lobster-poses');
});

test('pause freezes model and presentation; restart restores the fresh scene', async () => {
  const { scene } = await boot();
  const initial = scene.snapshot();
  const lobster = scene.children.getByName('lobster');
  if (!(lobster instanceof Phaser.GameObjects.Sprite))
    throw new Error('Lobster sprite missing');
  const initialPose = { x: lobster.x, y: lobster.y, frame: lobster.frame.name };
  scene.setInput({ ...idleInput(), right: true, dash: true });
  for (let i = 0; i < 90; i++) scene.update(i * 17, 1000 / 60);
  scene.pause(true);
  const paused = scene.snapshot();
  const pose = {
    x: lobster.x,
    y: lobster.y,
    rotation: lobster.rotation,
    frame: lobster.frame.name,
  };
  scene.setInput({ ...idleInput(), left: true });
  for (let i = 0; i < 60; i++) scene.update(i * 17, 1000 / 60);
  expect(scene.snapshot()).toEqual(paused);
  expect({
    x: lobster.x,
    y: lobster.y,
    rotation: lobster.rotation,
    frame: lobster.frame.name,
  }).toEqual(pose);
  scene.restart();
  expect(scene.snapshot()).toEqual(initial);
  expect({ x: lobster.x, y: lobster.y, frame: lobster.frame.name }).toEqual(
    initialPose,
  );
  const count = scene.children.length;
  scene.restart();
  expect(scene.children.length).toBe(count);
});

test('controller readiness waits for actual textures, and destroy removes its canvas', async () => {
  const parent = document.createElement('div');
  parent.style.cssText = 'width:960px;height:720px';
  document.body.append(parent);
  const controller = createOceanGame(parent, { onSnapshot() {}, onEvent() {} });
  cleanups.push(async () => {
    controller.destroy();
    await expect.poll(() => parent.querySelector('canvas')).toBeNull();
    parent.remove();
  });
  let ready = false;
  void controller.ready.then(() => {
    ready = true;
  });
  expect(ready).toBe(false);
  await controller.ready;
  expect(ready).toBe(true);
  expect(parent.querySelector('canvas')?.width).toBeGreaterThan(0);
  controller.destroy();
  controller.destroy();
  await expect.poll(() => parent.querySelector('canvas')).toBeNull();
});

test('destroy during loading rejects readiness and permits a fresh game in the same host', async () => {
  const parent = document.createElement('div');
  parent.style.cssText = 'width:960px;height:720px';
  document.body.append(parent);
  const first = createOceanGame(parent, { onSnapshot() {}, onEvent() {} });
  const rejected = expect(first.ready).rejects.toMatchObject({
    name: 'AbortError',
  });
  first.destroy();
  await rejected;
  await expect.poll(() => parent.querySelector('canvas')).toBeNull();
  const second = createOceanGame(parent, { onSnapshot() {}, onEvent() {} });
  cleanups.push(async () => {
    second.destroy();
    await expect.poll(() => parent.querySelector('canvas')).toBeNull();
    parent.remove();
  });
  await second.ready;
  expect(parent.querySelectorAll('canvas')).toHaveLength(1);
});

test('restart discards fractional simulation time from the previous run', async () => {
  const { scene } = await boot();
  scene.update(0, 12);
  scene.restart();
  const before = scene.snapshot();
  scene.setInput({ ...idleInput(), right: true });
  scene.update(0, 12);
  expect(scene.snapshot()).toEqual(before);
  scene.update(12, 12);
  expect(scene.snapshot().progress).toBeGreaterThan(before.progress);
});

test('all enemy species animate their body parts and reset after defeat', async () => {
  const { scene } = await boot();
  for (const creature of createGame().creatures) {
    const view = new EnemyView(scene, creature);
    const pose = () =>
      view.container.list
        .filter((part) => part instanceof Phaser.GameObjects.Image)
        .map((part) => {
          if (!(part instanceof Phaser.GameObjects.Image))
            throw new Error('Enemy part missing');
          return { x: part.x, y: part.y };
        });
    view.render(creature, 0, 0);
    const initial = pose();
    view.render(creature, 0.2, 0);
    expect(pose()).not.toEqual(initial);
    const animated = pose();
    view.render(creature, 0.2, 0);
    expect(pose()).toEqual(animated);
    const defeated = { ...creature, active: false };
    view.render(defeated, 0.2, 0);
    view.render(defeated, 0.36, 0);
    expect(view.container.alpha).toBeCloseTo(0.5);
    expect(view.container.visible).toBe(true);
    view.render(defeated, 0.6, 0);
    expect(view.container.visible).toBe(false);
    view.reset(creature);
    view.render(creature, 0, 0);
    expect(view.container.alpha).toBe(1);
    expect(view.container.visible).toBe(true);
    expect(pose()).toEqual(initial);
    view.container.destroy();
  }
});

test('electric pickup and projectile use the generated texture and reset without leftover sprites', async () => {
  const { scene } = await boot();
  const { OceanView } = await import('../../src/game/objects/OceanView');
  const { advance } = await import('../../src/game/model/simulation');
  const state = createGame();
  const view = new OceanView(scene, state);
  state.pearls = [{ x: state.player.x, y: state.player.y, collected: false }];
  advance(state, idleInput(), 1 / 60, () => 0);
  view.render(state, 16);
  const pickup = scene.children.getByName('electro-orb');
  expect(pickup).toBeInstanceOf(Phaser.GameObjects.Image);
  if (!(pickup instanceof Phaser.GameObjects.Image))
    throw new Error('Missing pickup sprite');
  expect(pickup.texture.key).toBe('electro-orb');
  expect(pickup.displayWidth).toBeCloseTo(58);
  for (let i = 0; i < 30; i++) advance(state, idleInput(), 1 / 60, () => 1);
  advance(state, { ...idleInput(), fire: true }, 1 / 60);
  view.render(state, 16);
  expect(pickup.displayWidth).toBeCloseTo(38);
  expect(pickup.x).toBeGreaterThan(state.player.x);
  view.reset(createGame());
  expect(scene.children.getByName('electro-orb')).toBeNull();
});

test('dash bubbles freeze on pause, resume, and disappear on restart without accumulating emitters', async () => {
  const { scene } = await boot();
  const bubbles = scene.children.getByName('dash-and-stomp-bubbles');
  if (!(bubbles instanceof Phaser.GameObjects.Particles.ParticleEmitter))
    throw new Error('Dash emitter missing');
  const objectCount = scene.children.length;
  scene.setInput({ ...idleInput(), right: true, dash: true });
  for (let i = 0; i < 6; i++) scene.update(i * 17, 1000 / 60);
  expect(bubbles.getAliveParticleCount()).toBeGreaterThan(0);
  const particles: Phaser.GameObjects.Particles.Particle[] = [];
  bubbles.forEachAlive((particle) => particles.push(particle), undefined);
  const particle = particles[0];
  if (!particle) throw new Error('Dash bubble missing');
  const position = () => ({
    x: particle.x,
    y: particle.y,
    life: particle.lifeCurrent,
  });
  scene.pause(true);
  const frozen = position();
  scene.sys.updateList.sceneUpdate(100, 100);
  scene.update(100, 100);
  expect(position()).toEqual(frozen);
  scene.pause(false);
  scene.sys.updateList.sceneUpdate(200, 100);
  expect(particle.lifeCurrent).toBeLessThan(frozen.life);
  expect(particle.y).not.toBe(frozen.y);
  scene.restart();
  expect(bubbles.getAliveParticleCount()).toBe(0);
  expect(scene.children.length).toBe(objectCount);
});

test('stomps, electricity, and treasure have separate bounded effects that scroll with the world', async () => {
  const { scene } = await boot();
  const effects = new OceanEffects(scene);
  const emitters = scene.children.list
    .filter(
      (object): object is Phaser.GameObjects.Particles.ParticleEmitter =>
        object instanceof Phaser.GameObjects.Particles.ParticleEmitter,
    )
    .slice(-4);
  const [bubbles, sparks, gold, motes] = emitters;
  if (!bubbles || !sparks || !gold || !motes)
    throw new Error('Effect emitters missing');
  effects.burst({ kind: 'stomp', x: 1000, y: 300 });
  expect(bubbles.getAliveParticleCount()).toBeGreaterThan(0);
  expect(sparks.getAliveParticleCount()).toBe(0);
  effects.burst({ kind: 'electro-hit', x: 1000, y: 300 });
  effects.burst({ kind: 'treasure', x: 1000, y: 300 });
  expect(sparks.getAliveParticleCount()).toBeGreaterThan(0);
  expect(gold.getAliveParticleCount()).toBeGreaterThan(0);
  expect(motes.getAliveParticleCount()).toBe(0);
  const fragments: Phaser.GameObjects.Particles.Particle[] = [];
  gold.forEachAlive((particle) => fragments.push(particle), undefined);
  const fragment = fragments[0];
  if (!fragment) throw new Error('Treasure fragment missing');
  expect(fragment.x).toBe(1000);
  effects.render(createGame(), 600, 0);
  expect(fragment.x + gold.x).toBe(400);
  effects.render(createGame(), 700, 0);
  expect(fragment.x + gold.x).toBe(300);
  for (let i = 0; i < 50; i++)
    effects.burst({ kind: 'electro-hit', x: 1000, y: 300 });
  expect(sparks.getParticleCount()).toBeLessThanOrEqual(100);
  scene.sys.updateList.update();
  for (let i = 0; i < 70; i++) scene.sys.updateList.sceneUpdate(i * 17, 17);
  expect(
    emitters.every((emitter) => emitter.getAliveParticleCount() === 0),
  ).toBe(true);
});

test('unlocking treasure grows and lifts the pearl, pauses, settles, and resets on retry', async () => {
  const { scene } = await boot();
  const { advance, continueGame } =
    await import('../../src/game/model/simulation');
  const { reefTrial } = await import('../../src/game/model/level');
  const state = createGame();
  const view = new OceanView(scene, state);
  for (const ring of reefTrial.rings) {
    state.player.x = ring.x;
    state.player.y = ring.y;
    advance(state, idleInput(), 1 / 60);
    for (const event of state.events) view.burst(event);
  }
  expect(state.ringTrial.kind).toBe('complete');
  const pearl = scene.children.list
    .filter(
      (object): object is Phaser.GameObjects.Image =>
        object instanceof Phaser.GameObjects.Image &&
        object.name === 'golden-pearl',
    )
    .at(-1);
  const tween = scene.tweens.getTweens()[0];
  if (!pearl || !tween) throw new Error('Treasure animation missing');
  view.render(state, 0);
  const baseY = pearl.y;
  for (let i = 0; i < 12; i++) tween.forward(17);
  view.render(state, 0);
  expect(pearl.displayWidth).toBeGreaterThan(42);
  expect(pearl.y).toBeLessThan(baseY);
  const pose = { y: pearl.y, width: pearl.displayWidth };
  state.status = 'paused';
  view.setPlaying(false);
  tween.forward(100);
  view.render(state, 0);
  expect({ y: pearl.y, width: pearl.displayWidth }).toEqual(pose);
  state.status = 'playing';
  view.setPlaying(true);
  for (let i = 0; i < 60; i++) tween.forward(17);
  scene.tweens.tick();
  view.render(state, 0);
  expect(pearl.displayWidth).toBeCloseTo(42);
  expect(pearl.y).toBeCloseTo(baseY);
  const treasure = state.treasures[1];
  if (!treasure) throw new Error('Treasure missing');
  view.burst({ kind: 'treasure-unlocked', x: treasure.x, y: treasure.y });
  state.status = 'lost';
  continueGame(state);
  view.reset(state);
  expect(treasure.unlocked).toBe(true);
  expect(pearl.displayWidth).toBeCloseTo(42);
  expect(scene.tweens.getTweens()).toHaveLength(0);
});

test('successive levels replace scene objects, clear held input, and use each biome texture', async () => {
  const { scene } = await boot(createGame(generateLevel(3, 52)));
  for (let level = 3; level < 8; level++) {
    expect(scene.snapshot().level).toBe(level);
    const textures = scene.children.list
      .filter(
        (child): child is Phaser.GameObjects.Image =>
          child instanceof Phaser.GameObjects.Image,
      )
      .map((image) => image.texture.key);
    expect(textures).toContain(
      [
        '',
        '',
        'kelp-forest-background',
        'crystal-cave-background',
        'candy-background',
        'toybox-background',
        'neon-background',
        'reef-distant',
      ][level],
    );
    scene.setInput({ ...idleInput(), right: true, down: true });
    for (
      let frame = 0;
      frame < 900 && scene.snapshot().status === 'playing';
      frame++
    )
      scene.update(frame * 17, 1000 / 60);
    expect(scene.snapshot().status).toBe('won');
    const total = scene.snapshot().totalPearls;
    const previousObjects = [...scene.children.list];
    scene.continue();
    expect(scene.snapshot().status).toBe('playing');
    expect(scene.snapshot().totalPearls).toBe(total);
    expect(scene.snapshot().pearls).toBe(0);
    expect(scene.children.length).toBeLessThan(200);
    expect(
      previousObjects.every((object) => !scene.children.list.includes(object)),
    ).toBe(true);
    const progress = scene.snapshot().progress;
    scene.update(0, 100);
    expect(scene.snapshot().progress).toBe(progress);
  }
  scene.restart();
  expect(scene.snapshot().level).toBe(1);
  expect(scene.snapshot().totalPearls).toBe(0);
  expect(scene.children.getByName('lobster')).toBeTruthy();
}, 30000);

test('boss health, charge warning, and hostile electric balls render and reset', async () => {
  const state = createGame();
  const enemy = state.creatures.find((enemy) => enemy.boss);
  if (!enemy?.boss) throw new Error('Missing boss');
  state.player.x = enemy.x - 300;
  const { scene } = await boot(state);
  const label = scene.children.getByName('boss-health');
  if (!(label instanceof Phaser.GameObjects.Text))
    throw new Error('Missing boss HP');
  expect(label.text).toBe('BIGFIN  8/8 HP');
  enemy.boss.health = 4;
  enemy.boss.cooldown = 0.3;
  scene.update(0, 17);
  expect(label.text).toContain('4/8 HP · CHARGING!');
  enemy.boss.cooldown = 0;
  scene.update(17, 17);
  const shot = scene.children.getByName('electro-orb');
  if (!(shot instanceof Phaser.GameObjects.Image))
    throw new Error('Missing boss shot');
  expect(shot.displayWidth).toBeCloseTo(52);
  expect(shot.tintTopLeft).toBe(0xff88ee);
  scene.restart();
  expect(label.text).toBe('BIGFIN  8/8 HP');
  expect(scene.children.getByName('electro-orb')).toBeNull();
});

test('Current School renders four rings, one correctly labelled reward, and lifts the lobster in its first current', async () => {
  const state = createGame(generateLevel(2, 52));
  const { scene } = await boot(state);
  expect(scene.snapshot().challenge).toContain('Current School');
  expect(scene.snapshot().requiredPearls).toBe(12);
  expect(scene.snapshot().treasureTotal).toBe(1);
  expect(
    scene.children.list.filter((child) => child.name.startsWith('trial-ring-')),
  ).toHaveLength(4);
  expect(
    scene.children.list.some(
      (child) =>
        child instanceof Phaser.GameObjects.Text &&
        child.text === 'Finish the rings',
    ),
  ).toBe(true);
  scene.setInput({ ...idleInput(), right: true, down: true });
  for (let frame = 0; frame < 65; frame++) scene.update(frame * 17, 1000 / 60);
  scene.setInput(idleInput());
  for (let frame = 0; frame < 70; frame++) scene.update(frame * 17, 1000 / 60);
  const lobster = scene.children.getByName('lobster');
  if (!(lobster instanceof Phaser.GameObjects.Sprite))
    throw new Error('Lobster missing');
  expect(lobster.y).toBeLessThan(350);
  expect(scene.snapshot().pearls).toBeGreaterThanOrEqual(3);
  scene.pause(true);
  const paused = scene.snapshot();
  scene.update(0, 1000);
  expect(scene.snapshot()).toEqual(paused);
});

test('gorilla shows two HP, animates windup and release, and renders spinning bananas', async () => {
  const state = createGame();
  const enemy = state.creatures.find((enemy) => enemy.kind === 'gorilla');
  if (!enemy?.boss) throw new Error('Missing gorilla');
  state.player.x = enemy.x - 250;
  state.player.y = enemy.y;
  const { scene } = await boot(state);
  const container = scene.children.getByName('enemy-' + enemy.id);
  if (!(container instanceof Phaser.GameObjects.Container))
    throw new Error('Missing gorilla view');
  const pose = container.getByName('gorilla-pose');
  const label = container.getByName('gorilla-health');
  if (
    !(pose instanceof Phaser.GameObjects.Image) ||
    !(label instanceof Phaser.GameObjects.Text)
  )
    throw new Error('Missing gorilla art or HP');
  expect(label.text).toContain('2/2 HP');
  const signs = scene.children.list.filter(
    (child) =>
      child instanceof Phaser.GameObjects.Text &&
      child.text.includes('Two hits'),
  );
  expect(signs).toHaveLength(1);
  enemy.boss.cooldown = 0.3;
  scene.update(0, 16);
  expect(pose.frame.name).toBe(1);
  expect(label.text).toContain('THROW!');
  enemy.boss.cooldown = 0;
  scene.update(16, 16);
  expect(pose.frame.name).toBe(2);
  const banana = scene.children.getByName('banana');
  if (!(banana instanceof Phaser.GameObjects.Image))
    throw new Error('Missing banana');
  expect(banana.frame.name).toBe(3);
  const rotation = banana.rotation;
  scene.update(32, 16);
  expect(banana.rotation).not.toBe(rotation);
  enemy.boss.health = 1;
  enemy.boss.hurtTime = 0.4;
  scene.update(48, 16);
  expect(label.text).toContain('1/2 HP');
  expect(pose.tintTopLeft).toBe(0xff9999);
  scene.restart();
  expect(scene.children.getByName('banana')).toBeNull();
});

test('gorilla naturally winds up and throws visible bananas in the unchanged opening level', async () => {
  const state = createGame();
  const enemy = state.creatures.find((enemy) => enemy.kind === 'gorilla');
  if (!enemy) throw new Error('Missing gorilla');
  state.player.x = enemy.x - 250;
  state.player.y = 500;
  state.player.invincible = 10;
  const { scene } = await boot(state);
  const container = scene.children.getByName('enemy-' + enemy.id);
  if (!(container instanceof Phaser.GameObjects.Container))
    throw new Error('Missing gorilla');
  const pose = container.getByName('gorilla-pose');
  if (!(pose instanceof Phaser.GameObjects.Image))
    throw new Error('Missing pose');
  const frames = new Set<string | number>();
  let visibleBananaFrames = 0;
  for (let frame = 0; frame < 180; frame++) {
    scene.update(frame * 17, 1000 / 60);
    frames.add(pose.frame.name);
    if (scene.children.getByName('banana')) visibleBananaFrames++;
  }
  expect(frames).toEqual(new Set([0, 1, 2]));
  expect(visibleBananaFrames).toBeGreaterThan(20);
});
