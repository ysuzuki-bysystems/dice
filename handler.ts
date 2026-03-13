#!/usr/bin/env node

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import OpenAI from "openai";
import * as crypto from "node:crypto";


async function getApiKey(): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (typeof key === "undefined") {
    throw new Error("OPENAI_API_KEY: undefined");
  }
  return Promise.resolve(key);
}

const client = new OpenAI({ apiKey: getApiKey });

function verifyRequest(event: APIGatewayProxyEventV2) {
  const secret = process.env.SLACK_SIGN_SECRET;
  if (typeof secret === "undefined") {
    throw new Error("SLACK_SIGN_SECRET: undefined");
  }

  const timestamp = event.headers["x-slack-request-timestamp"];
  if (typeof timestamp === "undefined") {
    throw new Error("x-slack-request-timestamp: undefined");
  }
  const body = event.isBase64Encoded ? Buffer.from(event.body ?? "", "base64").toString() : event.body ?? "";
  console.log(body);
  const base = `v0:${timestamp}:${body}`;

  // guard replay attack.
  const now = Date.now() / 1000 | 0;
  if (Math.abs(now - Number.parseInt(timestamp, 10)) > 60 * 5) {
    throw new Error(`Too old: ${timestamp}`);
  }

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(base)
    .digest("hex");

  const actual = `v0=${hmac}`;
  const expected = event.headers["x-slack-signature"];
  if (typeof expected === "undefined") {
    throw new Error("x-slack-signature: undefined");
  }

  const abuf = Buffer.from(actual, "utf8");
  const ebuf = Buffer.from(expected, "utf8");
  if (abuf.length !== ebuf.length) {
    throw new Error(`${abuf.length} != ${ebuf.length}`);
  }

  if (!crypto.timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"))) {
    throw new Error("Mismatch");
  }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  console.log(event);

  verifyRequest(event);

  const response = await client.responses.create({
    model: "gpt-4.1-nano",
    input: [
      {
        role: "system",
        content: "あなたは雑談のお題を作るアシスタントです。日常・体験・価値観など幅広いテーマを作ります。",
      },
      {
        role: "user",
        content: "雑談のお題を短い一文で1つ出してください。ありきたりな映画やドラマの話題は避けてください。",
      },
    ],
    temperature: 1.3,
  });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      response_type: "in_channel",
      text: response.output_text,
    }),
  }
}
