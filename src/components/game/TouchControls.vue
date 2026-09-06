<script setup lang="ts">
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Zap } from '@lucide/vue';
import type { Input } from '../../game/model/simulation';
const emit = defineEmits<{ input: [id: number, action: keyof Input | null] }>();
const groups = [
  [
    { action: 'left', label: 'Left', icon: ArrowLeft },
    { action: 'right', label: 'Right', icon: ArrowRight },
    { action: 'down', label: 'Sink', icon: ArrowDown },
  ],
  [
    { action: 'dash', label: 'Dash', icon: Zap },
    { action: 'swim', label: 'Jump', icon: ArrowUp },
  ],
] satisfies { action: keyof Input; label: string; icon: typeof ArrowLeft }[][];
function press(event: PointerEvent, action: keyof Input) {
  if (!(event.currentTarget instanceof HTMLButtonElement)) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  emit('input', event.pointerId, action);
}
</script>

<template>
  <div class="touch-controls">
    <div v-for="(group, index) in groups" :key="index">
      <button
        v-for="control in group"
        :key="control.action"
        class="touch-button"
        :class="`touch-${control.action}`"
        :aria-label="control.label"
        @pointerdown="press($event, control.action)"
        @pointerup="$emit('input', $event.pointerId, null)"
        @pointercancel="$emit('input', $event.pointerId, null)"
        @lostpointercapture="$emit('input', $event.pointerId, null)"
      >
        <component :is="control.icon" /><span>{{ control.label }}</span>
      </button>
    </div>
  </div>
</template>
