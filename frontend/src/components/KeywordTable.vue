<template>
  <div class="kw-table-wrap">

    <!-- Toolbar -->
    <div class="kw-toolbar">
      <button class="btn btn-primary" :disabled="isProcessing || keywords.length === 0" @click="$emit('checkAll')">
        {{ isProcessing ? 'Перевіряю...' : 'Перевірити всі' }}
      </button>
      <button class="btn btn-ghost" :disabled="!isProcessing" @click="$emit('cancel')">
        Зупинити
      </button>
      <span v-if="isProcessing" class="queue-status">
        В черзі: {{ queuedIds.length }}
      </span>
    </div>

    <!-- Table -->
    <div class="table-scroll">
      <table class="kw-table">
        <thead>
          <tr>
            <th class="col-drag"></th>
            <th class="col-kw">Ключове слово</th>
            <th class="col-pos">Позиція</th>
            <th class="col-top">ТОП</th>
            <th class="col-pages">Оголошень</th>
            <th class="col-date">Оновлено</th>
            <th class="col-status">Статус</th>
            <th class="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(kw, idx) in keywords"
            :key="kw.id"
            draggable="true"
            :class="['row-' + kw.status, { 'row-dragging': dragIdx === idx, 'row-drag-over': dragOver === idx }]"
            @dragstart="onDragStart(idx, $event)"
            @dragover.prevent="dragOver = idx"
            @dragleave="dragOver = null"
            @drop="onDrop(idx)"
            @dragend="dragIdx = null; dragOver = null"
          >
            <td class="col-drag">⠿</td>
            <td class="col-kw">{{ kw.keyword }}</td>
            <td class="col-pos">
              <span v-if="kw.status === 'done' && kw.position !== null" class="pos-badge pos-found">
                #{{ kw.position }}
              </span>
              <span v-else-if="kw.status === 'done' && kw.position === null" class="pos-badge pos-none">
                —
              </span>
              <span v-else-if="kw.status === 'error'" class="pos-badge pos-error" :title="kw.error ?? ''">
                помилка
              </span>
              <span v-else class="muted">—</span>
            </td>
            <td class="col-top">
              <span v-if="kw.status === 'done' && kw.topPosition !== null" class="pos-badge pos-top">
                #{{ kw.topPosition }}
              </span>
              <span v-else-if="kw.status === 'done'" class="muted">—</span>
              <span v-else class="muted">—</span>
            </td>
            <td class="col-pages muted">
              {{ kw.totalListings !== null ? kw.totalListings : '—' }}
            </td>
            <td class="col-date muted">
              {{ formatDate(kw.lastChecked) }}
            </td>
            <td class="col-status">
              <span :class="['status-chip', `status-${kw.status}`]">
                {{ STATUS_LABELS[kw.status] }}
              </span>
            </td>
            <td class="col-actions">
              <button
                :class="['btn-icon', 'btn-icon--pin', { 'btn-icon--pinned': baseKeywords.includes(kw.keyword) }]"
                :title="baseKeywords.includes(kw.keyword) ? 'Видалити з базових ключів' : 'Додати до базових ключів'"
                @click="$emit('pin', kw.keyword)"
              >★</button>
              <button
                class="btn-icon"
                title="Перевірити ще раз"
                :disabled="kw.status === 'queued' || kw.status === 'running'"
                @click="$emit('recheck', kw.id)"
              >↺</button>
              <button
                class="btn-icon btn-icon--danger"
                title="Видалити"
                :disabled="kw.status === 'running'"
                @click="$emit('remove', kw.id)"
              >✕</button>
            </td>
          </tr>

          <!-- Add new row -->
          <tr class="row-add">
            <td class="col-drag"></td>
            <td class="col-kw" colspan="6">
              <input
                v-model="newKeyword"
                class="add-input"
                placeholder="Додати ключове слово..."
                @keydown.enter="submitNew"
              />
            </td>
            <td class="col-actions">
              <button class="btn-icon" title="Додати" :disabled="!newKeyword.trim()" @click="submitNew">+</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty hint -->
    <p v-if="keywords.length === 0" class="empty-hint">
      Введіть перше ключове слово в рядку нижче
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { SavedKeyword, KeywordStatus } from '../types';

defineProps<{
  keywords: SavedKeyword[];
  isProcessing: boolean;
  queuedIds: string[];
  baseKeywords: string[];
}>();

const emit = defineEmits<{
  add: [keyword: string];
  remove: [id: string];
  recheck: [id: string];
  pin: [keyword: string];
  checkAll: [];
  cancel: [];
  reorder: [payload: { from: number; to: number }];
}>();

const newKeyword = ref('');
const dragIdx    = ref<number | null>(null);
const dragOver   = ref<number | null>(null);

function submitNew() {
  const kw = newKeyword.value.trim();
  if (!kw) return;
  emit('add', kw);
  newKeyword.value = '';
}

function onDragStart(idx: number, e: DragEvent) {
  e.stopPropagation();
  dragIdx.value = idx;
  e.dataTransfer!.effectAllowed = 'move';
}

function onDrop(idx: number) {
  if (dragIdx.value !== null && dragIdx.value !== idx)
    emit('reorder', { from: dragIdx.value, to: idx });
  dragOver.value = null;
}

const STATUS_LABELS: Record<KeywordStatus, string> = {
  idle:    'очікує',
  queued:  'в черзі',
  running: 'перевіряю...',
  done:    'готово',
  error:   'помилка',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  return isToday ? time : d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' ' + time;
}
</script>
