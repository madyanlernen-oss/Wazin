import rateLimit from 'express-rate-limit';

// Rate limiting for /api/gemini/* (20 requests per minute per IP)
export const geminiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: 'تجاوزت الحد المسموح به من الطلبات (20 طلباً في الدقيقة). يرجى الانتظار قليلاً ثم إعادة المحاولة.',
  },
});

// Rate limiting for /api/log-error (10 requests per minute per IP)
export const logErrorRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: 'Too many error logging requests, please try again later.',
  },
});
