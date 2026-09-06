import { afterEach, expect, test } from 'vitest';
import * as Phaser from 'phaser';
import { OceanScene } from '../../src/game/scenes/OceanScene';
import { Preloader } from '../../src/game/scenes/Preloader';
import { createOceanGame } from '../../src/game/createGame';
import { EnemyView } from '../../src/game/objects/EnemyView';
import { createGame, idleInput } from '../../src/game/model/simulation';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function boot() {
  const parent = document.createElement('div');
  parent.style.cssText = 'width:960px;height:720px';
  document.body.append(parent);
  const ready = Promise.withResolvers<void>();
  const scene = new OceanScene(
    { onSnapshot() {}, onEvent() {} },
    ready.resolve,
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
      view.container.list.map((part) => {
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
