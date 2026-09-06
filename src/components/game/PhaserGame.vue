<script setup lang="ts">
import { onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import type { GameController, Snapshot } from '../../game/contracts';
import type { GameEvent, Input } from '../../game/model/simulation';
import { GameInput } from '../../game/input';
import { registerGameTools } from '../../game/webmcp';

const emit = defineEmits<{
  snapshot: [Snapshot];
  event: [GameEvent];
  ready: [];
  error: [];
}>();
const host = useTemplateRef<HTMLDivElement>('host');
const input = new GameInput();
let controller: GameController | null = null;
let disposed = false;
let unregister = () => {};
const listeners = new AbortController();

function focus() {
  host.value?.focus({ preventScroll: true });
}
function clearInput() {
  input.clear();
  controller?.setInput(input.read());
}
function pause(paused: boolean) {
  clearInput();
  controller?.pause(paused);
  if (!paused) focus();
}
function restart() {
  clearInput();
  controller?.restart();
  focus();
}
function continueGame() {
  clearInput();
  controller?.continue();
  focus();
}
function pointer(id: number, action: keyof Input | null) {
  input.pointer(id, action);
  controller?.setInput(input.read());
}

onMounted(async () => {
  try {
    const { createOceanGame } = await import('../../game/createGame');
    if (disposed || !host.value) return;
    const game = createOceanGame(host.value, {
      onSnapshot(snapshot) {
        if (snapshot.status !== 'playing') input.clear();
        emit('snapshot', snapshot);
      },
      onEvent: (event) => emit('event', event),
    });
    controller = game;
    await game.ready;
    if (disposed) return;
    unregister = registerGameTools(game);
    const options = { signal: listeners.signal };
    window.addEventListener(
      'keydown',
      (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (
          event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.matches('input, textarea, select'))
        )
          return;
        if (
          event.target instanceof HTMLButtonElement &&
          (event.code === 'Space' || event.code === 'Enter')
        )
          return;
        if (event.code === 'Escape' || event.code === 'KeyP') {
          event.preventDefault();
          if (!event.repeat) pause(game.snapshot().status === 'playing');
        } else if (
          game.snapshot().status === 'playing' &&
          input.key(event.code, true)
        ) {
          event.preventDefault();
          game.setInput(input.read());
        }
      },
      options,
    );
    window.addEventListener(
      'keyup',
      (event) => {
        if (input.key(event.code, false)) game.setInput(input.read());
      },
      options,
    );
    window.addEventListener('blur', () => pause(true), options);
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) pause(true);
      },
      options,
    );
    emit('ready');
    focus();
  } catch {
    if (!disposed) {
      controller?.destroy();
      emit('error');
    }
  }
});

onBeforeUnmount(() => {
  disposed = true;
  listeners.abort();
  unregister();
  clearInput();
  controller?.destroy();
  controller = null;
});

defineExpose({ pause, restart, continueGame, pointer, focus });
</script>

<template>
  <div
    ref="host"
    class="phaser-host"
    tabindex="-1"
    aria-label="Use arrow keys to move, Space to jump or swim, Shift to dash, and Escape to pause."
  />
</template>
