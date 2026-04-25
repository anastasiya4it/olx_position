import { Router, Request, Response } from 'express';
import { extractListingId } from '../utils/extractId';
import { parseOlxPosition } from '../parser/olxParser';

const router = Router();

router.post('/check-position', async (req: Request, res: Response) => {
  const { keyword, listingUrl, citySlug } = req.body as {
    keyword?: string;
    listingUrl?: string;
    citySlug?: string;
  };

  if (!keyword?.trim() || !listingUrl?.trim() || citySlug === undefined) {
    res.status(400).json({ error: 'Заповніть усі поля' });
    return;
  }

  const targetId = extractListingId(listingUrl.trim());
  if (!targetId) {
    res.status(400).json({ error: 'Невірний URL оголошення OLX' });
    return;
  }

  try {
    const result = await parseOlxPosition(
      keyword.trim(),
      citySlug.trim(),
      targetId
    );
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === 'OLX_BLOCKED') {
      res.status(503).json({ error: 'OLX заблокував запит. Спробуйте через кілька хвилин.' });
    } else if (message.includes('timeout') || message.includes('Timeout')) {
      res.status(504).json({ error: 'Перевищено час очікування відповіді від OLX.' });
    } else {
      res.status(500).json({ error: 'Внутрішня помилка сервера.' });
    }
  }
});

export default router;
