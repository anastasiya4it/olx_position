<template>
  <div class="app">
    <header class="app-header">
      <h1>OLX Позиція</h1>
      <p class="subtitle">Трекер позиції оголошень за ключовими словами</p>
    </header>

    <main class="app-main">

      <!-- One card per listing -->
      <ListingCard
        v-for="listing in listings"
        :key="listing.id"
        :listing="listing"
        :is-processing="isProcessing"
        :queued-ids="queuedIdsForListing(listing.id)"
        @remove="removeListing(listing.id)"
        @update="updateListing(listing.id, $event)"
        @add-keyword="handleAddKeyword(listing.id, $event)"
        @remove-keyword="removeKeyword(listing.id, $event)"
        @recheck="enqueue(listing.id, $event)"
        @check-all="enqueueAllForListing(listing.id)"
        @cancel="cancelForListing(listing.id)"
      />

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

const { listings, addListing, removeListing, updateListing, addKeyword, removeKeyword } = useStorage();
const { isProcessing, enqueue, enqueueAllForListing, cancelForListing, queuedIdsForListing } = useQueue(listings);

const newUrl  = ref('');
const newCity = ref(DEFAULT_CITY.slug);

function handleAddListing() {
  const url = newUrl.value.trim();
  if (!url) return;
  addListing(url, newCity.value);
  newUrl.value  = '';
  newCity.value = DEFAULT_CITY.slug;
}

function handleAddKeyword(listingId: string, keyword: string) {
  const kw = addKeyword(listingId, keyword);
  enqueue(listingId, kw.id);
}
</script>
