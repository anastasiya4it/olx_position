import { ref, type Ref } from 'vue';
import type { Listing, SavedKeyword } from '../types';
import { checkPosition } from '../api/checkPosition';

const DELAY_MS = 10000;

interface QueueItem {
  listingId: string;
  keywordId: string;
}

export function useQueue(listings: Ref<Listing[]>) {
  const isProcessing = ref(false);
  const queue = ref<QueueItem[]>([]);

  function getListing(listingId: string): Listing | undefined {
    return listings.value.find((l) => l.id === listingId);
  }

  function getKeyword(listingId: string, keywordId: string): SavedKeyword | undefined {
    return getListing(listingId)?.keywords.find((k) => k.id === keywordId);
  }

  function isInQueue(listingId: string, keywordId: string): boolean {
    return queue.value.some((i) => i.listingId === listingId && i.keywordId === keywordId);
  }

  function enqueue(listingId: string, keywordId: string) {
    const kw = getKeyword(listingId, keywordId);
    if (!kw) return;
    if (kw.status === 'queued' || kw.status === 'running') return;
    if (isInQueue(listingId, keywordId)) return;
    kw.status = 'queued';
    kw.error = null;
    queue.value.push({ listingId, keywordId });
    if (!isProcessing.value) processNext();
  }

  function enqueueAllForListing(listingId: string) {
    const listing = getListing(listingId);
    if (!listing) return;
    for (const kw of listing.keywords) {
      if (kw.status === 'queued' || kw.status === 'running') continue;
      if (isInQueue(listingId, kw.id)) continue;
      kw.status = 'queued';
      kw.error = null;
      queue.value.push({ listingId, keywordId: kw.id });
    }
    if (!isProcessing.value) processNext();
  }

  function cancelForListing(listingId: string) {
    // Remove queued (not running) items for this listing
    queue.value = queue.value.filter((item) => {
      if (item.listingId !== listingId) return true;
      const kw = getKeyword(item.listingId, item.keywordId);
      if (kw && kw.status === 'queued') kw.status = 'idle';
      return kw?.status === 'running'; // keep running item in queue until it finishes
    });
  }

  /** IDs of keywords in queue (or running) for a specific listing */
  function queuedIdsForListing(listingId: string): string[] {
    return queue.value
      .filter((i) => i.listingId === listingId)
      .map((i) => i.keywordId);
  }

  async function processNext() {
    if (isProcessing.value) return;
    isProcessing.value = true;

    while (queue.value.length > 0) {
      const item = queue.value[0];
      const listing = getListing(item.listingId);
      const kw = getKeyword(item.listingId, item.keywordId);

      if (!listing || !kw) {
        queue.value.shift();
        continue;
      }

      kw.status = 'running';

      try {
        const result = await checkPosition({
          keyword: kw.keyword,
          listingUrl: listing.url,
          citySlug: listing.citySlug,
        });
        kw.position = result.position;
        kw.topPosition = result.topPosition;
        kw.totalScanned = result.totalScanned;
        kw.totalListings = result.totalListings;
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

      queue.value.shift();

      if (queue.value.length > 0) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    isProcessing.value = false;
  }

  return { isProcessing, queue, enqueue, enqueueAllForListing, cancelForListing, queuedIdsForListing };
}
