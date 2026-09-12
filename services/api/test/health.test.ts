import { describe, expect, it } from 'vitest';
import { ErrorResponse, Health } from '@pinlog/schema';
import { createApp } from '../src/app';
import { createContainer } from '../src/container';
import { loadEnv } from '../src/env';
import { fakePorts } from '../src/testing';

describe('host', () => {
  const app = createApp(createContainer(loadEnv({}), fakePorts()), { quiet: true });

  it('GET /health reports mock mode and the effective adapters', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = Health.parse(await res.json());
    expect(body.mode).toBe('mock');
    expect(body.providers).toEqual({ llm: 'mock', places: 'mock', tts: 'mock' });
    expect(body.files_base_url).toBe('http://localhost:8787/files');
  });

  it('unknown routes use the error envelope', async () => {
    const res = await app.request('/nope');
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe('not_found');
  });

  it('answers CORS preflight for the web origin', async () => {
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'POST' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });
});
