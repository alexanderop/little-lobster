export const WORLD = {
  width: 6300,
  height: 720,
  floor: 634,
  exitX: 6100,
  exitY: 540,
  requiredPearls: 18,
};
export type Input = {
  left: boolean;
  right: boolean;
  swim: boolean;
  down: boolean;
  dash: boolean;
};
export const idleInput = (): Input => ({
  left: false,
  right: false,
  swim: false,
  down: false,
  dash: false,
});
export type Status = 'playing' | 'paused' | 'lost' | 'won';
export type CreatureKind = 'catfish' | 'sepia' | 'bigfin';
export type Creature = {
  id: number;
  kind: CreatureKind;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  radius: number;
  active: boolean;
};
export type Pearl = { x: number; y: number; collected: boolean };
export type Platform = { x: number; y: number; width: number; height: number };
export const platforms: Platform[] = [
  { x: 480, y: 530, width: 240, height: 30 },
  { x: 940, y: 400, width: 180, height: 28 },
  { x: 1370, y: 520, width: 240, height: 30 },
  { x: 1880, y: 340, width: 210, height: 28 },
  { x: 2460, y: 545, width: 310, height: 34 },
  { x: 3010, y: 415, width: 220, height: 28 },
  { x: 3580, y: 520, width: 270, height: 32 },
  { x: 4100, y: 330, width: 220, height: 28 },
  { x: 4640, y: 490, width: 180, height: 30 },
  { x: 5380, y: 535, width: 220, height: 28 },
  { x: 5910, y: 615, width: 330, height: 35 },
];
export type GameEvent = {
  kind: 'pearl' | 'dash' | 'hurt' | 'checkpoint' | 'friend' | 'defeat' | 'win';
  x: number;
  y: number;
};
export type GameState = {
  status: Status;
  elapsed: number;
  pearls: Pearl[];
  creatures: Creature[];
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: 1 | -1;
    health: number;
    invincible: number;
    dashTime: number;
    dashCooldown: number;
    strokeCooldown: number;
  };
  checkpoint: boolean;
  friend: boolean;
  ink: number;
  events: GameEvent[];
};
export function createGame(): GameState {
  const pearls = Array.from({ length: 48 }, (_, i) => ({
    x: 330 + i * 116,
    y: 340 + Math.sin(i * 0.6) * 125,
    collected: false,
  }));
  const creatures: Creature[] = [
    {
      id: 0,
      kind: 'catfish',
      x: 1150,
      y: 550,
      homeX: 1150,
      homeY: 550,
      radius: 40,
      active: true,
    },
    {
      id: 1,
      kind: 'catfish',
      x: 1950,
      y: 465,
      homeX: 1950,
      homeY: 465,
      radius: 40,
      active: true,
    },
    {
      id: 2,
      kind: 'sepia',
      x: 3060,
      y: 300,
      homeX: 3060,
      homeY: 300,
      radius: 38,
      active: true,
    },
    {
      id: 3,
      kind: 'sepia',
      x: 3760,
      y: 450,
      homeX: 3760,
      homeY: 450,
      radius: 38,
      active: true,
    },
    {
      id: 4,
      kind: 'catfish',
      x: 4410,
      y: 540,
      homeX: 4410,
      homeY: 540,
      radius: 40,
      active: true,
    },
    {
      id: 5,
      kind: 'bigfin',
      x: 5530,
      y: 260,
      homeX: 5530,
      homeY: 260,
      radius: 72,
      active: true,
    },
  ];
  return {
    status: 'playing',
    elapsed: 0,
    pearls,
    creatures,
    player: {
      x: 160,
      y: 445,
      vx: 0,
      vy: 0,
      facing: 1,
      health: 3,
      invincible: 0,
      dashTime: 0,
      dashCooldown: 0,
      strokeCooldown: 0,
    },
    checkpoint: false,
    friend: false,
    ink: 0,
    events: [],
  };
}
export const pearlCount = (state: GameState) =>
  state.pearls.filter((p) => p.collected).length;
