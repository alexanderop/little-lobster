import type { GameEvent } from './model/simulation';
export class OceanAudio {
  private context: AudioContext | null = null;
  muted = true;
  async enable() {
    this.muted = false;
    this.context ??= new AudioContext();
    try {
      await this.context.resume();
    } catch {
      this.muted = true;
    }
  }
  play(event: GameEvent) {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const context = this.context,
      oscillator = context.createOscillator(),
      gain = context.createGain();
    const notes = {
      ring: 1046,
      'trial-failed': 220,
      'treasure-unlocked': 1318,
      treasure: 1568,
      'electro-spawn': 980,
      'electro-pickup': 1320,
      'electro-shot': 580,
      'electro-hit': 180,
      pearl: 880,
      jump: 330,
      block: 1175,
      stomp: 520,
      dash: 220,
      hurt: 130,
      checkpoint: 660,
      friend: 740,
      defeat: 440,
      win: 1046,
    };
    oscillator.type = event.kind === 'hurt' ? 'triangle' : 'square';
    oscillator.frequency.setValueAtTime(notes[event.kind], context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      notes[event.kind] * 1.5,
      context.currentTime + 0.14,
    );
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  }
  destroy() {
    if (this.context) void this.context.close().catch(() => {});
  }
}
