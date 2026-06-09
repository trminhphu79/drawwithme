import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 (S3-compatible) object storage. Reads config from env; if not
 * fully configured it falls back to returning the original data URL, so the app
 * keeps working in dev / before credentials are provided.
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET,
 *      R2_PUBLIC_BASE_URL (public bucket / custom domain base).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client?: S3Client;
  private readonly bucket = StorageService.normalizeBucket(process.env.R2_BUCKET);
  private readonly publicBase = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');
  readonly configured: boolean;

  /**
   * Accept a bucket NAME, but tolerate a full S3 URL being pasted in (a common
   * mistake): strip scheme/host and trailing slashes, keep the last path
   * segment. `https://<acct>.r2.cloudflarestorage.com/drawwithme` → `drawwithme`.
   */
  private static normalizeBucket(raw: string | undefined): string | undefined {
    const value = (raw ?? '').trim().replace(/\/+$/, '');
    if (!value) return undefined;
    if (value.includes('://') || value.includes('/')) {
      return value.split('/').filter(Boolean).pop();
    }
    return value;
  }

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    if (process.env.R2_BUCKET && this.bucket !== process.env.R2_BUCKET) {
      this.logger.warn(
        `R2_BUCKET looked like a URL ("${process.env.R2_BUCKET}") — using bucket name "${this.bucket}".`,
      );
    }
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.configured = !!(accountId && accessKeyId && secretAccessKey && this.bucket && this.publicBase);
    if (this.configured) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      });
      this.logger.log(`R2 storage enabled (bucket: ${this.bucket})`);
    } else {
      this.logger.warn('R2 not configured — storing media as data URLs (fallback).');
    }
  }

  /**
   * Store a data URL and return a public URL. If R2 isn't configured (or the
   * input isn't a data URL), returns the input unchanged.
   */
  async putDataUrl(key: string, dataUrl: string): Promise<string> {
    if (!this.configured || !dataUrl?.startsWith('data:')) return dataUrl;
    const match = /^data:(.+?);base64,(.*)$/s.exec(dataUrl);
    if (!match) return dataUrl;
    try {
      return await this.putBuffer(key, Buffer.from(match[2], 'base64'), match[1]);
    } catch (err) {
      this.logger.error(`R2 upload failed for ${key}: ${(err as Error).message}`);
      return dataUrl; // fall back to the data URL so nothing breaks
    }
  }

  private async putBuffer(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client!.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return `${this.publicBase}/${key}`;
  }
}
