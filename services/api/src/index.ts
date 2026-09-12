import { networkInterfaces } from 'node:os';
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createContainer } from './container';
import { loadEnv } from './env';

const env = loadEnv();
const container = createContainer(env);
const app = createApp(container);

/** First non-internal IPv4 — the address a phone on the same Wi-Fi uses (docs: "Run it on your phone"). */
function lanAddress(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) return i.address;
  }
  return null;
}

serve({ fetch: app.fetch, port: env.PINLOG_API_PORT }, (info) => {
  const p = container.providers;
  const lan = lanAddress();
  console.log(
    `pinlog api http://localhost:${info.port}  mode=${container.mode}  llm=${p.llm}  places=${p.places}  tts=${p.tts}  data=${container.data_dir}`,
  );
  if (lan)
    console.log(`pinlog on your phone → open http://${lan}:3000 (api http://${lan}:${info.port})`);
});
