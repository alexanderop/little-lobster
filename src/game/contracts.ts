import type { GameEvent, GameState, Input } from './model/simulation';

export type Snapshot = Readonly<{
  status: GameState['status'];
  pearls: number;
  health: number;
  progress: number;
  region: number;
  dashReady: boolean;
  checkpoint: boolean;
  friend: boolean;
  seconds: number;
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
