import type { Role } from '../generated/prisma/client.js';

export type AuthUser = { id: string; role: Role };

export type AppEnv = {
  Variables: {
    user?: AuthUser;
    requestId: string;
    validated?: unknown;
  };
};
