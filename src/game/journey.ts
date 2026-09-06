import { generateLevel } from './model/level';
import { createGame, type GameState } from './model/simulation';

export const JOURNEY_KEY = 'little-lobster-journey-v1';

export function readJourney(): GameState {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(JOURNEY_KEY) ?? 'null',
    );
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'version' in raw &&
      raw.version === 1 &&
      'level' in raw &&
      typeof raw.level === 'number' &&
      Number.isSafeInteger(raw.level) &&
      raw.level >= 1 &&
      'seed' in raw &&
      typeof raw.seed === 'number' &&
      Number.isInteger(raw.seed) &&
      raw.seed >= 0 &&
      raw.seed <= 0xffffffff &&
      'pearls' in raw &&
      typeof raw.pearls === 'number' &&
      Number.isSafeInteger(raw.pearls) &&
      raw.pearls >= 0
    ) {
      return createGame(generateLevel(raw.level, raw.seed), raw.pearls);
    }
  } catch {
    // Storage is optional; a new journey remains playable.
  }
  return createGame(generateLevel(1, Math.floor(Math.random() * 0x100000000)));
}

export function saveJourney(state: GameState) {
  try {
    localStorage.setItem(
      JOURNEY_KEY,
      JSON.stringify({
        version: 1,
        level: state.level.number,
        seed: state.level.seed,
        pearls: state.bankedPearls,
      }),
    );
  } catch {
    // Storage is optional; the current journey continues in memory.
  }
}
