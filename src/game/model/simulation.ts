import {
  WORLD,
  platforms,
  pearlBlocks,
  pearlTrail,
  reefTrial,
  reefTreasures,
  TREASURE_VALUE,
  bounceFishIds,
} from './level';
export type Input = {
  left: boolean;
  right: boolean;
  swim: boolean;
  down: boolean;
  dash: boolean;
  fire: boolean;
};
export const idleInput = (): Input => ({
  left: false,
  right: false,
  swim: false,
  down: false,
  dash: false,
  fire: false,
});
export type Status = 'playing' | 'paused' | 'lost' | 'won';
export type CreatureKind = 'catfish' | 'sepia' | 'bigfin' | 'costume-cat';
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
export type GameEvent = {
  kind:
    | 'pearl'
    | 'dash'
    | 'hurt'
    | 'checkpoint'
    | 'friend'
    | 'defeat'
    | 'win'
    | 'jump'
    | 'block'
    | 'stomp'
    | 'electro-spawn'
    | 'electro-pickup'
    | 'electro-shot'
    | 'electro-hit'
    | 'ring'
    | 'trial-failed'
    | 'treasure-unlocked'
    | 'treasure';
  x: number;
  y: number;
};
export type RingTrial =
  | { kind: 'ready' }
  | { kind: 'racing'; nextRing: number; remaining: number }
  | { kind: 'complete' };
