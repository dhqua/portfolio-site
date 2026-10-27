import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import {
  Distribution,
  Function as CfFunction,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { AaaaRecord, ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

export interface SiteStackProps extends StackProps {
  /** Directory holding the static export (apps/web/out). */
  readonly siteContentPath: string;
  readonly budgetAlertEmail: string;
  /** Custom domain served alongside www (Slice 0.5). Omit to use only the CloudFront URL. */
  readonly domain?: SiteDomain;
}

export interface SiteDomain {
  /** Apex name, for example `example.com`. */
  readonly name: string;
  /** ID of the existing public hosted zone for `name` (D-019). */
  readonly hostedZoneId: string;
}

/** Monthly cost budgets in USD (D-008). */
export const BUDGET_LIMITS_USD = [10, 25] as const;

// Maps clean URLs to the objects Next's static export writes with trailingSlash: true.
// `/about/` and `/about` both become `/about/index.html`; paths with a file extension pass through.
const rewriteIndexCode = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.split('/').pop().includes('.')) {
    request.uri = uri + '/index.html';
  }
  return request;
}`;

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    // RETAIN instead of autoDeleteObjects, which would add a custom-resource Lambda (D-017).
    const bucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const rewriteIndex = new CfFunction(this, 'RewriteIndex', {
      code: FunctionCode.fromInline(rewriteIndexCode),
      runtime: FunctionRuntime.JS_2_0,
    });

    const domain = props.domain && this.siteDomain(props.domain);

    const distribution = new Distribution(this, 'SiteDistribution', {
      ...(domain && {
        domainNames: domain.names,
        certificate: domain.certificate,
        minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      }),
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          { function: rewriteIndex, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      // Without s3:ListBucket, S3 answers a missing key with 403, so map both to the 404 page.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 404,
        responsePagePath: '/404.html',
        ttl: Duration.minutes(5),
      })),
    });

    new BucketDeployment(this, 'DeploySite', {
      sources: [Source.asset(props.siteContentPath)],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
      logGroup: new LogGroup(this, 'DeploySiteLogs', {
        retention: RetentionDays.TWO_WEEKS,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });

    for (const limit of BUDGET_LIMITS_USD) {
      new CfnBudget(this, `MonthlyBudget${String(limit)}`, {
        // CfnBudget isn't taggable by Tags.of(), so copy the stack tags in explicitly.
        resourceTags: Object.entries(this.tags.tagValues()).map(([key, value]) => ({ key, value })),
        budget: {
          budgetName: `${this.stackName}-monthly-${String(limit)}usd`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: { amount: limit, unit: 'USD' },
        },
        notificationsWithSubscribers: [
          { notificationType: 'ACTUAL', threshold: 80 },
          { notificationType: 'FORECASTED', threshold: 100 },
        ].map((notification) => ({
          notification: {
            ...notification,
            comparisonOperator: 'GREATER_THAN',
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: props.budgetAlertEmail }],
        })),
      });
    }

    new CfnOutput(this, 'DistributionUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });

    if (domain) {
      const target = RecordTarget.fromAlias(new CloudFrontTarget(distribution));
      domain.names.forEach((recordName, i) => {
        new ARecord(this, `AliasA${String(i)}`, { zone: domain.zone, recordName, target });
        new AaaaRecord(this, `AliasAaaa${String(i)}`, { zone: domain.zone, recordName, target });
      });
      new CfnOutput(this, 'SiteUrl', { value: `https://${domain.name}` });
    }
  }

  /** Looks up nothing: the zone comes by ID so synth needs no AWS credentials (D-019). */
  private siteDomain({ name, hostedZoneId }: SiteDomain) {
    const zone = HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId,
      zoneName: name,
    });
    const names = [name, `www.${name}`];
    // The stack is in us-east-1, where CloudFront requires its certificate to live.
    const certificate = new Certificate(this, 'SiteCertificate', {
      domainName: name,
      subjectAlternativeNames: names.slice(1),
      validation: CertificateValidation.fromDns(zone),
    });
    return { name, zone, names, certificate };
  }
}
