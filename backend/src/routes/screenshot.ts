import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { extractListingId } from '../utils/extractId';

const CHROME_PATH =
  process.env.CHROME_PATH ||
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

const CACHE_DIR = path.join(__dirname, '../../cache');

const router = Router();

router.get('/screenshot/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  const { url, refresh } = req.query as { url?: string; refresh?: string };

  if (!url || !listingId) {
    res.status(400).json({ error: 'Missing url or listingId' });
    return;
  }

  const extractedId = extractListingId(url);
  if (extractedId !== listingId) {
    res.status(400).json({ error: 'listingId does not match URL' });
    return;
  }

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cachePath = path.join(CACHE_DIR, `${listingId}.jpg`);

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Type', 'image/jpeg');

  if (refresh !== '1' && fs.existsSync(cachePath)) {
    res.sendFile(cachePath);
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
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

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/122.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'uk-UA,uk;q=0.9' });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3500));

    await page.screenshot({
      path: cachePath,
      type: 'jpeg',
      quality: 75,
      clip: { x: 0, y: 0, width: 1280, height: 700 },
    });

    res.sendFile(cachePath);
  } catch (err) {
    console.error('Screenshot error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to take screenshot' });
    }
  } finally {
    if (browser) await browser.close();
  }
});

export default router;
