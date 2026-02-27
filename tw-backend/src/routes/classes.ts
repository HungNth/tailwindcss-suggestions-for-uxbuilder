import express from 'express';
import type { ClassStore } from '../services/class-store';

export const classesRouter = express.Router();

// GET /api/classes/search?q=bg-bl&limit=20
classesRouter.get('/search', (req, res) => {
  const store: ClassStore = req.app.locals.store;
  const query = (req.query.q as string) || '';
  const limit = parseInt((req.query.limit as string) || '50', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter', message: 'Query "q" is required' });
  }

  const results = store.search(query, limit, offset);
  const customResults = store.searchCustom(query, limit);

  // Combine utility and custom classes for autocomplete
  const allClasses = [...results, ...customResults];

  res.json({
    data: allClasses,
  });
});

// POST /api/classes/validate
classesRouter.post('/validate', (req, res) => {
  const store: ClassStore = req.app.locals.store;
  const { classNames } = req.body;

  if (!Array.isArray(classNames)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Body must contain "classNames" array',
    });
  }

  const results = store.validateMany(classNames);
  res.json({ data: results });
});
