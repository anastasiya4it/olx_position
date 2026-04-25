<template>
  <div class="config-bar">
    <div class="config-field">
      <label>Посилання на оголошення</label>
      <input
        v-model="localUrl"
        type="url"
        placeholder="https://www.olx.ua/d/uk/obyavlenie/..."
        @blur="save"
        @keydown.enter="save"
      />
    </div>
    <div class="config-field config-field--city">
      <label>Місто</label>
      <select v-model="localCity" @change="save">
        <option v-for="city in CITIES" :key="city.slug" :value="city.slug">
          {{ city.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { CITIES } from '../constants/cities';
import type { AppConfig } from '../types';

const props = defineProps<{ config: AppConfig }>();
const emit = defineEmits<{ update: [config: AppConfig] }>();

const localUrl  = ref(props.config.listingUrl);
const localCity = ref(props.config.citySlug);

watch(() => props.config, (c) => {
  localUrl.value  = c.listingUrl;
  localCity.value = c.citySlug;
});

function save() {
  emit('update', { listingUrl: localUrl.value.trim(), citySlug: localCity.value });
}
</script>
