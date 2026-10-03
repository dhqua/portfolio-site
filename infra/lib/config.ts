import { parseEnv } from '@portfolio/shared';
import { z } from 'zod';

const configSchema = z.object({
  ENV: z.enum(['dev', 'prod']).default('prod'),
  BUDGET_ALERT_EMAIL: z.email(),
  // Set by the CDK CLI from the active credentials. Unset means an environment-agnostic synth.
  CDK_DEFAULT_ACCOUNT: z
    .string()
    .regex(/^\d{12}$/)
    .optional(),
});

export type InfraConfig = z.output<typeof configSchema>;

export const loadConfig = (env?: Record<string, string | undefined>): InfraConfig =>
  parseEnv(configSchema, env);