export type GameState = {
  ringTrial: RingTrial;
  stompChain: number;
  treasures: { x: number; y: number; unlocked: boolean; collected: boolean }[];
  status: Status;
  elapsed: number;
  pearls: Pearl[];
  creatures: Creature[];
  blocks: ((typeof pearlBlocks)[number] & { used: boolean; bump: number })[];
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: 1 | -1;
    health: number;
    electroTime: number;
    fireCooldown: number;
    invincible: number;
    dashTime: number;
    dashCooldown: number;
    strokeCooldown: number;
    grounded: boolean;
    jumpHeld: boolean;
    coyoteTime: number;
    jumpBuffer: number;
  };
  electroPickups: { x: number; y: number; life: number }[];
  electroBalls: { x: number; y: number; vx: number; life: number }[];
  checkpoint: boolean;
  friend: boolean;
  ink: number;
  events: GameEvent[];
};
export function createGame(): GameState {
  const pearls = pearlTrail.map((pearl) => ({ ...pearl, collected: false }));
  const creatures: Creature[] = [
    {
      id: 0,
      kind: 'catfish',
      x: 1120,
      y: 460,
      homeX: 1120,
      homeY: 460,
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
    {
      id: 6,
      kind: 'costume-cat',
      x: 720,
      y: 565,
      homeX: 720,
      homeY: 565,
      radius: 42,
      active: true,
    },
  ];
  for (const [id, x] of [
    [7, 1320],
    [8, 1500],
  ]) {
    creatures.push({
      id,
      kind: 'catfish',
      x,
      y: 450,
      homeX: x,
      homeY: 450,
      radius: 40,
      active: true,
    });
  }
  return {
    ringTrial: { kind: 'ready' },
    stompChain: 0,
    treasures: reefTreasures.map(({ x, y }) => ({
      x,
      y,
      unlocked: false,
      collected: false,
    })),
    status: 'playing',
    elapsed: 0,
    pearls,
    creatures,
    blocks: pearlBlocks.map((block) => ({ ...block, used: false, bump: 0 })),
    player: {
      x: 160,
      y: WORLD.floor - 34,
      vx: 0,
      vy: 0,
      facing: 1,
      health: 3,
      electroTime: 0,
      fireCooldown: 0,
      invincible: 0,
      dashTime: 0,
      dashCooldown: 0,
      strokeCooldown: 0,
      grounded: true,
      jumpHeld: false,
      coyoteTime: 0,
      jumpBuffer: 0,
    },
    electroPickups: [],
    electroBalls: [],
    checkpoint: false,
    friend: false,
    ink: 0,
    events: [],
  };
}
export const pearlCount = (state: GameState) =>
  state.pearls.filter((p) => p.collected).length +
  state.blocks.filter((block) => block.used).length +
  state.treasures.filter((treasure) => treasure.collected).length *
    TREASURE_VALUE;
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
    electroTime: 0,
    fireCooldown: 0,
    invincible: 2,
    dashTime: 0,
    dashCooldown: 0,
    strokeCooldown: 0,
    grounded: false,
    jumpHeld: false,
    coyoteTime: 0,
    jumpBuffer: 0,
  });
  state.electroPickups = [];
  state.electroBalls = [];
  state.ink = 0;
  state.stompChain = 0;
  if (!state.treasures[0]?.unlocked)
    for (const enemy of state.creatures)
      if (bounceFishIds.includes(enemy.id)) enemy.active = true;
  if (state.ringTrial.kind === 'racing') state.ringTrial = { kind: 'ready' };
  state.status = 'playing';
  state.events = [];
}
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function advance(
  state: GameState,
  input: Input,
  seconds: number,
  random = Math.random,
) {
  if (state.status !== 'playing') return;
  state.events = [];
  const dt = clamp(seconds, 0, 0.05),
    p = state.player;
  state.elapsed += dt;
  p.electroTime = Math.max(0, p.electroTime - dt);
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  const spawnElectro = (x: number, y: number, guaranteed = false) => {
    if (!guaranteed && random() >= 0.16) return;
    state.electroPickups.push({ x, y: y - 55, life: 10 });
    state.events.push({ kind: 'electro-spawn', x, y: y - 55 });
  };
  p.invincible = Math.max(0, p.invincible - dt);
  p.dashTime = Math.max(0, p.dashTime - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.strokeCooldown = Math.max(0, p.strokeCooldown - dt);
  state.ink = Math.max(0, state.ink - dt);
  if (state.ringTrial.kind === 'racing') {
    state.ringTrial.remaining -= dt;
    if (state.ringTrial.remaining <= 0) {
      state.ringTrial = { kind: 'ready' };
      state.events.push({ kind: 'trial-failed', x: p.x, y: p.y });
    }
  }
  const direction = Number(input.right) - Number(input.left);
  if (direction) p.facing = direction > 0 ? 1 : -1;
  if (input.dash && p.dashCooldown === 0) {
    p.dashTime = 0.24;
    p.dashCooldown = 1;
    state.events.push({ kind: 'dash', x: p.x, y: p.y });
  }
  p.coyoteTime = p.grounded ? 0.1 : Math.max(0, p.coyoteTime - dt);
  const pressedJump = input.swim && !p.jumpHeld;
  p.jumpBuffer = pressedJump ? 0.12 : Math.max(0, p.jumpBuffer - dt);
  if (p.jumpBuffer > 0 && p.coyoteTime > 0) {
    p.vy = -455;
    p.grounded = false;
    p.coyoteTime = 0;
    p.jumpBuffer = 0;
    p.strokeCooldown = 0.42;
    state.events.push({ kind: 'jump', x: p.x, y: p.y });
  } else if (input.swim && !p.grounded && p.strokeCooldown === 0) {
    p.vy = -265;
    p.strokeCooldown = 0.3;
  }
  if (!input.swim && p.jumpHeld && p.vy < -160) p.vy = -160;
  p.jumpHeld = input.swim;
  const targetSpeed = direction * 315;
  const acceleration = direction ? (p.grounded ? 1900 : 1450) : 2100;
  p.vx =
    p.dashTime > 0
      ? p.facing * 710
      : p.vx + clamp(targetSpeed - p.vx, -acceleration * dt, acceleration * dt);
  p.vy = clamp(
    p.vy + (input.down ? 1100 : 640) * dt,
    -455,
    input.down ? 420 : 310,
  );
  if (p.dashTime > 0) p.vy *= Math.max(0, 1 - dt * 12);
  const oldX = p.x;
  const oldY = p.y;
  p.x = clamp(p.x + p.vx * dt, 36, WORLD.width - 36);
  if (oldX >= 880 && p.x < 880 && !state.treasures[0]?.unlocked) {
    state.stompChain = 0;
    for (const enemy of state.creatures)
      if (bounceFishIds.includes(enemy.id)) enemy.active = true;
  }
  for (const block of state.blocks) {
    if (p.y + 32 <= block.y - 24 || p.y - 30 >= block.y + 24) continue;
    if (oldX <= block.x - 44 && p.x > block.x - 44) {
      p.x = block.x - 44;
      p.vx = 0;
    } else if (oldX >= block.x + 44 && p.x < block.x + 44) {
      p.x = block.x + 44;
      p.vx = 0;
    }
  }
  p.y = clamp(p.y + p.vy * dt, 90, WORLD.floor - 34);
  p.grounded = p.y === WORLD.floor - 34;
  if (p.y === 90 || p.grounded) p.vy = 0;
  for (const platform of platforms) {
    if (
      !input.down &&
      p.vy >= 0 &&
      p.x > platform.x - 20 &&
      p.x < platform.x + platform.width + 20 &&
      oldY + 32 <= platform.y + 3 &&
      p.y + 32 >= platform.y
    ) {
      p.y = platform.y - 32;
      p.vy = 0;
      p.grounded = true;
    }
  }
  for (const block of state.blocks) {
    block.bump = Math.max(0, block.bump - dt);
    if (Math.abs(p.x - block.x) >= 44) continue;
    if (p.vy < 0 && oldY - 30 >= block.y + 24 && p.y - 30 <= block.y + 24) {
      p.y = block.y + 54;
      p.vy = 70;
      if (!block.used) {
        block.used = true;
        block.bump = 0.22;
        state.events.push({ kind: 'block', x: block.x, y: block.y - 34 });
        spawnElectro(block.x, block.y);
      }
    } else if (
      p.vy >= 0 &&
      oldY + 32 <= block.y - 24 + 3 &&
      p.y + 32 >= block.y - 24
    ) {
      p.y = block.y - 56;
      p.vy = 0;
      p.grounded = true;
    }
  }
  if (!input.down && p.x > 1640 && p.x < 1780 && p.y > 240)
    p.vy = Math.min(p.vy, -340);
  if (!input.down && p.x > 3990 && p.x < 4110) p.vy = Math.min(p.vy, -190);
  if (p.grounded) state.stompChain = 0;
  const ringIndex =
    state.ringTrial.kind === 'racing' ? state.ringTrial.nextRing : 0;
  const ring = reefTrial.rings[ringIndex];
  if (state.ringTrial.kind !== 'complete' && ring && distance(p, ring) < 46) {
    state.events.push({ kind: 'ring', x: ring.x, y: ring.y });
    p.dashCooldown = 0;
    if (ringIndex === reefTrial.rings.length - 1) {
      state.ringTrial = { kind: 'complete' };
      const treasure = state.treasures[1];
      if (treasure) {
        treasure.unlocked = true;
        state.events.push({
          kind: 'treasure-unlocked',
          x: treasure.x,
          y: treasure.y,
        });
      }
    } else {
      state.ringTrial = {
        kind: 'racing',
        nextRing: ringIndex + 1,
        remaining:
          state.ringTrial.kind === 'racing'
            ? state.ringTrial.remaining
            : reefTrial.seconds,
      };
    }
  }
  for (const treasure of state.treasures) {
    if (
      treasure.unlocked &&
      !treasure.collected &&
      distance(p, treasure) < 49
    ) {
      treasure.collected = true;
      state.events.push({ kind: 'treasure', x: treasure.x, y: treasure.y });
    }
  }
  for (const pearl of state.pearls)
    if (!pearl.collected && distance(p, pearl) < 49) {
      pearl.collected = true;
      state.events.push({ kind: 'pearl', x: pearl.x, y: pearl.y });
      spawnElectro(pearl.x, pearl.y, pearl === state.pearls[0]);
    }
  for (const pickup of state.electroPickups) {
    pickup.life -= dt;
    pickup.y = Math.min(WORLD.floor - 28, pickup.y + dt * 38);
    if (pickup.life > 0 && pickup.life < 9.65 && distance(p, pickup) < 52) {
      pickup.life = 0;
      p.electroTime = 20;
      p.fireCooldown = 0;
      state.events.push({ kind: 'electro-pickup', x: p.x, y: p.y });
    }
  }
  state.electroPickups = state.electroPickups.filter(
    (pickup) => pickup.life > 0,
  );
  if (input.fire && p.electroTime > 0 && p.fireCooldown === 0) {
    p.fireCooldown = 0.3;
    state.electroBalls.push({
      x: p.x + p.facing * 40,
      y: p.y,
      vx: p.facing * 620,
      life: 1.5,
    });
    state.events.push({ kind: 'electro-shot', x: p.x, y: p.y });
  }
  for (const ball of state.electroBalls) {
    ball.x += ball.vx * dt;
    ball.life -= dt;
    if (
      ball.x < 0 ||
      ball.x > WORLD.width ||
      state.blocks.some(
        (block) =>
          Math.abs(ball.x - block.x) < 34 && Math.abs(ball.y - block.y) < 34,
      )
    )
      ball.life = 0;
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
    const hit = state.electroBalls.find(
      (ball) => ball.life > 0 && distance(ball, enemy) < enemy.radius + 14,
    );
    if (hit) {
      hit.life = 0;
      state.events.push({ kind: 'electro-hit', x: enemy.x, y: enemy.y });
      if (enemy.kind !== 'bigfin') {
        enemy.active = false;
        continue;
      }
    }
    const d = distance(p, enemy);
    if (
      enemy.kind === 'sepia' &&
      d < 165 &&
      Math.sin(state.elapsed * 1.4 + enemy.id) > 0.8
    )
      state.ink = 0.75;
    if (d < enemy.radius + 27) {
      const stomp = p.vy > 60 && oldY < enemy.y - enemy.radius * 0.65;
      if (stomp && enemy.kind !== 'bigfin') {
        enemy.active = false;
        state.stompChain++;
        if (state.stompChain >= 3) {
          const treasure = state.treasures[0];
          if (treasure && !treasure.unlocked) {
            treasure.unlocked = true;
            state.events.push({
              kind: 'treasure-unlocked',
              x: treasure.x,
              y: treasure.y,
            });
          }
        }
        p.vy = -360;
        p.grounded = false;
        state.events.push({ kind: 'stomp', x: enemy.x, y: enemy.y });
      } else if (p.dashTime > 0 && enemy.kind !== 'bigfin') {
        enemy.active = false;
        state.events.push({ kind: 'defeat', x: enemy.x, y: enemy.y });
      } else if (p.invincible === 0 && p.dashTime === 0) {
        p.health--;
        state.stompChain = 0;
        p.electroTime = 0;
        p.invincible = 1.8;
        p.vy = -200;
        const knockback = Math.sign(p.x - enemy.x) || -p.facing;
        p.x = clamp(p.x + knockback * 65, 36, WORLD.width - 36);
        state.events.push({ kind: 'hurt', x: p.x, y: p.y });
        if (p.health <= 0) {
          state.status = 'lost';
          return;
        }
      }
    }
  }
  state.electroBalls = state.electroBalls.filter((ball) => ball.life > 0);
  if (
    p.x > WORLD.exitX - 75 &&
    Math.abs(p.y - WORLD.exitY) < 110 &&
    pearlCount(state) >= WORLD.requiredPearls
  ) {
    state.status = 'won';
    state.events.push({ kind: 'win', x: p.x, y: p.y });
  }
}

export function adventureHint(state: GameState): string {
  if (state.ringTrial.kind === 'racing')
    return `Ring ${state.ringTrial.nextRing + 1}/3 · ${state.ringTrial.remaining.toFixed(1)}s · Dash refilled!`;
  if (state.player.x < 850)
    return 'Follow the pearls. Take the high route for a challenge!';
  if (state.player.x < 1640) {
    if (state.treasures[0]?.collected)
      return 'Bounce pearl found! Ride the current ahead →';
    if (state.treasures[0]?.unlocked)
      return 'Golden pearl unlocked! Swim up to collect it.';
    if (state.stompChain > 0)
      return `${state.stompChain}/3 stomps · Keep bouncing without landing!`;
    return 'Bounce across 3 fish · Go back before the ledge to retry';
  }
  if (state.player.x < 2400) {
    if (state.treasures[1]?.collected)
      return 'Current pearl found! Checkpoint ahead →';
    if (state.ringTrial.kind === 'complete')
      return 'Golden pearl unlocked! Catch it after the last ring.';
    return 'Ride the current into ring 1 · Race all 3 to win a golden pearl';
  }
  return '';
}
