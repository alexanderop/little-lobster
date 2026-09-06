import type { GameState } from './model/simulation';

export function heroFrame(
  state: GameState,
  reaction: 'none' | 'hurt' | 'pearl' = 'none',
): number {
  const { player, elapsed, status } = state;
  if (reaction === 'hurt' || status === 'lost') return 7;
  if (player.dashTime > 0) return 6;
  if (status === 'won') return 2;
  if (player.strokeCooldown > 0 || Math.abs(player.vx) > 25) {
    const beat = Math.floor(elapsed * 8) % 4;
    return beat === 0 ? 3 : beat === 2 ? 5 : 4;
  }
  if (player.vy > 180) return 5;
  if (reaction === 'pearl') return 2;
  const idle = elapsed % 4;
  if (idle > 2.7 && idle < 2.86) return 1;
  if (idle > 3.2 && idle < 3.65) return 2;
  return 0;
}
