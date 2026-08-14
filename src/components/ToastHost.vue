<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="t in toast.items"
        :key="t.id"
        class="pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm flex items-start gap-2"
        :class="classes(t.type)"
        style="animation: toast-in .18s ease-out"
      >
        <span class="mt-0.5">{{ icon(t.type) }}</span>
        <span class="flex-1 leading-relaxed">{{ t.message }}</span>
        <button class="text-text2 hover:text-white leading-none" @click="toast.dismiss(t.id)">✕</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast'
const toast = useToastStore()

function classes(type) {
  return {
    success: 'bg-panel border-accent/40 text-white',
    error: 'bg-panel border-cutc/50 text-white',
    info: 'bg-panel border-line text-white',
  }[type] || 'bg-panel border-line text-white'
}
function icon(type) {
  return { success: '✓', error: '⚠', info: 'ℹ' }[type] || 'ℹ'
}
</script>

<style scoped>
.toast-leave-active { transition: all .15s ease-in; }
.toast-leave-to { opacity: 0; transform: translateX(8px); }
</style>
