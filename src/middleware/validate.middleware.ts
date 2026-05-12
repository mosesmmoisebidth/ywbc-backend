import type { ZodSchema } from 'zod';
import { createMiddleware } from 'hono/factory';
import { ApiError } from '../lib/apiError.js';
import type { AppEnv } from '../types/hono.js';

type Source = 'body' | 'query' | 'params';

const friendly = (source: Source) =>
  source === 'body'
    ? 'Please check your details and try again'
    : source === 'query'
      ? 'Please check the request and try again'
      : 'Something is missing from the request';

const validate = <T>(source: Source, schema: ZodSchema<T>) =>
  createMiddleware<AppEnv & { Variables: AppEnv['Variables'] & { validated: T } }>(async (c, next) => {
    let raw: unknown;
    if (source === 'body') {
      try {
        raw = await c.req.json();
      } catch {
        throw ApiError.badRequest('We expected a valid JSON body.');
      }
    } else if (source === 'query') {
      raw = c.req.query();
    } else {
      raw = c.req.param();
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errors[issue.path.join('.') || '_'] = issue.message;
      }
      throw ApiError.badRequest(friendly(source), errors);
    }
    c.set('validated', result.data);
    await next();
  });

export const validateBody = <T>(schema: ZodSchema<T>) => validate('body', schema);
export const validateQuery = <T>(schema: ZodSchema<T>) => validate('query', schema);
export const validateParams = <T>(schema: ZodSchema<T>) => validate('params', schema);

export const getValidated = <T>(c: { get: (key: 'validated') => unknown }): T =>
  c.get('validated') as T;
