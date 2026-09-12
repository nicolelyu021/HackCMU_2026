// Enforces the package dependency direction (docs/ARCHITECTURE.md). Run by `pnpm typecheck`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOWED = {
  '@pinlog/schema': [],
  '@pinlog/platform': ['@pinlog/schema'],
  '@pinlog/ai': ['@pinlog/schema'],
  '@pinlog/tts': ['@pinlog/schema'],
  '@pinlog/video': ['@pinlog/schema'],
  '@pinlog/api': ['@pinlog/schema', '@pinlog/platform', '@pinlog/ai', '@pinlog/tts'],
  '@pinlog/web': ['@pinlog/schema', '@pinlog/video'],
};
const DIRS = {
  '@pinlog/schema': 'packages/schema',
  '@pinlog/platform': 'packages/platform',
  '@pinlog/ai': 'packages/ai',
  '@pinlog/tts': 'packages/tts',
  '@pinlog/video': 'packages/video',
  '@pinlog/api': 'services/api',
  '@pinlog/web': 'apps/web',
};

let failed = false;
for (const [name, dir] of Object.entries(DIRS)) {
  const pkg = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
  if (pkg.name !== name) {
    console.error(`${dir}/package.json is named ${pkg.name}, expected ${name}`);
    failed = true;
  }
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
  for (const dep of deps.filter((d) => d.startsWith('@pinlog/'))) {
    if (!ALLOWED[name].includes(dep)) {
      console.error(`${name} may not depend on ${dep} (allowed: ${ALLOWED[name].join(', ') || 'none'})`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('check-deps: package dependency direction OK');
