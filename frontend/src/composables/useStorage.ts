import { ref, watch } from 'vue';
import type { Listing, SavedKeyword } from '../types';

const LISTINGS_KEY = 'olx_tracker_listings';

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
    pagesScanned: 0,
    lastChecked: null,
    status: 'idle',
    error: null,
  };
}

export function useStorage() {
  const listings = ref<Listing[]>(loadListings());

  watch(listings, (v) => localStorage.setItem(LISTINGS_KEY, JSON.stringify(v)), { deep: true });

  function addListing(url: string, citySlug: string): Listing {
    const entry: Listing = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      url: url.trim(),
      citySlug,
      keywords: [],
    };
    listings.value.push(entry);
    return entry;
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

  return { listings, addListing, removeListing, updateListing, addKeyword, removeKeyword };
}
