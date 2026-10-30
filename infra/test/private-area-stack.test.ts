import { App, Tags } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { PrivateAreaStack } from '../lib/private-area-stack.ts';

interface CfnResource {
  Type: string;
  Properties?: Record<string, unknown>;
}

const tags = { project: 'portfolio-site', env: 'test' };
const siteOrigins = ['https://example.com', 'https://www.example.com', 'http://localhost:3000'];

// Resource types that don't accept tags in CloudFormation.
const untaggableTypes = new Set([
  'AWS::Cognito::UserPoolClient',
  'AWS::Cognito::UserPoolDomain',
  'AWS::Cognito::ManagedLoginBranding',
  'AWS::Cognito::UserPoolUser',
  'AWS::CDK::Metadata',
]);

let template: Template;

beforeAll(() => {
  const app = new App();
  for (const [key, value] of Object.entries(tags)) Tags.of(app).add(key, value);
  const stack = new PrivateAreaStack(app, 'PrivateAreaStack', {
    tags,
    ownerEmail: 'owner@example.com',
    authDomainPrefix: 'example-auth',
    siteOrigins,
  });
  template = Template.fromStack(stack);
});

describe('PrivateAreaStack', () => {
  it('lets only an admin create users', () => {
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AdminCreateUserConfig: Match.objectLike({ AllowAdminCreateUserOnly: true }),
    });
  });

  it('requires an authenticator-app second factor and no SMS', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      MfaConfiguration: 'ON',
      EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
    });
    const [pool] = Object.values(template.findResources('AWS::Cognito::UserPool'));
    expect(JSON.stringify(pool)).not.toContain('SmsConfiguration');
  });

  it('keeps the pool on a delete or replace of the stack', () => {
    template.hasResource('AWS::Cognito::UserPool', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Properties: Match.objectLike({ DeletionProtection: 'ACTIVE' }),
    });
  });

  it('uses the plan managed login needs', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolTier: 'ESSENTIALS',
    });
  });

  it('has a secretless client limited to the authorization code flow', () => {
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      GenerateSecret: false,
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthFlows: ['code'],
      AllowedOAuthScopes: ['openid', 'email'],
      SupportedIdentityProviders: ['COGNITO'],
      PreventUserExistenceErrors: 'ENABLED',
      EnableTokenRevocation: true,
    });
  });

  it('allows sign-in redirects only to the site origins', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      CallbackURLs: [
        'https://example.com/auth/callback/',
        'https://www.example.com/auth/callback/',
        'http://localhost:3000/auth/callback/',
      ],
      LogoutURLs: [
        'https://example.com/private/',
        'https://www.example.com/private/',
        'http://localhost:3000/private/',
      ],
    });
  });

  it('serves managed login on a Cognito domain with default branding', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
      Domain: 'example-auth',
      ManagedLoginVersion: 2,
    });
    template.hasResourceProperties('AWS::Cognito::ManagedLoginBranding', {
      UseCognitoProvidedValues: true,
    });
  });

  it('creates the owner as the only user, with a verified email', () => {
    template.resourceCountIs('AWS::Cognito::UserPoolUser', 1);
    template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
      Username: 'owner@example.com',
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: 'owner@example.com' },
        { Name: 'email_verified', Value: 'true' },
      ],
    });
  });

  it('tags the user pool with project and env', () => {
    // Cognito takes tags as a map, and its client, domain, branding and user take none.
    template.hasResourceProperties('AWS::Cognito::UserPool', { UserPoolTags: tags });
    const resources = Object.entries(template.toJSON().Resources as Record<string, CfnResource>);
    for (const [id, resource] of resources) {
      if (untaggableTypes.has(resource.Type)) continue;
      expect(resource.Type, id).toBe('AWS::Cognito::UserPool');
    }
  });

  it('outputs what the web app needs to sign in', () => {
    template.hasOutput('UserPoolId', {});
    template.hasOutput('UserPoolClientId', {});
    template.hasOutput('AuthDomain', {});
  });
});