export const region = (x: number) => (x < 2350 ? 0 : x < 4500 ? 1 : 2);
export const regionNames = ['Sunlit Reef', 'Inky Gardens', 'The Blue Below'];
export function setPaused(state: GameState, paused: boolean) {
  if (state.status === 'playing' || state.status === 'paused')
    state.status = paused ? 'paused' : 'playing';
}
export function continueGame(state: GameState) {
  if (state.status !== 'lost') return;
  Object.assign(state.player, {
    x: state.checkpoint ? 2570 : 160,
    y: 445,
    vx: 0,
    vy: 0,
    health: 3,
    invincible: 2,
    dashTime: 0,
    dashCooldown: 0,
    strokeCooldown: 0,
  });
  state.ink = 0;
  state.status = 'playing';
  state.events = [];
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function advance(state: GameState, input: Input, seconds: number) {
  state.events = [];
  if (state.status !== 'playing') return;
  const dt = clamp(seconds, 0, 0.05),
    p = state.player;
  state.elapsed += dt;
  p.invincible = Math.max(0, p.invincible - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.strokeCooldown = Math.max(0, p.strokeCooldown - dt);
  state.ink = Math.max(0, state.ink - dt);
  const direction = Number(input.right) - Number(input.left);
  if (direction) p.facing = direction > 0 ? 1 : -1;
  if (input.dash && p.dashCooldown === 0) {
    p.dashTime = 0.24;
    p.dashCooldown = 1;
    state.events.push({ kind: 'dash', x: p.x, y: p.y });
  }
  if (input.swim && p.strokeCooldown === 0) {
    p.vy = -245;
    p.strokeCooldown = 0.23;
  }
  p.vx =
    p.dashTime > 0
      ? p.facing * 710
      : p.vx + (direction * 245 - p.vx) * Math.min(1, dt * 11);
  p.vy = clamp(
    p.vy + (input.down ? 620 : 300) * dt,
    -260,
    input.down ? 290 : 155,
  );
  if (p.dashTime > 0) p.vy *= Math.max(0, 1 - dt * 12);
  const oldY = p.y;
  p.x = clamp(p.x + p.vx * dt, 36, WORLD.width - 36);
  p.y = clamp(p.y + p.vy * dt, 90, WORLD.floor - 34);
  if (p.y === 90 || p.y === WORLD.floor - 34) p.vy = 0;
  for (const platform of platforms) {
    if (
      p.vy >= 0 &&
      p.x > platform.x - 20 &&
      p.x < platform.x + platform.width + 20 &&
      oldY + 32 <= platform.y + 3 &&
      p.y + 32 >= platform.y
    ) {
      p.y = platform.y - 32;
      p.vy = 0;
    }
  }
  if (!input.down && p.x > 1640 && p.x < 1780) p.vy = Math.min(p.vy, -170);
  if (!input.down && p.x > 3990 && p.x < 4110) p.vy = Math.min(p.vy, -190);
  for (const pearl of state.pearls)
    if (!pearl.collected && distance(p, pearl) < 49) {
      pearl.collected = true;
      state.events.push({ kind: 'pearl', x: pearl.x, y: pearl.y });
    }
  if (!state.checkpoint && p.x >= 2530) {
    state.checkpoint = true;
    p.health = 3;
    state.events.push({ kind: 'checkpoint', x: p.x, y: p.y });
  }
  const narwhal = {
    x: 3370 + Math.sin(state.elapsed * 0.5) * 110,
    y: 230 + Math.sin(state.elapsed * 0.8) * 35,
  };
  if (!state.friend && distance(p, narwhal) < 110) {
    state.friend = true;
    p.health = 3;
    p.invincible = 5;
    state.events.push({ kind: 'friend', x: p.x, y: p.y });
  }
  for (const enemy of state.creatures) {
    if (!enemy.active) continue;
    enemy.x =
      enemy.homeX +
      Math.sin(
        state.elapsed * (enemy.kind === 'catfish' ? 0.8 : 0.5) + enemy.id,
      ) *
        100;
    enemy.y =
      enemy.homeY +
      Math.sin(state.elapsed * 1.3 + enemy.id) *
        (enemy.kind === 'bigfin' ? 105 : 23);
    const d = distance(p, enemy);
    if (
      enemy.kind === 'sepia' &&
      d < 165 &&
      Math.sin(state.elapsed * 1.4 + enemy.id) > 0.8
    )
      state.ink = 0.75;
    if (d < enemy.radius + 27) {
      if (p.dashTime > 0 && enemy.kind !== 'bigfin') {
        enemy.active = false;
        state.events.push({ kind: 'defeat', x: enemy.x, y: enemy.y });
      } else if (p.invincible === 0 && p.dashTime === 0) {
        p.health--;
        p.invincible = 1.8;
        p.vy = -200;
        p.x = clamp(p.x - p.facing * 65, 36, WORLD.width - 36);
        state.events.push({ kind: 'hurt', x: p.x, y: p.y });
        if (p.health <= 0) {
          state.status = 'lost';
          return;
        }
      }
    }
  }
  if (
    p.x > WORLD.exitX - 75 &&
    Math.abs(p.y - WORLD.exitY) < 110 &&
    pearlCount(state) >= WORLD.requiredPearls
  ) {
    state.status = 'won';
    state.events.push({ kind: 'win', x: p.x, y: p.y });
  }
}
