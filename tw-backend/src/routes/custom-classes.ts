import express from 'express';
import type { ClassStore } from '../services/class-store';

export const customClassesRouter = express.Router();

// GET /api/custom-classes
customClassesRouter.get('/', (req, res) => {
  const store: ClassStore = req.app.locals.store;
  const customClasses = store.searchCustom('', 1000); // Return all custom classes

  res.json({ data: customClasses });
});
