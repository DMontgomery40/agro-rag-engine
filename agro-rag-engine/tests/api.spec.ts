import { test, expect, request } from '@playwright/test';

test.describe('HTTP API', () => {
  test('health returns healthy', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('keywords returns arrays and countable union', async ({ request }) => {
    const res = await request.get('/api/keywords');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.keywords)).toBeTruthy();
    expect(Array.isArray(body.discriminative)).toBeTruthy();
    expect(Array.isArray(body.semantic)).toBeTruthy();
  });

  test('prices exposes models incl. embeddings + rerank', async ({ request }) => {
    const res = await request.get('/api/prices');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const models = body.models as any[];
    expect(models.some(m => m.model?.includes('text-embedding'))).toBeTruthy();
    expect(models.some(m => (m.provider === 'cohere' && m.rerank_per_1k > 0))).toBeTruthy();
  });

  test('cost estimate counts gen + embed + rerank', async ({ request }) => {
    const payload = {
      gen_provider: 'openai', gen_model: 'gpt-4o-mini',
      tokens_in: 1000, tokens_out: 1000, requests_per_day: 10,
      embeds: 1000, embed_provider: 'openai', embed_model: 'text-embedding-3-small',
      reranks: 1000, rerank_provider: 'cohere', rerank_model: 'rerank-3.5'
    };
    const res = await request.post('/api/cost/estimate', { data: payload });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.daily).toBeGreaterThan(0);
    expect(body.monthly).toBeGreaterThan(0);
  });

  test('profiles list/save/apply flows', async ({ request }) => {
    const list0 = await (await request.get('/api/profiles')).json();
    const save = await request.post('/api/profiles/save', { data: { name: 'pw-test', profile: { GEN_MODEL: 'gpt-4o-mini' } } });
    expect(save.ok()).toBeTruthy();
    const list1 = await (await request.get('/api/profiles')).json();
    expect((list1.profiles as string[]).includes('pw-test')).toBeTruthy();
    const apply = await request.post('/api/profiles/apply', { data: { profile: { MQ_REWRITES: '3' } } });
    expect(apply.ok()).toBeTruthy();
  });

  test('git hooks install + status endpoints', async ({ request }) => {
    const before = await (await request.get('/api/git/hooks/status')).json();
    const res = await request.post('/api/git/hooks/install');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect((body.message || '')).toContain('Installed git hooks');
    const after = await (await request.get('/api/git/hooks/status')).json();
    expect(after.post_checkout).toBeTruthy();
    expect(after.post_commit).toBeTruthy();
  });
});

