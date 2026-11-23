import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { PORT, NODE_ENV } from './server/config/env';
import { corsMiddleware } from './server/middleware/cors';
import { geminiRateLimiter } from './server/middleware/rateLimit';
import { jsonErrorHandler, globalErrorHandler } from './server/middleware/errorHandler';

import { advisorChatRouter } from './server/routes/advisorChat';
import { directorSummaryRouter } from './server/routes/directorSummary';
import { areaDeepdiveRouter } from './server/routes/areaDeepdive';
import { eisenhowerSuggestionsRouter } from './server/routes/eisenhowerSuggestions';
import { authRouter } from './server/routes/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Cloudflare, Render, etc.)
app.set('trust proxy', 1);

// Security & Parsing Middlewares
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(jsonErrorHandler);

// Mount Modular API Routes
app.use('/api/gemini', geminiRateLimiter);
app.use('/api/gemini', advisorChatRouter);
app.use('/api/gemini', directorSummaryRouter);
app.use('/api/gemini', areaDeepdiveRouter);
app.use('/api/gemini', eisenhowerSuggestionsRouter);
app.use('/api', authRouter);

// Global Error Handler
app.use(globalErrorHandler);

// Setup Vite middleware in dev or static file serving in production
async function startServer() {
  // Always serve public static assets directly (including /videos/ and /assets/)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (NODE_ENV === 'production' || fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req: Request, res: Response, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wazan server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
