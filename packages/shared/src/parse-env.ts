import type { z } from 'zod';

/**
 * Validates environment variables against a zod schema at startup.
 * The error lists the failing keys and reasons but never the values, which may be secrets.
 */
export const parseEnv = <T extends z.ZodType>(
  schema: T,
  env: Record<string, string | undefined> = process.env,
): z.output<T> => {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  return result.data;
};
