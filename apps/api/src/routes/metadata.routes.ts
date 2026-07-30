import { Router } from 'express';
import { getMetadata } from '../services/metadata.service.js';

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
