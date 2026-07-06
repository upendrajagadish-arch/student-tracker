/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO).
 *
 * Set S3_ENDPOINT for non-AWS providers (R2, MinIO). Path-style URLs are
 * used automatically when an endpoint is configured.
 *
 * See docs/PRODUCTION_DEPLOYMENT_TRIAL.md for setup examples.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ServerEnv } from "@/lib/env";
import type { StorageProvider } from "./types";
import { assertSafeRelativePath } from "./types";

function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new Error("Empty object body from S3");
  }

  if (Buffer.isBuffer(body)) {
    return Promise.resolve(body);
  }

  if (body instanceof Uint8Array) {
    return Promise.resolve(Buffer.from(body));
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof (body as { transformToByteArray: () => Promise<Uint8Array> })
      .transformToByteArray === "function"
  ) {
    return (body as { transformToByteArray: () => Promise<Uint8Array> })
      .transformToByteArray()
      .then((bytes) => Buffer.from(bytes));
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = body as NodeJS.ReadableStream;
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;

  constructor(env: ServerEnv) {
    if (!env.S3_BUCKET || !env.S3_REGION) {
      throw new Error("S3 storage requires S3_BUCKET and S3_REGION");
    }

    this.bucket = env.S3_BUCKET;
    this.keyPrefix = env.S3_KEY_PREFIX.replace(/\/+$/, "");

    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  private objectKey(relativePath: string): string {
    const safe = assertSafeRelativePath(relativePath);
    return this.keyPrefix ? `${this.keyPrefix}/${safe}` : safe;
  }

  async save(relativePath: string, data: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(relativePath),
        Body: data,
      })
    );
  }

  async read(relativePath: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(relativePath),
      })
    );

    return streamToBuffer(response.Body);
  }

  async remove(relativePath: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(relativePath),
        })
      );
    } catch {
      // object may already be removed
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.objectKey(relativePath),
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
