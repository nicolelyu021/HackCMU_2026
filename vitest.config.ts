import { defineConfig } from 'vitest/config';

// One vitest project per package; tests live in <pkg>/test/*.test.ts and run with `pnpm test`.
// apps/web has no unit tests (it is verified in the browser). Filter one project with `pnpm vitest run --project ai`.
const project = (name: string, root: string) => ({
  test: { name, root, include: ['test/**/*.test.ts'], environment: 'node' as const },
});

export default defineConfig({
  test: {
    projects: [
      project('schema', 'packages/schema'),
      project('platform', 'packages/platform'),
      project('ai', 'packages/ai'),
      project('tts', 'packages/tts'),
      project('video', 'packages/video'),
      project('api', 'services/api'),
    ],
  },
});
