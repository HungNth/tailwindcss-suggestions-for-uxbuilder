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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.warn(`[tw-backend] Server running on http://localhost:${PORT}`);
    console.warn(`[tw-backend] Server address:`, server.address());
  });

  server.on('error', (err) => {
    console.error('[tw-backend] Server error:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[tw-backend] Failed to start:', err);
  process.exit(1);
});
