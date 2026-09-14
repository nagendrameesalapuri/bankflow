import type { Request } from 'express';

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? '127.0.0.1';
}

export function getRequestMeta(req: Request) {
  return {
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };
}
