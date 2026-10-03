import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App, Tags } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { BUDGET_LIMITS_USD, SiteStack } from '../lib/site-stack.ts';

interface CfnResource {
  Type: string;
  Properties?: Record<string, unknown>;
}

interface PolicyStatement {
  Effect: string;
  Action: string | string[];
  Principal: unknown;
  Condition?: unknown;
}

const tags = { project: 'portfolio-site', env: 'test' };

// Resource types that don't accept tags in CloudFormation.
const untaggableTypes = new Set([
  'AWS::S3::BucketPolicy',
  'AWS::CloudFront::OriginAccessControl',
  'AWS::Lambda::LayerVersion',
  'AWS::IAM::Policy',
  'Custom::CDKBucketDeployment',
  'AWS::CDK::Metadata',
]);

let template: Template;

beforeAll(() => {
  // A stand-in for apps/web/out so the test doesn't depend on a web build.
  const siteContentPath = mkdtempSync(join(tmpdir(), 'site-'));
  writeFileSync(join(siteContentPath, 'index.html'), 'Hello');

  const app = new App();
  for (const [key, value] of Object.entries(tags)) Tags.of(app).add(key, value);
  const stack = new SiteStack(app, 'SiteStack', {
    tags,
    siteContentPath,
    budgetAlertEmail: 'alerts@example.com',
  });
  template = Template.fromStack(stack);
});

describe('SiteStack', () => {
  it('blocks all public access to the bucket and encrypts it', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
        ],
      },
    });
    template.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Retain' });
  });

  it('allows reads only from this CloudFront distribution', () => {
    const policies = Object.values(template.findResources('AWS::S3::BucketPolicy'));
    expect(policies).toHaveLength(1);
    const statements = (
      policies[0] as { Properties: { PolicyDocument: { Statement: PolicyStatement[] } } }
    ).Properties.PolicyDocument.Statement;
    const allows = statements.filter((s) => s.Effect === 'Allow');

    expect(allows).toHaveLength(1);
    expect(allows[0]).toMatchObject({
      Action: 's3:GetObject',
      Principal: { Service: 'cloudfront.amazonaws.com' },
    });
    const sourceArn = JSON.stringify(allows[0]?.Condition);
    expect(sourceArn).toContain('AWS:SourceArn');
    const [distributionId] = Object.keys(template.findResources('AWS::CloudFront::Distribution'));
    expect(sourceArn).toContain(`{"Ref":"${String(distributionId)}"}`);
  });

  it('uses an origin access control and redirects to HTTPS', () => {
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https' }),
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({ ErrorCode: 404, ResponsePagePath: '/404.html' }),
        ]),
      }),
    });
  });

  it('sets 14-day retention on every log group', () => {
    const logGroups = Object.values(template.findResources('AWS::Logs::LogGroup'));
    expect(logGroups.length).toBeGreaterThan(0);
    for (const logGroup of logGroups) {
      expect(logGroup).toMatchObject({ Properties: { RetentionInDays: 14 } });
    }
    // A Lambda without an explicit log group gets an implicit one with no retention.
    template.hasResourceProperties('AWS::Lambda::Function', {
      LoggingConfig: { LogGroup: Match.anyValue() },
    });
  });

  it('creates monthly cost budgets at $10 and $25 that email alerts', () => {
    expect(BUDGET_LIMITS_USD).toEqual([10, 25]);
    template.resourceCountIs('AWS::Budgets::Budget', BUDGET_LIMITS_USD.length);
    for (const amount of BUDGET_LIMITS_USD) {
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: Match.objectLike({
          BudgetType: 'COST',
          TimeUnit: 'MONTHLY',
          BudgetLimit: { Amount: amount, Unit: 'USD' },
        }),
        NotificationsWithSubscribers: [
          Match.objectLike({
            Notification: Match.objectLike({ NotificationType: 'ACTUAL', Threshold: 80 }),
            Subscribers: [{ SubscriptionType: 'EMAIL', Address: 'alerts@example.com' }],
          }),
          Match.objectLike({
            Notification: Match.objectLike({ NotificationType: 'FORECASTED', Threshold: 100 }),
          }),
        ],
      });
    }
  });

  it('tags every taggable resource with project and env', () => {
    const resources = Object.entries(template.toJSON().Resources as Record<string, CfnResource>);
    for (const [id, resource] of resources) {
      if (untaggableTypes.has(resource.Type)) continue;
      const props = resource.Properties ?? {};
      expect(props.Tags ?? props.ResourceTags, id).toEqual(
        expect.arrayContaining([
          { Key: 'project', Value: tags.project },
          { Key: 'env', Value: tags.env },
        ]),
      );
    }
  });

  it('outputs the distribution URL', () => {
    template.hasOutput('DistributionUrl', {});
  });
});
