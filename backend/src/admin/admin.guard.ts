import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AdminTokenService } from './admin-token.service';

/** Protects admin routes: requires a valid `Authorization: Bearer <token>`. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly tokens: AdminTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = this.tokens.verify(token);
    if (!payload) throw new UnauthorizedException('Admin authentication required');
    (req as Request & { admin?: unknown }).admin = payload;
    return true;
  }
}
