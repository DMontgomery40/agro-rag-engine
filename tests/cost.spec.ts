import { test, expect } from '@playwright/test';

async function estimate(request, payload) {
  const res = await request.post('/api/cost/estimate', { data: payload });
  if (!res.ok()) throw new Error(`estimate failed: ${res.status()}`);
  return await res.json();
}

test.describe('Cost calculator sanity', () => {
  test('Embeddings: 0 vs 10M/month (OpenAI small)', async ({ request }) => {
    // Per-day tokens for 10M/month ~ 333_334 per day
    const perDay = Math.ceil(10_000_000 / 30);
    const base = {
      gen_provider: 'openai', gen_model: 'gpt-4o-mini',
      tokens_in: 0, tokens_out: 0, requests_per_day: 1,
      reranks: 0
    };
    const none = await estimate(request, { ...base, embeds: 0, embed_provider: 'openai', embed_model: 'text-embedding-3-small' });
    const many = await estimate(request, { ...base, embeds: perDay, embed_provider: 'openai', embed_model: 'text-embedding-3-small' });
    console.log('Embeds/day:', perDay, 'Daily none:', none.daily, 'Daily many:', many.daily, 'Monthly many:', many.monthly);
    expect(many.daily).toBeGreaterThan(none.daily);
    expect(many.monthly).toBeGreaterThan(none.monthly);
  });

  test('Rerank: 0 vs 10k/day (Cohere)', async ({ request }) => {
    const base = {
      gen_provider: 'openai', gen_model: 'gpt-4o-mini',
      tokens_in: 0, tokens_out: 0, requests_per_day: 1,
      embeds: 0, embed_provider: 'openai', embed_model: 'text-embedding-3-small'
    };
    const none = await estimate(request, { ...base, reranks: 0, rerank_provider: 'cohere', rerank_model: 'rerank-english-v3.0' });
    const many = await estimate(request, { ...base, reranks: 10_000, rerank_provider: 'cohere', rerank_model: 'rerank-english-v3.0' });
    console.log('Reranks/day:', 10_000, 'Daily none:', none.daily, 'Daily many:', many.daily, 'Monthly many:', many.monthly);
    expect(many.daily).toBeGreaterThan(none.daily);
    expect(many.monthly).toBeGreaterThan(none.monthly);
  });
});

