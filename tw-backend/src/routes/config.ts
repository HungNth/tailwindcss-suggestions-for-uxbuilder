import express from 'express';
import type { ClassStore } from '../services/class-store';
import { startWatching } from '../services/css-watcher';

export const configRouter = express.Router();

// POST /api/config
configRouter.post('/', async (req, res) => {
  const { cssFilePath } = req.body;

  if (!cssFilePath || typeof cssFilePath !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Body must contain "cssFilePath" string',
    });
  }

  try {
    const store: ClassStore = req.app.locals.store;

    await startWatching(cssFilePath, {
      onUpdate: (classes) => {
        store.setCustomClasses(classes);
        console.warn(`[tw-backend] Updated ${classes.length} custom classes from ${cssFilePath}`);
      },
      onError: (error) => {
        console.error('[tw-backend] CSS watcher error:', error);
      },
    });

    res.json({
      data: {
        message: 'CSS file watcher started',
        filePath: cssFilePath,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start watcher',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
