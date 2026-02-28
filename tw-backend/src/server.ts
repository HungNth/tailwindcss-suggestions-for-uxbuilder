import express from 'express';
import cors from 'cors';
import { customClassesRouter } from './routes/custom-classes';
import { statusRouter } from './routes/status';
import { configRouter } from './routes/config';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/custom-classes', customClassesRouter);
  app.use('/api/status', statusRouter);
  app.use('/api/config', configRouter);

  return app;
}
