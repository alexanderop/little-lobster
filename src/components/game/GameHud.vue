<script setup lang="ts">
import { Check, Heart, Pause, Play, Shell, Waves, Zap } from '@lucide/vue';
import type { Snapshot } from '../../game/contracts';

defineProps<{ snapshot: Snapshot; ready: boolean }>();
defineEmits<{ pause: [boolean] }>();
</script>

<template>
  <div class="game-hud">
    <div class="hud-left">
      <div class="heart-row" :aria-label="`${snapshot.health} of 3 hearts`">
        <Heart
          v-for="i in 3"
          :key="i"
          :size="21"
          :fill="i <= snapshot.health ? 'currentColor' : 'none'"
          :class="i <= snapshot.health ? 'heart' : 'heart-empty'"
        />
      </div>
      <div
        class="pearl-score"
        :aria-label="`${snapshot.pearls} of ${snapshot.requiredPearls} pearls`"
      >
        <span class="pearl-dot" />{{ snapshot.pearls
        }}<span>/ {{ snapshot.requiredPearls }}</span>
        <Check v-if="snapshot.pearls >= snapshot.requiredPearls" :size="15" />
      </div>
    </div>
    <div class="hud-right">
      <span
        v-if="snapshot.electroSeconds > 0"
        class="electro-status"
        role="status"
        ><Zap :size="15" />Electro {{ snapshot.electroSeconds }}s</span
      >
      <span class="dash-status" :class="{ charged: snapshot.dashReady }"
        ><Zap :size="15" />{{
          snapshot.dashReady ? 'Dash ready' : 'Recharging'
        }}</span
      >
      <button
        class="pause-button"
        :disabled="
          !ready || snapshot.status === 'won' || snapshot.status === 'lost'
        "
        :aria-label="
          snapshot.status === 'paused' ? 'Resume game' : 'Pause game'
        "
        @click="$emit('pause', snapshot.status !== 'paused')"
      >
        <Play v-if="snapshot.status === 'paused'" /><Pause v-else />
      </button>
    </div>
  </div>
  <div v-if="ready && snapshot.challenge" class="challenge-hud">
    <span>{{ snapshot.challenge }}</span>
    <span
      v-if="snapshot.treasureTotal > 0"
      class="treasure-count"
      :aria-label="`${snapshot.treasures} of ${snapshot.treasureTotal} golden pearls`"
      >✦ {{ snapshot.treasures }}/{{ snapshot.treasureTotal }}</span
    >
  </div>
  <div class="game-route">
    <span
      ><Waves :size="14" />Level {{ snapshot.level }} ·
      {{ snapshot.biomeName }}</span
    >
    <div
      class="route-track"
      role="progressbar"
      aria-label="Level progress"
      :aria-valuenow="Math.min(100, Math.round(snapshot.progress * 100))"
      :aria-valuemin="0"
      :aria-valuemax="100"
    >
      <i :style="{ width: `${Math.min(100, snapshot.progress * 100)}%` }" />
    </div>
    <span aria-label="Journey pearls"
      >{{ snapshot.totalPearls }} total <Shell :size="18"
    /></span>
  </div>
</template>
