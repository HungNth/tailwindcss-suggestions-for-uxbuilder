import { createApp } from './server';
import { ClassStore } from './services/class-store';
import { generateClassList } from './services/tailwind-generator';

const PORT = process.env.PORT ?? 3000;

async function main() {
  const store = new ClassStore();

  // Generate Tailwind utility classes on startup
  console.warn('[tw-backend] Generating Tailwind CSS v4 utility classes...');
  const classes = await generateClassList();
  store.setClasses(classes);
  console.warn(`[tw-backend] Loaded ${classes.length} utility classes`);

  // Make store available to routes
  const app = createApp();
  app.locals.store = store;

  app.listen(PORT, () => {
    console.warn(`[tw-backend] Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[tw-backend] Failed to start:', err);
  process.exit(1);
});
