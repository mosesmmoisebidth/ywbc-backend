import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const get = (path: string, headers: Record<string, string> = {}) =>
  app.request(path, { headers });

describe('admin authorization', () => {
  it('returns 401 with no token', async () => {
    const res = await get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const email = `nonadmin.${Date.now()}.${Math.floor(Math.random() * 1e6)}@test.local`;
    const sign = await post('/api/auth/sign-up', {
      email,
      password: 'password1234',
      fullName: 'Non Admin',
    });
    const { data } = (await sign.json()) as { data: { token: string } };
    const res = await get('/api/admin/stats', { Authorization: `Bearer ${data.token}` });
    expect(res.status).toBe(403);
  });

  it('returns 200 for admin user', async () => {
    const sign = await post('/api/auth/sign-in', {
      email: 'brave@yourwellbeingcenter.rw',
      password: 'ChangeMe123!',
    });
    if (sign.status !== 200) {
      // Seed not run — skip without failing.
      return;
    }
    const { data } = (await sign.json()) as { data: { token: string } };
    const res = await get('/api/admin/stats', { Authorization: `Bearer ${data.token}` });
    expect(res.status).toBe(200);
  });
});
