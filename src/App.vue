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
  Maximize,
  Minimize,
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
import { TOTAL_PEARLS, WORLD, biomeNames } from './game/model/level';
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
  level: 1,
  biome: 'reef',
  biomeName: 'Sunlit Reef',
  totalPearls: 0,
  requiredPearls: 18,
  treasureTotal: 2,
  pearls: 0,
  health: 3,
  progress: 0,
  region: 0,
  dashReady: true,
  electroSeconds: 0,
  checkpoint: false,
  friend: false,
  seconds: 0,
  treasures: 0,
  challenge: '',
});
const game = useTemplateRef<InstanceType<typeof PhaserGame>>('game');
const app = useTemplateRef<HTMLElement>('app');
const fullscreen = ref(false);
const fullscreenPending = ref(false);
const fullscreenError = ref('');
const fullscreenSupported = document.fullscreenEnabled;
function syncFullscreen() {
  fullscreen.value = document.fullscreenElement === app.value;
}
async function toggleFullscreen() {
  if (!app.value || fullscreenPending.value) return;
  fullscreenPending.value = true;
  fullscreenError.value = '';
  try {
    if (document.fullscreenElement === app.value)
      await document.exitFullscreen();
    else await app.value.requestFullscreen();
    if (started.value && snapshot.value.status === 'playing')
      game.value?.focus();
  } catch {
    fullscreenError.value = 'Fullscreen could not open. Please try again.';
  } finally {
    syncFullscreen();
    fullscreenPending.value = false;
  }
}
document.addEventListener('fullscreenchange', syncFullscreen);
const audio = new OceanAudio();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const overlay = computed(
  () => started.value && ready.value && snapshot.value.status !== 'playing',
);
const messages: Record<GameEvent['kind'], string> = {
  ring: '',
  'trial-failed': 'Time ran out. Return to ring 1 to try again!',
  'treasure-unlocked': 'A golden pearl unlocked! Swim over and catch it.',
  treasure: '+3 pearls! Golden treasure found.',
  checkpoint: 'Checkpoint reached. Hearts restored!',
  friend: 'Narwhal says hello! Hearts restored + a little protection.',
  win: 'Pearls delivered! The next ocean is ready.',
  hurt: 'Stomp smaller enemies from above, or claw dash through.',
  'electro-spawn': 'An electric pearl! Catch the glowing orb.',
  'electro-pickup': 'Electro power! Hold F or Electro to shoot for 20 seconds.',
  'electro-shot': '',
  'electro-hit': '',
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
  document.removeEventListener('fullscreenchange', syncFullscreen);
});
function reload() {
  window.location.reload();
}
</script>

<template>
  <main ref="app" class="ocean-app" :class="{ 'has-started': started }">
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
          v-if="fullscreenSupported"
          class="icon-button"
          :aria-label="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          :title="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          :aria-pressed="fullscreen"
          :disabled="fullscreenPending"
          @click="toggleFullscreen"
        >
          <Minimize v-if="fullscreen" /><Maximize v-else />
        </button>
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
    <p v-if="fullscreenError" role="alert">{{ fullscreenError }}</p>
    <section
      class="game-frame"
      :class="{ 'is-playing': started }"
      aria-label="Little Lobster game"
    >
      <template v-if="!started">
        <div class="welcome-sea" />
        <div class="welcome-vignette" />
        <div class="chapter-tag">
          <span class="live-dot" />ENDLESS<span class="tag-divider">/</span>THE
          PEARL TRAIL
        </div>
        <div class="welcome-content">
          <p class="eyebrow">SMALL CLAWS. BIG ADVENTURE.</p>
          <h1>Little<br /><em>Lobster</em></h1>
          <p class="welcome-copy">
            Jump. Swim. Stomp.<br />A new ocean beyond every shell.
          </p>
          <button class="dive-button" @click="started = true">
            Let’s play<ArrowRight :size="20" />
          </button>
          <span class="start-hint"
            >Collect {{ WORLD.requiredPearls }} pearls to open the next level.
            Progress saves at each shell.</span
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
          <Waves :size="18" />Sunlit Reef<span>LEVEL 1 → ∞</span>
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
            snapshot.pearls < snapshot.requiredPearls &&
            snapshot.status === 'playing'
          "
          class="exit-hint"
        >
          Find {{ snapshot.requiredPearls - snapshot.pearls }} more pearls, then
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
        <TouchControls
          v-if="ready && !overlay && !error"
          :powered="snapshot.electroSeconds > 0"
          @input="pointer"
        />
      </template>
    </section>
    <div class="below-game">
      <div class="controls-legend">
        <span><kbd>←</kbd><kbd>→</kbd>Move</span
        ><span><kbd>SPACE</kbd>Jump / swim</span
        ><span><kbd>SHIFT</kbd>Claw dash</span
        ><span><kbd>F</kbd>Electro ball</span><span><kbd>ESC</kbd>Pause</span>
      </div>
      <span class="gentle-note">Bump blocks. Bounce on baddies.</span>
    </div>
    <div class="chapter-strip">
      <div
        v-for="(name, biome) in biomeNames"
        :key="name"
        :class="{ 'current-chapter': snapshot.biome === biome }"
      >
        <span>{{
          biome === 'reef' ? '01' : biome === 'kelp' ? '02' : '03'
        }}</span
        >{{ name }}<span class="chapter-line" />
      </div>
    </div>
    <footer class="game-footer">
      <span>LEVEL {{ snapshot.level }} · ENDLESS PEARL RESCUE</span
      ><span>Collect pearls. Make waves.</span>
    </footer>
  </main>
</template>
