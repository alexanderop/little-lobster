<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import { ArrowRight, Heart, RotateCcw, Shell, Waves } from '@lucide/vue';
import type { Snapshot } from '../../game/contracts';
const props = defineProps<{ snapshot: Snapshot }>();
const emit = defineEmits<{ resume: []; restart: []; retry: [] }>();
const primary = useTemplateRef<HTMLButtonElement>('primary');
const menu = useTemplateRef<HTMLDivElement>('menu');
const title = computed(() =>
  props.snapshot.status === 'won'
    ? `Level ${props.snapshot.level} complete!`
    : props.snapshot.status === 'lost'
      ? 'A little breather.'
      : 'Just floating.',
);
onMounted(() => primary.value?.focus({ preventScroll: true }));
function proceed() {
  if (props.snapshot.status === 'won') emit('retry');
  else if (props.snapshot.status === 'lost') emit('retry');
  else emit('resume');
}
function trapFocus(event: KeyboardEvent) {
  const buttons = Array.from(menu.value?.querySelectorAll('button') ?? []);
  const first = buttons[0],
    last = buttons.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
</script>

<template>
  <div
    ref="menu"
    class="state-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="game-menu-title"
    @keydown.tab="trapFocus"
  >
    <div class="state-card">
      <span class="state-icon"
        ><Shell v-if="snapshot.status === 'won'" :size="38" /><Heart
          v-else-if="snapshot.status === 'lost'"
          :size="38" /><Waves v-else :size="38"
      /></span>
      <p class="eyebrow">
        {{
          snapshot.status === 'won'
            ? 'A LITTLE OCEAN HERO'
            : snapshot.status === 'lost'
              ? 'EVERY ADVENTURE TAKES PRACTICE'
              : 'TAKE YOUR TIME'
        }}
      </p>
      <h2 id="game-menu-title">{{ title }}</h2>
      <p v-if="snapshot.status === 'won'">
        {{ snapshot.pearls }} pearls brought home in
        {{ Math.floor(snapshot.seconds / 60) }}m {{ snapshot.seconds % 60 }}s.{{
          snapshot.friend ? ' And a narwhal friend made along the way.' : ''
        }}
      </p>
      <p v-if="snapshot.status === 'won'" class="treasure-result">
        {{ snapshot.totalPearls }} pearls on your journey. Level
        {{ snapshot.level + 1 }} is ready.
      </p>
      <p
        v-if="snapshot.status === 'won' && snapshot.treasureTotal > 0"
        class="treasure-result"
      >
        {{ snapshot.treasures }}/2 golden pearls found.{{
          snapshot.treasures < 2
            ? ' Try the high reef route for the others!'
            : ' Both reef challenges mastered!'
        }}
      </p>
      <p v-else-if="snapshot.status === 'lost'">
        Your pearls are safe. Try again from
        {{ snapshot.checkpoint ? 'the checkpoint' : 'the reef' }}.
      </p>
      <p v-else-if="snapshot.status === 'paused'">
        The ocean will be right here. Reloading resumes at the start of this
        level.
      </p>
      <button ref="primary" class="dive-button" @click="proceed">
        {{
          snapshot.status === 'won'
            ? 'Next level'
            : snapshot.status === 'lost'
              ? 'Keep swimming'
              : 'Keep playing'
        }}<ArrowRight :size="20" />
      </button>
      <button
        v-if="snapshot.status === 'paused'"
        class="restart-button"
        @click="$emit('restart')"
      >
        <RotateCcw :size="14" />Start over
      </button>
    </div>
  </div>
</template>
