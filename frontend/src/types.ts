export interface CheckPositionRequest {
  keyword: string;
  listingUrl: string;
  citySlug: string;
}

export interface CheckPositionResponse {
  position: number | null;
  topPosition: number | null;
  totalScanned: number;
  pagesScanned: number;
  error?: string;
}

export interface City {
  name: string;
  slug: string;
}

export type KeywordStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

export interface SavedKeyword {
  id: string;
  keyword: string;
  position: number | null;
  topPosition: number | null;
  totalScanned: number;
  pagesScanned: number;
  lastChecked: string | null;
  status: KeywordStatus;
  error: string | null;
}

export interface Listing {
  id: string;
  url: string;
  citySlug: string;
  keywords: SavedKeyword[];
}

/** @deprecated — kept only for migration from old localStorage format */
export interface AppConfig {
  listingUrl: string;
  citySlug: string;
}
