<template>
  <div class="app">
    <header class="app-header">
      <h1>OLX Позиція</h1>
      <p class="subtitle">Трекер позиції оголошень за ключовими словами</p>
    </header>

    <main class="app-main">

      <!-- One card per listing -->
      <div
        v-for="(listing, idx) in listings"
        :key="listing.id"
      >
        <ListingCard
          :listing="listing"
          :is-processing="isProcessing"
          :queued-ids="queuedIdsForListing(listing.id)"
          :base-keywords="baseKeywords"
          @remove="removeListing(listing.id)"
          @update="updateListing(listing.id, $event)"
          @add-keyword="handleAddKeyword(listing.id, $event)"
          @remove-keyword="removeKeyword(listing.id, $event)"
          @recheck="enqueue(listing.id, $event)"
          @pin="handlePin"
          @check-all="enqueueAllForListing(listing.id)"
          @cancel="cancelForListing(listing.id)"
          @reorder="reorderKeyword(listing.id, $event.from, $event.to)"
          @move-up="moveListing(idx, -1)"
          @move-down="moveListing(idx, 1)"
        />
      </div>

      <!-- Add listing form -->
      <div class="add-listing-card">
        <div class="add-listing-fields">
          <input
            v-model="newUrl"
            class="add-listing-input"
            placeholder="Посилання на оголошення: https://www.olx.ua/d/uk/obyavlenie/..."
            @keydown.enter="handleAddListing"
          />
          <select v-model="newCity" class="add-listing-city">
            <option v-for="city in CITIES" :key="city.slug" :value="city.slug">
              {{ city.name }}
            </option>
          </select>
        </div>
        <button class="btn btn-primary" :disabled="!newUrl.trim()" @click="handleAddListing">
          + Додати оголошення
        </button>
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ListingCard from './components/ListingCard.vue';
import { CITIES, DEFAULT_CITY } from './constants/cities';
import { useStorage } from './composables/useStorage';
import { useQueue } from './composables/useQueue';

const { listings, baseKeywords, addListing, removeListing, updateListing, addKeyword, removeKeyword, reorderKeyword, reorderListing, toggleBaseKeyword } = useStorage();
const { isProcessing, enqueue, enqueueAllForListing, cancelForListing, queuedIdsForListing } = useQueue(listings);

const newUrl  = ref('');
const newCity = ref(DEFAULT_CITY.slug);

function moveListing(idx: number, dir: -1 | 1) {
  const target = idx + dir;
  if (target < 0 || target >= listings.value.length) return;
  reorderListing(idx, target);
}

function handleAddListing() {
  const url = newUrl.value.trim();
  if (!url) return;
  const listing = addListing(url, newCity.value);
  for (const kw of listing.keywords) {
    enqueue(listing.id, kw.id);
  }
  newUrl.value  = '';
  newCity.value = DEFAULT_CITY.slug;
}

function handlePin(keyword: string) {
  const added = toggleBaseKeyword(keyword);
  for (const { listingId, kwId } of added) {
    enqueue(listingId, kwId);
  }
}

function handleAddKeyword(listingId: string, keyword: string) {
  const kw = addKeyword(listingId, keyword);
  enqueue(listingId, kw.id);
}


</script>
