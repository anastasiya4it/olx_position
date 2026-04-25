export interface CheckPositionRequest {
  keyword: string;
  listingUrl: string;
  citySlug: string;
}

export interface CheckPositionResponse {
  position: number | null;
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
  totalScanned: number;
  pagesScanned: number;
  lastChecked: string | null;
  status: KeywordStatus;
  error: string | null;
}

export interface AppConfig {
  listingUrl: string;
  citySlug: string;
}
