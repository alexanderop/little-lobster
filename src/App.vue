<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
  shallowRef,
  useTemplateRef,
} from 'vue';
import {
  ArrowRight,
  RotateCcw,
  Shell,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
} from '@lucide/vue';
import PhaserGame from './components/game/PhaserGame.vue';
import GameHud from './components/game/GameHud.vue';
import GameMenu from './components/game/GameMenu.vue';
import TouchControls from './components/game/TouchControls.vue';
import { OceanAudio } from './game/audio';
import { readBest, saveBest } from './game/best-score';
import { TOTAL_PEARLS, WORLD, regionNames } from './game/model/level';
import type { GameEvent, Input } from './game/model/simulation';
import type { Snapshot } from './game/contracts';

const started = ref(false),
  ready = ref(false),
  error = ref(false),
  notice = ref('');
const muted = ref(true),
  best = ref(readBest());
const snapshot = shallowRef<Snapshot>({
  status: 'playing',
  pearls: 0,
  health: 3,
  progress: 0,
  region: 0,
  dashReady: true,
  checkpoint: false,
  friend: false,
  seconds: 0,
});
const game = useTemplateRef<InstanceType<typeof PhaserGame>>('game');
const audio = new OceanAudio();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const overlay = computed(
  () => started.value && ready.value && snapshot.value.status !== 'playing',
);
const messages: Record<GameEvent['kind'], string> = {
  checkpoint: 'Checkpoint reached. Hearts restored!',
  friend: 'Narwhal says hello! Hearts restored + a little protection.',
  win: 'You brought the pearls home.',
  hurt: 'Stomp smaller enemies from above, or claw dash through.',
  pearl: '',
  jump: '',
  block: '+1 pearl! Bump the golden blocks from below.',
  stomp: 'Nice stomp! Keep bouncing.',
  dash: '',
  defeat: 'Nice dash! The path is clear.',
};
function receiveSnapshot(value: Snapshot) {
  snapshot.value = value;
  if (value.status === 'won') best.value = saveBest(value.pearls);
}
function receiveEvent(event: GameEvent) {
  audio.play(event);
  if (!messages[event.kind]) return;
  notice.value = messages[event.kind];
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = '';
  }, 3500);
}
function clearNotice() {
  clearTimeout(noticeTimer);
  notice.value = '';
}
function restart() {
  clearNotice();
  game.value?.restart();
}
function retry() {
  clearNotice();
  game.value?.continueGame();
}
async function sound() {
  if (muted.value) await audio.enable();
  else audio.muted = true;
  muted.value = audio.muted;
}
function pointer(id: number, action: keyof Input | null) {
  game.value?.pointer(id, action);
}
function updateBest() {
  best.value = readBest();
}
window.addEventListener('storage', updateBest);
onBeforeUnmount(() => {
  audio.destroy();
  clearTimeout(noticeTimer);
  window.removeEventListener('storage', updateBest);
});
function reload() {
  window.location.reload();
}
</script>

<template>
  <main class="ocean-app">
    <header class="masthead">
      <a class="wordmark" href="/" aria-label="Little Lobster home"
        ><Shell :size="28" /><span
          >little lobster<span class="wordmark-sub">PEARL RESCUE</span></span
        ></a
      >
      <div class="masthead-right">
        <span class="edition">UNDERWATER PLATFORM ADVENTURE</span>
        <span v-if="best > 0" class="best-score"
          ><Sparkles :size="14" />Best {{ best }}/{{ TOTAL_PEARLS }}</span
        >
        <button
          class="icon-button"
          :aria-label="muted ? 'Turn sound on' : 'Mute sound'"
          :aria-pressed="!muted"
          @click="sound"
        >
          <VolumeX v-if="muted" /><Volume2 v-else />
        </button>
      </div>
    </header>
    <section
      class="game-frame"
      :class="{ 'is-playing': started }"
      aria-label="Little Lobster game"
    >
      <template v-if="!started">
        <div class="welcome-sea" />
        <div class="welcome-vignette" />
        <div class="chapter-tag">
          <span class="live-dot" />WORLD 01<span class="tag-divider">/</span>THE
          PEARL TRAIL
        </div>
        <div class="welcome-content">
          <p class="eyebrow">SMALL CLAWS. BIG ADVENTURE.</p>
          <h1>Little<br /><em>Lobster</em></h1>
          <p class="welcome-copy">
            Jump. Swim. Stomp.<br />Bring the pearls back home.
          </p>
          <button class="dive-button" @click="started = true">
            Let’s play<ArrowRight :size="20" />
          </button>
          <span class="start-hint"
            >Collect {{ WORLD.requiredPearls }} pearls and find the home
            shell.</span
          >
        </div>
        <img
          width="1254"
          height="1254"
          class="welcome-lobster"
          src="/assets/lobster.png"
          alt="Your little hamster hero in a red lobster suit"
        />
        <div class="world-label">
          <Waves :size="18" />Sunlit Reef<span>01 / 03</span>
        </div>
      </template>
      <template v-else>
        <PhaserGame
          ref="game"
          @snapshot="receiveSnapshot"
          @event="receiveEvent"
          @ready="ready = true"
          @error="error = true"
        />
        <GameHud
          :snapshot="snapshot"
          :ready="ready && !error"
          @pause="game?.pause($event)"
        />
        <output v-if="!ready && !error" class="loading-message"
          >Getting your flippers ready…</output
        >
        <div v-if="error" class="state-overlay" role="alert">
          <div class="state-card">
            <h2>The ocean couldn’t load.</h2>
            <p>Please reload to try again.</p>
            <button class="dive-button" @click="reload">
              Try again<RotateCcw />
            </button>
          </div>
        </div>
        <output class="game-notice" aria-live="polite">{{ notice }}</output>
        <div
          v-if="
            snapshot.progress > 0.91 &&
            snapshot.pearls < WORLD.requiredPearls &&
            snapshot.status === 'playing'
          "
          class="exit-hint"
        >
          Find {{ WORLD.requiredPearls - snapshot.pearls }} more pearls, then
          return to the shell.
        </div>
        <GameMenu
          v-if="overlay && !error"
          :key="snapshot.status"
          :snapshot="snapshot"
          @resume="game?.pause(false)"
          @restart="restart"
          @retry="retry"
        />
        <TouchControls v-if="ready && !overlay && !error" @input="pointer" />
      </template>
    </section>
    <div class="below-game">
      <div class="controls-legend">
        <span><kbd>←</kbd><kbd>→</kbd>Move</span
        ><span><kbd>SPACE</kbd>Jump / swim</span
        ><span><kbd>SHIFT</kbd>Claw dash</span><span><kbd>ESC</kbd>Pause</span>
      </div>
      <span class="gentle-note">Bump blocks. Bounce on baddies.</span>
    </div>
    <div class="chapter-strip">
      <div
        v-for="(name, index) in regionNames"
        :key="name"
        :class="{ 'current-chapter': snapshot.region === index }"
      >
        <span>0{{ index + 1 }}</span
        >{{ name }}<span class="chapter-line" />
      </div>
    </div>
    <footer class="game-footer">
      <span>WORLD 1 · PEARL RESCUE</span
      ><span>Collect pearls. Make waves.</span>
    </footer>
  </main>
</template>
