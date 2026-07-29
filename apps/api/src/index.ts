import cors from 'cors';
import express from 'express';
import { getMetadata } from './metadata.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8kb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.post('/api/metadata', async (req, res) => {
  if (typeof req.body?.url !== 'string') return res.status(400).json({ error: 'Thiếu URL.' });
  try { res.json(await getMetadata(req.body.url)); }
  catch (error) { res.status(422).json({ error: error instanceof Error ? error.message : 'Không thể lấy metadata.' }); }
});
app.listen(process.env.PORT || 8787, () => console.log('API listening on port 8787'));
