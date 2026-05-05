<template>
  <div class="listing-card-outer">
    <div class="listing-card-move-btns">
      <button class="listing-move-btn" title="Вгору" @click="$emit('moveUp')">▲</button>
      <button class="listing-move-btn" title="Вниз" @click="$emit('moveDown')">▼</button>
    </div>
    <div class="listing-card">

      <!-- Card header -->
      <div class="listing-header">
        <div class="listing-meta">

          <!-- Screenshot thumbnail -->
          <button
            v-if="thumbSrc && !thumbError"
            class="listing-thumb-btn"
            title="Переглянути скріншот оголошення"
            @click="showModal = true"
          >
            <div v-if="!thumbLoaded" class="listing-thumb-skeleton" />
            <img
              :src="thumbSrc"
              class="listing-thumb"
              :class="{ 'listing-thumb--loaded': thumbLoaded }"
              alt=""
              @load="thumbLoaded = true"
              @error="thumbError = true"
            />
          </button>

          <!-- Refresh screenshot button -->
          <button
            class="listing-refresh-btn refresh-btn--primary"
            :class="{ 'listing-refresh-btn--spinning': thumbSrc && !thumbLoaded && !thumbError }"
            :title="thumbSrc ? 'Оновити скріншот' : 'Введіть посилання на оголошення'"
            :disabled="!thumbSrc"
            @click="refreshThumb"
          >↺</button>
          <div class="listing-fields">
            <input
              v-model="localUrl"
              class="listing-url-input"
              placeholder="https://www.olx.ua/d/uk/obyavlenie/..."
              @blur="save"
              @keydown.enter="save"
            />
            <select v-model="localCity" class="listing-city-select" @change="save">
              <option v-for="city in CITIES" :key="city.slug" :value="city.slug">
                {{ city.name }}
              </option>
            </select>
          </div>
        </div>
        <button class="btn-icon btn-icon--danger listing-remove" title="Видалити оголошення" @click="$emit('remove')">✕</button>
      </div>

      <!-- Keyword table -->
      <KeywordTable
        :keywords="listing.keywords"
        :is-processing="isProcessing"
        :queued-ids="queuedIds"
        :base-keywords="baseKeywords"
        @add="$emit('addKeyword', $event)"
        @remove="$emit('removeKeyword', $event)"
        @recheck="$emit('recheck', $event)"
        @pin="$emit('pin', $event)"
        @check-all="$emit('checkAll')"
        @cancel="$emit('cancel')"
        @reorder="$emit('reorder', $event)"
      />

      <!-- Screenshot modal -->
      <Teleport to="body">
        <div v-if="showModal" class="thumb-modal-overlay" @click="showModal = false">
          <button class="thumb-modal-close" @click="showModal = false">✕</button>
          <img
            :src="thumbSrc ?? ''"
            class="thumb-modal-img"
            alt=""
            @click.stop
          />
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import KeywordTable from './KeywordTable.vue';
import { CITIES } from '../constants/cities';
import type { Listing } from '../types';

const props = defineProps<{
  listing: Listing;
  isProcessing: boolean;
  queuedIds: string[];
  baseKeywords: string[];
}>();

const emit = defineEmits<{
  remove: [];
  update: [patch: { url?: string; citySlug?: string }];
  addKeyword: [keyword: string];
  removeKeyword: [keywordId: string];
  recheck: [keywordId: string];
  pin: [keyword: string];
  checkAll: [];
  cancel: [];
  reorder: [payload: { from: number; to: number }];
  moveUp: [];
  moveDown: [];
}>();

const localUrl  = ref(props.listing.url);
const localCity = ref(props.listing.citySlug);

watch(() => props.listing.url,      (v) => { localUrl.value  = v; });
watch(() => props.listing.citySlug, (v) => { localCity.value = v; });

function save() {
  emit('update', { url: localUrl.value.trim(), citySlug: localCity.value });
}

// Thumbnail
const showModal   = ref(false);
const thumbLoaded = ref(false);
const thumbError  = ref(false);
const thumbSrc    = ref<string | null>(null);

function buildThumbUrl(listingUrl: string, forceRefresh = false): string | null {
  const match = listingUrl.match(/-(ID[a-zA-Z0-9]+)\.html/);
  if (!match) return null;
  let url = `http://localhost:3000/api/screenshot/${match[1]}?url=${encodeURIComponent(listingUrl)}`;
  if (forceRefresh) url += `&refresh=1&t=${Date.now()}`;
  return url;
}

watch(() => props.listing.url, (url) => {
  thumbSrc.value    = buildThumbUrl(url);
  thumbLoaded.value = false;
  thumbError.value  = false;
}, { immediate: true });

function refreshThumb() {
  thumbLoaded.value = false;
  thumbError.value  = false;
  thumbSrc.value    = buildThumbUrl(props.listing.url, true);
}
</script>
