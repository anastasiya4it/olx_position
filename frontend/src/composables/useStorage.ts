import { ref, watch } from 'vue';
import type { Listing, SavedKeyword } from '../types';

const LISTINGS_KEY  = 'olx_tracker_listings';
const BASE_KWS_KEY  = 'olx_tracker_base_keywords';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Migrate from the old single-listing format (v1) to Listing[] (v2). */
function loadListings(): Listing[] {
  const existing = load<Listing[]>(LISTINGS_KEY, []);
  if (existing.length > 0) {
    // Reset statuses that got stuck if the app was closed mid-run
    for (const listing of existing) {
      for (const kw of listing.keywords) {
        if (kw.status === 'running' || kw.status === 'queued') {
          kw.status = 'idle';
        }
      }
    }
    return existing;
  }

  // v1 migration: olx_tracker_config + olx_tracker_keywords
  try {
    const cfg = load<{ listingUrl?: string; citySlug?: string } | null>('olx_tracker_config', null);
    const kws = load<SavedKeyword[]>('olx_tracker_keywords', []);
    if (cfg?.listingUrl) {
      localStorage.removeItem('olx_tracker_config');
      localStorage.removeItem('olx_tracker_keywords');
      return [{
        id: `migrated-${Date.now()}`,
        url: cfg.listingUrl,
        citySlug: cfg.citySlug ?? 'zaporozhe',
        keywords: kws,
      }];
    }
  } catch { /* ignore */ }

  return [];
}

function makeKeyword(keyword: string): SavedKeyword {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    keyword: keyword.trim(),
    position: null,
    topPosition: null,
    totalScanned: 0,
    totalListings: null,
    lastChecked: null,
    status: 'idle',
    error: null,
  };
}

export function useStorage() {
  const listings     = ref<Listing[]>(loadListings());
  const baseKeywords = ref<string[]>(load<string[]>(BASE_KWS_KEY, []));

  watch(listings,     (v) => localStorage.setItem(LISTINGS_KEY, JSON.stringify(v)), { deep: true });
  watch(baseKeywords, (v) => localStorage.setItem(BASE_KWS_KEY, JSON.stringify(v)));

  function addListing(url: string, citySlug: string): Listing {
    const entry: Listing = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      url: url.trim(),
      citySlug,
      keywords: baseKeywords.value.map(makeKeyword),
    };
    listings.value.push(entry);
    return entry;
  }

  /** Pin/unpin a keyword as a base keyword.
   *  Returns newly added {listingId, kwId} pairs so callers can enqueue them. */
  function toggleBaseKeyword(keyword: string): Array<{ listingId: string; kwId: string }> {
    const idx = baseKeywords.value.indexOf(keyword);
    if (idx !== -1) {
      baseKeywords.value.splice(idx, 1);
      return [];
    }
    baseKeywords.value.push(keyword);
    const added: Array<{ listingId: string; kwId: string }> = [];
    for (const listing of listings.value) {
      if (!listing.keywords.some((k) => k.keyword === keyword)) {
        const kw = makeKeyword(keyword);
        listing.keywords.push(kw);
        added.push({ listingId: listing.id, kwId: kw.id });
      }
    }
    return added;
  }

  function removeListing(listingId: string) {
    listings.value = listings.value.filter((l) => l.id !== listingId);
  }

  function updateListing(listingId: string, patch: Partial<Pick<Listing, 'url' | 'citySlug'>>) {
    const l = listings.value.find((l) => l.id === listingId);
    if (!l) return;
    if (patch.url !== undefined) l.url = patch.url;
    if (patch.citySlug !== undefined) l.citySlug = patch.citySlug;
  }

  function addKeyword(listingId: string, keyword: string): SavedKeyword {
    const l = listings.value.find((l) => l.id === listingId);
    if (!l) throw new Error('listing not found');
    const kw = makeKeyword(keyword);
    l.keywords.push(kw);
    return kw;
  }

  function removeKeyword(listingId: string, keywordId: string) {
    const l = listings.value.find((l) => l.id === listingId);
    if (!l) return;
    l.keywords = l.keywords.filter((k) => k.id !== keywordId);
  }

  function reorderKeyword(listingId: string, fromIdx: number, toIdx: number) {
    const l = listings.value.find((l) => l.id === listingId);
    if (!l || fromIdx === toIdx) return;
    const [moved] = l.keywords.splice(fromIdx, 1);
    l.keywords.splice(toIdx, 0, moved);
  }

  function reorderListing(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const [moved] = listings.value.splice(fromIdx, 1);
    listings.value.splice(toIdx, 0, moved);
  }

  return { listings, baseKeywords, addListing, removeListing, updateListing, addKeyword, removeKeyword, reorderKeyword, reorderListing, toggleBaseKeyword };
}
