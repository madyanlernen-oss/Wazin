import { Router, Request, Response } from 'express';
import { logErrorRateLimiter } from '../middleware/rateLimit';

export const authRouter = Router();

// Endpoint: Client-Side Error Logging (Security Sandboxed)
authRouter.post('/log-error', logErrorRateLimiter, (req: Request, res: Response) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(204).end();
  }

  const knownFields = ['message', 'stack', 'componentStack', 'url', 'time'] as const;
  const sanitized: Record<string, string> = {};

  for (const field of knownFields) {
    const val = req.body[field];
    if (typeof val === 'string') {
      sanitized[field] = val.slice(0, 2000);
    }
  }

  if (sanitized.message) {
    console.error('[Client-Side Error]', JSON.stringify(sanitized));
  }

  return res.status(204).end();
});

// Health check endpoint
authRouter.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
