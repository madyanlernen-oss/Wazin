import { Request, Response, NextFunction } from 'express';

// Graceful handler for oversized payloads and malformed JSON
export function jsonErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err) {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'حجم الطلب يتجاوز الحد الأقصى المسموح به (200 كيلوبايت).',
      });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        error: 'صيغة البيانات المرسلة غير صالحة (JSON غير صحيح).',
      });
    }
  }
  next(err);
}

// Global unhandled error handler
export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('[Server Error]:', err?.message || err);
  if (res.headersSent) {
    return;
  }
  return res.status(500).json({
    error: 'حدث خطأ داخلي في الخادم. يرجى المحاولة مرة أخرى.',
  });
}
