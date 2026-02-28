import { createApp } from './server';
import { ClassStore } from './services/class-store';

const PORT = typeof process.env.PORT === 'string' ? parseInt(process.env.PORT, 10) : 3456;

async function main(): Promise<void> {
  const store = new ClassStore();
  const app = createApp();
  app.locals.store = store;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.warn(`[tw-backend] Custom class server running on http://localhost:${PORT}`);
    console.warn(`[tw-backend] Endpoints: /api/custom-classes, /api/config, /api/status`);
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
