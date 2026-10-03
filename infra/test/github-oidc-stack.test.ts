import { App, Tags } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitHubOidcStack } from '../lib/github-oidc-stack.ts';

interface PolicyStatement {
  Effect: string;
  Action: string | string[];
  Resource: unknown;
}

const tags = { project: 'portfolio-site', env: 'test' };
const account = '123456789012';

let template: Template;

beforeAll(() => {
  const app = new App();
  for (const [key, value] of Object.entries(tags)) Tags.of(app).add(key, value);
  const stack = new GitHubOidcStack(app, 'GitHubOidcStack', {
    tags,
    env: { account, region: 'us-east-1' },
    githubRepository: 'dhqua/portfolio-site',
  });
  template = Template.fromStack(stack);
});

describe('GitHubOidcStack', () => {
  it('creates the GitHub OIDC provider natively, without a custom resource', () => {
    template.resourceCountIs('AWS::IAM::OIDCProvider', 1);
    template.hasResourceProperties('AWS::IAM::OIDCProvider', {
      Url: 'https://token.actions.githubusercontent.com',
      ClientIdList: ['sts.amazonaws.com'],
    });
    template.resourceCountIs('AWS::Lambda::Function', 0);
  });

  it('trusts only GitHub tokens for main on this repo', () => {
    const [providerId] = Object.keys(template.findResources('AWS::IAM::OIDCProvider'));
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'portfolio-site-deploy',
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Action: 'sts:AssumeRoleWithWebIdentity',
            // An OIDCProvider's Ref is its ARN.
            Principal: { Federated: { Ref: providerId } },
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub':
                  'repo:dhqua/portfolio-site:ref:refs/heads/main',
              },
            },
          },
        ],
      },
    });
  });

  it('can only assume the CDK bootstrap roles', () => {
    const policies = Object.values(template.findResources('AWS::IAM::Policy'));
    expect(policies).toHaveLength(1);
    const statements = (
      policies[0] as { Properties: { PolicyDocument: { Statement: PolicyStatement[] } } }
    ).Properties.PolicyDocument.Statement;

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatchObject({ Effect: 'Allow', Action: 'sts:AssumeRole' });
    // The ARN is a Fn::Join over the partition, so check the part that sets the scope.
    expect(JSON.stringify(statements[0]?.Resource)).toContain(
      `:iam::${account}:role/cdk-hnb659fds-*-${account}-us-east-1"`,
    );
    template.hasResourceProperties('AWS::IAM::Role', {
      ManagedPolicyArns: Match.absent(),
    });
  });

  it('tags the provider and role with project and env', () => {
    for (const type of ['AWS::IAM::OIDCProvider', 'AWS::IAM::Role']) {
      template.hasResourceProperties(type, {
        Tags: Match.arrayWith([
          { Key: 'env', Value: tags.env },
          { Key: 'project', Value: tags.project },
        ]),
      });
    }
  });

  it('outputs the deploy role ARN', () => {
    template.hasOutput('DeployRoleArn', {});
  });
});
