import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import {
  OidcProviderNative,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';

export interface GitHubOidcStackProps extends StackProps {
  /** `owner/name` of the only repository allowed to assume the deploy role. */
  readonly githubRepository: string;
}

const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com';
/** The default `cdk bootstrap` qualifier. */
const CDK_BOOTSTRAP_QUALIFIER = 'hnb659fds';

/** Lets GitHub Actions on `main` deploy through the CDK bootstrap roles (D-016). */
export class GitHubOidcStack extends Stack {
  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // Native AWS::IAM::OIDCProvider, so no custom-resource Lambda. Without thumbprints,
    // IAM verifies GitHub's certificate chain itself.
    const provider = new OidcProviderNative(this, 'GitHubOidcProvider', {
      url: `https://${GITHUB_OIDC_HOST}`,
      clientIds: ['sts.amazonaws.com'],
    });

    const role = new Role(this, 'DeployRole', {
      roleName: 'portfolio-site-deploy',
      description: `GitHub Actions deploys from ${props.githubRepository} main`,
      assumedBy: new WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${GITHUB_OIDC_HOST}:aud`]: 'sts.amazonaws.com',
          [`${GITHUB_OIDC_HOST}:sub`]: `repo:${props.githubRepository}:ref:refs/heads/main`,
        },
      }),
    });

    role.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        // Wildcard covers only the CDK bootstrap roles in this account and region
        // (deploy, file-publishing, image-publishing, lookup). They hold the actual deploy permissions.
        resources: [
          this.formatArn({
            service: 'iam',
            region: '',
            resource: 'role',
            resourceName: `cdk-${CDK_BOOTSTRAP_QUALIFIER}-*-${this.account}-${this.region}`,
          }),
        ],
      }),
    );

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }
}
