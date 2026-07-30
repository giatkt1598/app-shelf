import { Router } from 'express';
import { fetchIcon, getMetadata } from '../services/metadata.service.js';

export const metadataRouter = Router();

metadataRouter.post('/metadata', async (req, res) => {
  if (typeof req.body?.url !== 'string') {
    return res.status(400).json({ error: 'Thiếu URL.' });
  }

  try {
    return res.json(await getMetadata(req.body.url));
  } catch (error) {
    return res.status(422).json({
      error: error instanceof Error ? error.message : 'Không thể lấy metadata.',
    });
  }
});

metadataRouter.get('/icon', async (req, res) => {
  const url = typeof req.query.url === 'string' ? req.query.url : undefined;
  if (!url) return res.status(400).json({ error: 'Thiếu URL icon.' });

  try {
    const icon = await fetchIcon(url);
    res.set({
      'cache-control': 'public, max-age=86400',
      'content-type': icon.contentType,
      'x-content-type-options': 'nosniff',
    });
    return res.send(icon.body);
  } catch (error) {
    return res.status(422).json({
      error: error instanceof Error ? error.message : 'Không thể tải icon.',
    });
  }
});
