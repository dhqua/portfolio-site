import { join } from 'node:path';
import { App, Tags } from 'aws-cdk-lib';
import { loadConfig } from '../lib/config.ts';
import { GitHubOidcStack } from '../lib/github-oidc-stack.ts';
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
});

// Deployed once by hand with admin credentials; CI can't create its own role (D-016).
new GitHubOidcStack(app, 'GitHubOidcStack', {
  tags,
  env,
  githubRepository: config.GITHUB_REPOSITORY,
});
