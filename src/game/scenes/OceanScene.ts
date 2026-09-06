import * as Phaser from 'phaser';
import {
  advance,
  continueGame,
  createGame,
  idleInput,
  pearlCount,
  setPaused,
} from '../model/simulation';
import { WORLD, region } from '../model/level';
import type { Input } from '../model/simulation';
import type { GameCallbacks, Snapshot } from '../contracts';
import { OceanView } from '../objects/OceanView';

const STEP = 1 / 60;

export class OceanScene extends Phaser.Scene {
  private state = createGame();
  private controls = idleInput();
  private view: OceanView | null = null;
  private accumulated = 0;
  private snapshotTime = 0;

  constructor(
    private callbacks: GameCallbacks,
    private onReady: () => void,
  ) {
    super('ocean');
  }

  create() {
    this.view = new OceanView(this, this.state);
    this.view.reset(this.state);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls = idleInput();
      this.view = null;
      this.accumulated = this.snapshotTime = 0;
    });
    this.emitSnapshot();
    this.onReady();
  }

  update(_time: number, delta: number) {
    if (!this.view || this.state.status !== 'playing') return;
    this.accumulated += Math.min(delta / 1000, 0.1);
    while (this.accumulated >= STEP && this.state.status === 'playing') {
      const fallingSpeed = this.state.player.vy;
      advance(this.state, this.controls, STEP);
      this.view.lobster.step(this.state, fallingSpeed, STEP);
      for (const event of this.state.events) {
        this.view.lobster.react(event);
        this.view.burst(event);
        this.callbacks.onEvent(event);
      }
      this.accumulated -= STEP;
    }
    this.view.render(this.state, Math.min(delta, 100));
    this.snapshotTime += delta;
    if (this.snapshotTime >= 100 || this.state.status !== 'playing') {
      this.emitSnapshot();
      this.snapshotTime = 0;
    }
  }

  setInput(input: Input) {
    this.controls =
      this.state.status === 'playing' ? { ...input } : idleInput();
  }

  pause(paused: boolean) {
    setPaused(this.state, paused);
    this.controls = idleInput();
    this.accumulated = 0;
    this.emitSnapshot();
  }

  restart() {
    this.state = createGame();
    this.resetPresentation();
  }

  continue() {
    if (this.state.status !== 'lost') return;
    continueGame(this.state);
    this.resetPresentation();
  }

  private resetPresentation() {
    this.controls = idleInput();
    this.accumulated = this.snapshotTime = 0;
    this.view?.reset(this.state);
    this.emitSnapshot();
  }

  snapshot(): Snapshot {
    return {
      status: this.state.status,
      pearls: pearlCount(this.state),
      health: this.state.player.health,
      progress: this.state.player.x / WORLD.exitX,
      region: region(this.state.player.x),
      electroSeconds: Math.ceil(this.state.player.electroTime),
      dashReady: this.state.player.dashCooldown === 0,
      checkpoint: this.state.checkpoint,
      friend: this.state.friend,
      seconds: Math.floor(this.state.elapsed),
    };
  }

  private emitSnapshot() {
    this.callbacks.onSnapshot(this.snapshot());
  }
}
