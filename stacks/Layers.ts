import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import type { StackContext } from 'sst/constructs';

export function Layers({ stack, app }: StackContext) {
  const argonLayer = LayerVersion.fromLayerVersionArn(
    stack,
    'Argon2Layer',
    `arn:aws:lambda:${stack.region}:008193302444:layer:argon2-layer:1`
  );

  const sentryLayer = LayerVersion.fromLayerVersionArn(
    stack,
    'SentryLayer',
    `arn:aws:lambda:${stack.region}:943013980633:layer:SentryNodeServerlessSDK:195`
  );

  app.addDefaultFunctionLayers([sentryLayer]);
  app.addDefaultFunctionEnv({
    SENTRY_DSN: process.env.SENTRY_DSN!,
    SENTRY_TRACES_SAMPLE_RATE: stack.stage === 'prod' ? '1.0' : '0.0',
    NODE_OPTIONS: '-r @sentry/serverless/dist/awslambda-auto'
  });

  app.setDefaultFunctionProps({
    nodejs: {
      esbuild: {
        external: ['@sentry/serverless', 'argon2']
      }
    }
  });

  return {
    argonLayer,
    sentryLayer
  };
}
