import { readFile } from 'node:fs/promises';
import chokidar from 'chokidar';
import type { CustomClass } from '@ux-builder-tw/shared';
import { resolveApplyDirectives } from './apply-resolver';

interface WatcherCallbacks {
  onUpdate: (classes: CustomClass[]) => void;
  onError: (error: Error) => void;
}

let watcher: chokidar.FSWatcher | null = null;
let currentPath: string | null = null;

export async function startWatching(
  filePath: string,
  callbacks: WatcherCallbacks
): Promise<void> {
  // Stop existing watcher if any
  await stopWatching();

  currentPath = filePath;

  // Initial parse
  await parseAndNotify(filePath, callbacks);

  // Watch for changes
  watcher = chokidar.watch(filePath, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('change', async () => {
    await parseAndNotify(filePath, callbacks);
  });

  watcher.on('error', (error) => {
    callbacks.onError(error);
  });
}

export async function stopWatching(): Promise<void> {
  if (watcher) {
    await watcher.close();
    watcher = null;
    currentPath = null;
  }
}

export function getWatchedFile(): string | null {
  return currentPath;
}

async function parseAndNotify(filePath: string, callbacks: WatcherCallbacks): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const classes = await resolveApplyDirectives(content, filePath);
    callbacks.onUpdate(classes);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
