export function extractListingId(url: string): string | null {
  const match = url.match(/-(ID[a-zA-Z0-9]+)\.html/);
  return match ? match[1] : null;
}
