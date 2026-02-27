import express from 'express';
import type { ClassStore } from '../services/class-store';
import { getWatchedFile } from '../services/css-watcher';

export const statusRouter = express.Router();

// GET /api/status
statusRouter.get('/', (req, res) => {
  const store: ClassStore = req.app.locals.store;
  const stats = store.getStats();

  res.json({
    data: {
      running: true,
      tailwindVersion: '4.0.0', // TODO: get from package
      totalClasses: stats.totalClasses,
      tailwindClassCount: stats.totalClasses, // Alias for popup compatibility
      totalCustomClasses: stats.totalCustomClasses,
      customClassCount: stats.totalCustomClasses, // Alias for popup compatibility
      watchedFile: getWatchedFile(),
      lastUpdated: new Date().toISOString(),
      config: {
        cssFilePath: getWatchedFile() || undefined,
      },
    },
  });
});
