<script setup lang="ts">
import type { ToastVariant } from '~/composables/useToast'

const { toasts, dismiss } = useToast()

const accent: Record<ToastVariant, { bar: string; icon: string }> = {
  success: { bar: 'border-l-emerald-500', icon: 'text-emerald-600' },
  error: { bar: 'border-l-red-500', icon: 'text-red-600' },
  info: { bar: 'border-l-accent', icon: 'text-accent' },
}
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-l-4 border-line bg-surface px-3.5 py-3 shadow-pop"
        :class="accent[t.variant].bar"
      >
        <span class="mt-0.5 shrink-0" :class="accent[t.variant].icon">
          <svg v-if="t.variant === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg v-else-if="t.variant === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </span>
        <p class="flex-1 text-sm leading-snug text-ink">{{ t.message }}</p>
        <button class="shrink-0 text-faint transition-colors hover:text-ink" aria-label="Dismiss" @click="dismiss(t.id)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
.toast-leave-active {
  position: absolute;
  right: 0;
  width: 100%;
}
.toast-move {
  transition: transform 0.25s ease;
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none;
  }
}
</style>
