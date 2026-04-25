<template>
  <div class="app">
    <header class="app-header">
      <h1>OLX Позиція</h1>
      <p class="subtitle">Трекер позиції вашого оголошення за ключовими словами</p>
    </header>

    <main class="app-main">
      <ListingConfig :config="config" @update="config = $event" />

      <div v-if="!config.listingUrl" class="config-hint">
        Вкажіть посилання на оголошення щоб почати
      </div>

      <KeywordTable
        v-else
        :keywords="keywords"
        :is-processing="isProcessing"
        :queue-ids="queueIds"
        @add="handleAdd"
        @remove="removeKeyword"
        @recheck="enqueue"
        @check-all="enqueueAll"
        @cancel="cancelQueue"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import ListingConfig from './components/ListingConfig.vue';
import KeywordTable from './components/KeywordTable.vue';
import { useStorage } from './composables/useStorage';
import { useQueue } from './composables/useQueue';

const { keywords, config, addKeyword, removeKeyword } = useStorage();
const { isProcessing, queueIds, enqueue, enqueueAll, cancelQueue } = useQueue(keywords, config);

function handleAdd(keyword: string) {
  const entry = addKeyword(keyword);
  enqueue(entry.id);
}
</script>
