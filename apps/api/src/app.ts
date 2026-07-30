import cors from 'cors';
import express from 'express';
import { metadataRouter } from './routes/metadata.routes.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '8kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', metadataRouter);

  return app;
}
