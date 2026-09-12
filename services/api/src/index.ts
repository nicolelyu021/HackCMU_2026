import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createContainer } from './container';
import { loadEnv } from './env';

const env = loadEnv();
const container = createContainer(env);
const app = createApp(container);

serve({ fetch: app.fetch, port: env.PINLOG_API_PORT }, (info) => {
  const p = container.providers;
  console.log(
    `pinlog api http://localhost:${info.port}  mode=${container.mode}  llm=${p.llm}  places=${p.places}  tts=${p.tts}  data=${container.data_dir}`,
  );
});
