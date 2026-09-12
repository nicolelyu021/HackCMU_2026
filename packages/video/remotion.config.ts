import { Config } from '@remotion/cli/config';

// Owner D. Remotion Studio for the composition: `pnpm studio` (port 3100, never 3000 — Next owns that).
// publicDir = the API's file store, so `pnpm seed` first; staticFile('trips/trip_pgh/media/…') then resolves.
Config.setStudioPort(3100);
Config.setEntryPoint('src/remotion/index.ts');
Config.setPublicDir('../../data/files');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('angle');
Config.setDelayRenderTimeoutInMilliseconds(60_000);
