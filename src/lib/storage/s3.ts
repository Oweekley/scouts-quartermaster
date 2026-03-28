import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getS3Client() {
  const endpoint = requiredEnv("S3_ENDPOINT");
  const region = requiredEnv("S3_REGION");
  const accessKeyId = requiredEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("S3_SECRET_ACCESS_KEY");

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getS3Bucket() {
  return requiredEnv("S3_BUCKET");
}

export async function createPresignedPutUrl(opts: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const client = getS3Client();
  const Bucket = getS3Bucket();

  const command = new PutObjectCommand({
    Bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: opts.expiresInSeconds ?? 60,
  });

  return url;
}

export async function createPresignedGetUrl(opts: { key: string; expiresInSeconds?: number }) {
  const client = getS3Client();
  const Bucket = getS3Bucket();

  const command = new GetObjectCommand({ Bucket, Key: opts.key });
  const url = await getSignedUrl(client, command, {
    expiresIn: opts.expiresInSeconds ?? 60,
  });
  return url;
}

