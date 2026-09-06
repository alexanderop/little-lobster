import * as Phaser from 'phaser';
import {
  advance,
  continueGame,
  createGame,
  nextLevel,
  idleInput,
  pearlCount,
  setPaused,
  adventureHint,
} from '../model/simulation';
import { generateLevel, biomeNames, region } from '../model/level';
import type { GameState, Input } from '../model/simulation';
import type { GameCallbacks, Snapshot } from '../contracts';
import { OceanView } from '../objects/OceanView';

import { saveJourney } from '../journey';

const STEP = 1 / 60;

export class OceanScene extends Phaser.Scene {
  private state: GameState;
  private controls = idleInput();
  private view: OceanView | null = null;
  private accumulated = 0;
  private snapshotTime = 0;

  constructor(
    private callbacks: GameCallbacks,
    private onReady: () => void,
    initialState: GameState = createGame(),
  ) {
    super('ocean');
    this.state = initialState;
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
    saveJourney(this.state);
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
        if (event.kind === 'win') saveJourney(nextLevel(this.state));
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
    this.view?.setPlaying(this.state.status === 'playing');
    this.controls = idleInput();
    this.accumulated = 0;
    this.emitSnapshot();
  }

  restart() {
    const wasGenerated = this.state.level.number > 1;
    this.state = createGame(
      generateLevel(1, Math.floor(Math.random() * 0x100000000)),
    );
    saveJourney(this.state);
    if (wasGenerated) this.rebuildView();
    this.resetPresentation();
  }

  continue() {
    if (this.state.status === 'won') {
      this.state = nextLevel(this.state);
      saveJourney(this.state);
      this.rebuildView();
      this.resetPresentation();
      return;
    }
    if (this.state.status !== 'lost') return;
    continueGame(this.state);
    this.resetPresentation();
  }

  private rebuildView() {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.view = new OceanView(this, this.state);
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
      level: this.state.level.number,
      biome: this.state.level.biome,
      biomeName: biomeNames[this.state.level.biome],
      totalPearls: this.state.bankedPearls + pearlCount(this.state),
      requiredPearls: this.state.level.world.requiredPearls,
      treasureTotal: this.state.treasures.length,
      pearls: pearlCount(this.state),
      health: this.state.player.health,
      progress: this.state.player.x / this.state.level.world.exitX,
      region: region(this.state.player.x),
      electroSeconds: Math.ceil(this.state.player.electroTime),
      dashReady: this.state.player.dashCooldown === 0,
      checkpoint: this.state.checkpoint,
      friend: this.state.friend,
      seconds: Math.floor(this.state.elapsed),
      treasures: this.state.treasures.filter((treasure) => treasure.collected)
        .length,
      challenge: adventureHint(this.state),
    };
  }

  private emitSnapshot() {
    this.callbacks.onSnapshot(this.snapshot());
  }
}
