import { ref, type Ref } from 'vue';
import type { SavedKeyword, AppConfig } from '../types';
import { checkPosition } from '../api/checkPosition';

// Delay between sequential requests to avoid OLX rate-limiting
const DELAY_MS = 10000;

export function useQueue(
  keywords: Ref<SavedKeyword[]>,
  config: Ref<AppConfig>
) {
  const isProcessing = ref(false);
  const queueIds = ref<string[]>([]);

  function getKw(id: string): SavedKeyword | undefined {
    return keywords.value.find((k) => k.id === id);
  }

  function enqueue(id: string) {
    const kw = getKw(id);
    if (!kw) return;
    if (kw.status === 'queued' || kw.status === 'running') return;
    if (queueIds.value.includes(id)) return;
    kw.status = 'queued';
    kw.error = null;
    queueIds.value.push(id);
    if (!isProcessing.value) processNext();
  }

  function enqueueAll() {
    for (const kw of keywords.value) {
      if (kw.status === 'queued' || kw.status === 'running') continue;
      if (queueIds.value.includes(kw.id)) continue;
      kw.status = 'queued';
      kw.error = null;
      queueIds.value.push(kw.id);
    }
    if (!isProcessing.value) processNext();
  }

  function cancelQueue() {
    // Mark queued (not running) items back to idle
    for (const id of queueIds.value) {
      const kw = getKw(id);
      if (kw && kw.status === 'queued') kw.status = 'idle';
    }
    queueIds.value = queueIds.value.filter((id) => getKw(id)?.status === 'running');
  }

  async function processNext() {
    if (isProcessing.value || queueIds.value.length === 0) return;
    isProcessing.value = true;

    while (queueIds.value.length > 0) {
      const id = queueIds.value[0];
      const kw = getKw(id);

      if (!kw) {
        queueIds.value.shift();
        continue;
      }

      kw.status = 'running';

      try {
        const result = await checkPosition({
          keyword: kw.keyword,
          listingUrl: config.value.listingUrl,
          citySlug: config.value.citySlug,
        });

        kw.position = result.position;
        kw.totalScanned = result.totalScanned;
        kw.pagesScanned = result.pagesScanned;
        kw.lastChecked = new Date().toISOString();
        kw.status = 'done';
        kw.error = result.error ?? null;
      } catch (e: unknown) {
        kw.status = 'error';
        kw.lastChecked = new Date().toISOString();
        if (e && typeof e === 'object' && 'response' in e) {
          const ax = e as { response?: { data?: { error?: string } } };
          kw.error = ax.response?.data?.error ?? 'Помилка запиту';
        } else {
          kw.error = e instanceof Error ? e.message : 'Невідома помилка';
        }
      }

      queueIds.value.shift();

      // Pause between requests only if more items are waiting
      if (queueIds.value.length > 0) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    isProcessing.value = false;
  }

  return { isProcessing, queueIds, enqueue, enqueueAll, cancelQueue };
}
