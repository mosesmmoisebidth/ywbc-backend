import { describe, it, expect } from 'vitest';
import { app } from '../src/app.js';

const json = async (path: string, body: unknown, headers: Record<string, string> = {}) =>
  app.request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const uniqueEmail = (label: string) => `${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@test.local`;

describe('auth', () => {
  it('signs up a new user and returns a token', async () => {
    const res = await json('/api/auth/sign-up', {
      email: uniqueEmail('signup'),
      password: 'password1234',
      fullName: 'Test User',
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { user: { email: string }; token: string } };
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.email).toMatch(/@test\.local$/);
  });

  it('rejects sign-in with wrong password', async () => {
    const email = uniqueEmail('wrong');
    await json('/api/auth/sign-up', { email, password: 'password1234', fullName: 'Wrong Pass' });
    const res = await json('/api/auth/sign-in', { email, password: 'NOT-RIGHT' });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(/didn't match/i);
  });

  it('returns 401 on /me without token', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the user on /me with token', async () => {
    const email = uniqueEmail('me');
    const sign = await json('/api/auth/sign-up', { email, password: 'password1234', fullName: 'Me User' });
    const { data } = (await sign.json()) as { data: { token: string } };
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { email: string } };
    expect(body.data.email).toBe(email.toLowerCase());
  });

  it('blocks duplicate sign-up with conflict', async () => {
    const email = uniqueEmail('dup');
    await json('/api/auth/sign-up', { email, password: 'password1234', fullName: 'Dup User' });
    const res = await json('/api/auth/sign-up', { email, password: 'password1234', fullName: 'Dup Two' });
    expect(res.status).toBe(409);
  });

  it('returns 400 with field errors on bad input', async () => {
    const res = await json('/api/auth/sign-up', { email: 'bad', password: 'short', fullName: '' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { errors?: Record<string, string> };
    expect(body.errors).toBeTruthy();
  });
});
