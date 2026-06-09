import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface AdminTokenPayload {
  sub: string; // user id
  username: string;
  exp: number; // epoch ms
}

/**
 * Minimal stateless bearer token (HMAC-signed) for the admin panel — avoids a
 * JWT dependency. Format: base64url(payload).base64url(hmacSHA256(payload)).
 */
@Injectable()
export class AdminTokenService {
  private readonly secret =
    process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || 'dwm-admin-dev-secret';
  private readonly ttlMs = 8 * 60 * 60 * 1000; // 8h

  sign(user: { id: string; username: string }): string {
    const payload: AdminTokenPayload = {
      sub: user.id,
      username: user.username,
      exp: Date.now() + this.ttlMs,
    };
    const body = this.b64url(JSON.stringify(payload));
    return `${body}.${this.b64url(this.hmac(body))}`;
  }

  verify(token: string | undefined): AdminTokenPayload | null {
    if (!token) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = this.b64url(this.hmac(body));
    if (!this.safeEqual(sig, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminTokenPayload;
      if (!payload.exp || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  private hmac(data: string): Buffer {
    return createHmac('sha256', this.secret).update(data).digest();
  }
  private b64url(input: string | Buffer): string {
    return Buffer.from(input).toString('base64url');
  }
  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  }
}
