import type { Biome } from './model/level';
import type { GameEvent, GameState, Input } from './model/simulation';

export type Snapshot = Readonly<{
  status: GameState['status'];
  level: number;
  biome: Biome;
  biomeName: string;
  totalPearls: number;
  requiredPearls: number;
  treasureTotal: number;
  pearls: number;
  health: number;
  progress: number;
  region: number;
  dashReady: boolean;
  electroSeconds: number;
  checkpoint: boolean;
  friend: boolean;
  seconds: number;
  treasures: number;
  challenge: string;
}>;

export type GameCallbacks = {
  onSnapshot: (snapshot: Snapshot) => void;
  onEvent: (event: GameEvent) => void;
};

export type GameController = {
  ready: Promise<void>;
  setInput: (input: Input) => void;
  pause: (paused: boolean) => void;
  restart: () => void;
  continue: () => void;
  snapshot: () => Snapshot;
  destroy: () => void;
};
