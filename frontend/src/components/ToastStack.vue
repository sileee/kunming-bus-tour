<script setup lang="ts">
import { ref } from 'vue';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

const toasts = ref<Toast[]>([]);
let nextId = 1;

function addToast(message: string, type: Toast['type'] = 'info', duration = 3000) {
  const id = nextId++;
  toasts.value = [...toasts.value.slice(-1), { id, message, type, timestamp: new Date() }];
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

// Expose for external use
(window as any).__toast = { add: addToast, remove: removeToast };

defineExpose({ addToast, removeToast });
</script>

<template>
  <div v-if="toasts.length > 0" class="toast-stack">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast-item"
      :class="'toast-' + toast.type"
      @click="removeToast(toast.id)"
    >
      <span class="toast-icon">{{ { info: 'i', success: '✓', warning: '!', error: '✗' }[toast.type] }}</span>
      <span class="toast-msg">{{ toast.message }}</span>
      <span class="toast-time">{{ toast.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</span>
    </div>
  </div>
</template>
