import { join } from 'node:path';
import { App, Tags } from 'aws-cdk-lib';
import { loadConfig } from '../lib/config.ts';
import { GitHubOidcStack } from '../lib/github-oidc-stack.ts';
import { PrivateAreaStack } from '../lib/private-area-stack.ts';
import { SiteStack } from '../lib/site-stack.ts';

const config = loadConfig();
const app = new App();

const tags = { project: 'portfolio-site', env: config.ENV };
for (const [key, value] of Object.entries(tags)) Tags.of(app).add(key, value);
const env = { account: config.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' };

new SiteStack(app, 'SiteStack', {
  tags,
  env,
  siteContentPath: join(import.meta.dirname, '../../apps/web/out'),
  budgetAlertEmail: config.BUDGET_ALERT_EMAIL,
  domain:
    config.SITE_DOMAIN && config.HOSTED_ZONE_ID
      ? { name: config.SITE_DOMAIN, hostedZoneId: config.HOSTED_ZONE_ID }
      : undefined,
});

// Origins the site is served from. Sign-in only redirects back to these (localhost is for `pnpm dev`).
const siteOrigins = [
  ...(config.SITE_DOMAIN
    ? [`https://${config.SITE_DOMAIN}`, `https://www.${config.SITE_DOMAIN}`]
    : []),
  'http://localhost:3000',
];

new PrivateAreaStack(app, 'PrivateAreaStack', {
  tags,
  env,
  ownerEmail: config.OWNER_EMAIL,
  authDomainPrefix: config.AUTH_DOMAIN_PREFIX,
  siteOrigins,
});

// Deployed once by hand with admin credentials; CI can't create its own role (D-016).
new GitHubOidcStack(app, 'GitHubOidcStack', {
  tags,
  env,
  githubRepository: config.GITHUB_REPOSITORY,
  githubOwnerId: config.GITHUB_REPOSITORY_OWNER_ID,
  githubRepositoryId: config.GITHUB_REPOSITORY_ID,
});
