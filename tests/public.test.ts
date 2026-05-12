import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';

describe('public reads', () => {
  it('lists psychologists', async () => {
    const res = await app.request('/api/psychologists');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('returns a daily quote (or null when empty)', async () => {
    const res = await app.request('/api/quotes/daily');
    expect(res.status).toBe(200);
  });

  it('lists FAQs by category', async () => {
    const res = await app.request('/api/faqs?category=BOOKING');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { category: string }[] };
    for (const f of body.data) expect(f.category).toBe('BOOKING');
  });

  it('returns 404 for unknown path', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
  });

  it('exposes /health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });
});
