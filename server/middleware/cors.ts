import { Request, Response, NextFunction } from 'express';
import { ALLOWED_ORIGINS } from '../config/env';

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestOrigin = req.headers.origin ? req.headers.origin.replace(/\/+$/, '') : undefined;

  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  } else if (!requestOrigin) {
    // Non-browser or same-origin direct request
    res.header('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    if (requestOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
      return res.status(403).json({ error: 'النطاق المصدر غير مصرح به (Origin Not Allowed)' });
    }
    return res.sendStatus(200);
  }
  next();
}
