#!/usr/bin/env -S node --env-file-if-exists=./.env

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdan from "aws-cdk-lib/aws-lambda-nodejs";

const account = process.env["AWS_ACCOUNT"];
const openAiKey = process.env["OPENAI_API_KEY"];
if (typeof openAiKey === "undefined") {
  throw new Error("OPENAI_API_KEY: undefined");
}
const slackSignSecret = process.env["SLACK_SIGN_SECRET"];
if (typeof slackSignSecret === "undefined") {
  throw new Error("SLACK_SIGN_SECRET: undefined");
}

const app = new cdk.App();
const stack = new cdk.Stack(app, "SuzukiDice", {
  env: {
    account,
    region: "ap-northeast-1",
  },
  tags: {
    Owner: "ysuzuki",
  },
});

const fn = new lambdan.NodejsFunction(stack, "Function", {
  entry: new URL("./handler.ts", import.meta.url).pathname,
  runtime: lambda.Runtime.NODEJS_24_X,
  handler: "index.handler",
  memorySize: 128,
  timeout: cdk.Duration.seconds(10),
  bundling: {
    define: {
      "process.env.OPENAI_API_KEY": JSON.stringify(openAiKey),
      "process.env.SLACK_SIGN_SECRET": JSON.stringify(slackSignSecret),
    },
  },
});
const url = new lambda.FunctionUrl(stack, "FunctionUrl", {
  function: fn,
  authType: lambda.FunctionUrlAuthType.NONE,
});
new cdk.CfnOutput(stack, "Href", {
  value: url.url,
});
