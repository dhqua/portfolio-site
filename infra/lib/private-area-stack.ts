import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import {
  AccountRecovery,
  CfnManagedLoginBranding,
  CfnUserPoolUser,
  FeaturePlan,
  ManagedLoginVersion,
  Mfa,
  OAuthScope,
  UserPool,
  UserPoolClientIdentityProvider,
} from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';

export interface PrivateAreaStackProps extends StackProps {
  /** The only user. Receives the temporary password by email. */
  readonly ownerEmail: string;
  /** Prefix of the managed login domain, unique per region. */
  readonly authDomainPrefix: string;
  /** Origins that serve the site, such as `https://example.com`. Sign-in redirects back to these. */
  readonly siteOrigins: readonly string[];
}

/** Where managed login sends the browser after sign-in, and after sign-out. */
export const CALLBACK_PATH = '/auth/callback/';
export const LOGOUT_PATH = '/private/';

/** Sign-in for the private area (D-022): one admin-created user, password plus TOTP. */
export class PrivateAreaStack extends Stack {
  readonly userPool: UserPool;

  constructor(scope: Construct, id: string, props: PrivateAreaStackProps) {
    super(scope, id, props);

    this.userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: { email: { required: true, mutable: false } },
      // Managed login (v2) needs the Essentials plan. One user stays inside the free MAU tier.
      featurePlan: FeaturePlan.ESSENTIALS,
      // Authenticator app only: SMS would bill per message and email codes would need SES.
      mfa: Mfa.REQUIRED,
      mfaSecondFactor: { sms: false, otp: true, email: false },
      passwordPolicy: {
        minLength: 14,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      // It holds the owner's credentials and MFA enrollment, so a stack delete must not remove it.
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const client = this.userPool.addClient('WebClient', {
      // A public client: the browser can't keep a secret, so PKCE protects the code exchange.
      generateSecret: false,
      authFlows: {},
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL],
        callbackUrls: props.siteOrigins.map((origin) => `${origin}${CALLBACK_PATH}`),
        logoutUrls: props.siteOrigins.map((origin) => `${origin}${LOGOUT_PATH}`),
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
    });

    const domain = this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: props.authDomainPrefix },
      managedLoginVersion: ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });

    // Managed login renders nothing until a client has branding; Cognito's defaults are enough.
    const branding = new CfnManagedLoginBranding(this, 'Branding', {
      userPoolId: this.userPool.userPoolId,
      clientId: client.userPoolClientId,
      useCognitoProvidedValues: true,
    });
    branding.node.addDependency(domain);

    // The user lives in IaC. Cognito emails the temporary password, and managed login forces a new
    // password and TOTP enrollment on the first sign-in.
    new CfnUserPoolUser(this, 'Owner', {
      userPoolId: this.userPool.userPoolId,
      username: props.ownerEmail,
      desiredDeliveryMediums: ['EMAIL'],
      userAttributes: [
        { name: 'email', value: props.ownerEmail },
        { name: 'email_verified', value: 'true' },
      ],
    });

    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: client.userPoolClientId });
    new CfnOutput(this, 'AuthDomain', { value: domain.baseUrl() });
  }
}
