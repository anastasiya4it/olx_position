import { ref, watch } from 'vue';
import type { SavedKeyword, AppConfig } from '../types';

const KEYWORDS_KEY = 'olx_tracker_keywords';
const CONFIG_KEY = 'olx_tracker_config';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useStorage() {
  const keywords = ref<SavedKeyword[]>(
    load<SavedKeyword[]>(KEYWORDS_KEY, [])
  );

  const config = ref<AppConfig>(
    load<AppConfig>(CONFIG_KEY, { listingUrl: '', citySlug: 'zaporozhe' })
  );

  watch(keywords, (v) => localStorage.setItem(KEYWORDS_KEY, JSON.stringify(v)), { deep: true });
  watch(config,   (v) => localStorage.setItem(CONFIG_KEY,   JSON.stringify(v)), { deep: true });

  function addKeyword(keyword: string): SavedKeyword {
    const entry: SavedKeyword = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      keyword: keyword.trim(),
      position: null,
      totalScanned: 0,
      pagesScanned: 0,
      lastChecked: null,
      status: 'idle',
      error: null,
    };
    keywords.value.push(entry);
    return entry;
  }

  function removeKeyword(id: string) {
    keywords.value = keywords.value.filter((k) => k.id !== id);
  }

  return { keywords, config, addKeyword, removeKeyword };
}
