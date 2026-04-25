import puppeteer from 'puppeteer-core';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

const MAX_PAGES = 20;
const PAGE_DELAY_MS = 1500;

export interface ParseResult {
  position: number | null;
  topPosition: number | null;
  totalScanned: number;
  pagesScanned: number;
}

function buildSearchUrl(keyword: string, citySlug: string, page: number): string {
  const base = citySlug
    ? `https://www.olx.ua/uk/${citySlug}/`
    : 'https://www.olx.ua/uk/';
  const params = new URLSearchParams({ 'search[q]': keyword });
  if (page > 1) params.set('page', String(page));
  return `${base}?${params.toString()}`;
}

export async function parseOlxPosition(
  keyword: string,
  citySlug: string,
  targetId: string
): Promise<ParseResult> {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });

  let organicCount = 0;
  let foundPosition: number | null = null;
  let topCount = 0;
  let foundTopPosition: number | null = null;
  let pagesScanned = 0;

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'uk-UA,uk;q=0.9' });

    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
      const url = buildSearchUrl(keyword, citySlug, pageNum);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Wait for React to render listing cards after DOM is ready
      await new Promise((r) => setTimeout(r, 3500));

      const title = await page.title();
      if (title.includes('Just a moment') || title.includes('Cloudflare')) {
        throw new Error('OLX_BLOCKED');
      }

      try {
        await page.waitForSelector(
          'a[href*="/d/uk/obyavlenie/"], a[href*="/d/obyavlenie/"]',
          { timeout: 15000 }
        );
      } catch {
        // No listings on this page — stop scanning
        pagesScanned = pageNum;
        break;
      }

      const listings = await page.evaluate(() => {
        // Select every link that points to a listing page — covers main results,
        // extended-search section, and any other OLX listing blocks on the page.
        const allLinks = Array.from(
          document.querySelectorAll(
            'a[href*="/d/uk/obyavlenie/"], a[href*="/d/obyavlenie/"]'
          )
        ) as HTMLAnchorElement[];

        const seen = new Set<string>();
        const seenTop = new Set<string>();
        const results: Array<{ id: string; isPromoted: boolean }> = [];

        for (const link of allLinks) {
          const href = link.href || '';
          const idMatch = href.match(/-(ID[a-zA-Z0-9]+)\.html/);
          if (!idMatch) continue;

          const id = idMatch[1];

          // OLX appends search_reason=search%7Cpromoted for paid TOP placements
          const isPromoted =
            href.includes('search_reason=search%7Cpromoted') ||
            href.includes('search_reason=search|promoted');

          if (isPromoted) {
            if (!seenTop.has(id)) {
              seenTop.add(id);
              results.push({ id, isPromoted: true });
            }
            continue; // do NOT add to seen — organic occurrence must still be counted
          }

          if (seen.has(id)) continue;
          seen.add(id);
          results.push({ id, isPromoted: false });
        }

        return results;
      });

      for (const listing of listings) {
        if (listing.isPromoted) {
          topCount++;
          if (listing.id === targetId && foundTopPosition === null) {
            foundTopPosition = topCount;
          }
        } else {
          organicCount++;
          if (listing.id === targetId && foundPosition === null) {
            foundPosition = organicCount;
          }
        }
      }

      pagesScanned = pageNum;

      if (foundPosition !== null) break;

      const hasNextPage = await page.$(
        'a[data-cy="page-link-next"], a[aria-label="Next page"], a[data-testid="pagination-forward"]'
      );
      if (!hasNextPage) break;

      await new Promise((r) =>
        setTimeout(r, PAGE_DELAY_MS + Math.random() * 500)
      );
    }
  } finally {
    await browser.close();
  }

  return { position: foundPosition, topPosition: foundTopPosition, totalScanned: organicCount, pagesScanned };
}
