import { idleInput } from './model/simulation';
import type { Input } from './model/simulation';

const keyMap: Readonly<Record<string, keyof Input>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'swim',
  KeyW: 'swim',
  Space: 'swim',
  ArrowDown: 'down',
  KeyS: 'down',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyX: 'dash',
  KeyZ: 'fire',
};

export class GameInput {
  private keys = new Set<string>();
  private pointers = new Map<number, keyof Input>();

  key(code: string, pressed: boolean): boolean {
    if (!keyMap[code]) return false;
    if (pressed) this.keys.add(code);
    else this.keys.delete(code);
    return true;
  }

  pointer(id: number, action: keyof Input | null) {
    if (action === null) this.pointers.delete(id);
    else this.pointers.set(id, action);
  }

  read(): Input {
    const input = idleInput();
    for (const code of this.keys) input[keyMap[code]] = true;
    for (const action of this.pointers.values()) input[action] = true;
    return input;
  }

  clear() {
    this.keys.clear();
    this.pointers.clear();
  }
}
