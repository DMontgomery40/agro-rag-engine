import { test, expect } from '@playwright/test'

test.describe('Chat Config API Smoke', () => {
  test('GET/POST /api/chat/config roundtrip', async ({ request }) => {
    // Initial GET succeeds
    const g0 = await request.get('/api/chat/config')
    expect(g0.ok()).toBeTruthy()
    const initial = await g0.json()
    expect(typeof initial).toBe('object')

    const payload = {
      model: 'gpt-4o-mini',
      temperature: 0.25,
      maxTokens: 900,
      streaming: true
    }

    const p = await request.post('/api/chat/config', { data: payload })
    expect(p.ok()).toBeTruthy()

    const g1 = await request.get('/api/chat/config')
    expect(g1.ok()).toBeTruthy()
    const after = await g1.json()
    for (const [k, v] of Object.entries(payload)) {
      expect(after[k]).toEqual(v)
    }
  })

  test('POST /api/chat/templates accepts name+prompt', async ({ request }) => {
    const r = await request.post('/api/chat/templates', {
      data: { name: 'SmokeTemplate', prompt: 'You are helpful.' }
    })
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    expect(body.ok).toBeTruthy()
  })
})

