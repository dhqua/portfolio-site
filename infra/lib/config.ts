import { parseEnv } from '@portfolio/shared';
import { z } from 'zod';

const configSchema = z.object({
  ENV: z.enum(['dev', 'prod']).default('prod'),
  BUDGET_ALERT_EMAIL: z.email(),
  // GitHub Actions sets this itself; the default covers local synth and the bootstrap deploy.
  GITHUB_REPOSITORY: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/)
    .default('dhqua/portfolio-site'),
  // Numeric IDs in GitHub's immutable OIDC subject (D-016). GitHub Actions sets both.
  GITHUB_REPOSITORY_OWNER_ID: z.string().regex(/^\d+$/).default('14855311'),
  GITHUB_REPOSITORY_ID: z.string().regex(/^\d+$/).default('1386678984'),
  // Set by the CDK CLI from the active credentials. Unset means an environment-agnostic synth.
  CDK_DEFAULT_ACCOUNT: z
    .string()
    .regex(/^\d{12}$/)
    .optional(),
});

export type InfraConfig = z.output<typeof configSchema>;

export const loadConfig = (env?: Record<string, string | undefined>): InfraConfig =>
  parseEnv(configSchema, env);
