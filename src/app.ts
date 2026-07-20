import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import healthRoutes from './routes/health.routes';
import alexaRoutes from './routes/alexa.routes';
import debugRoutes from './routes/debug.routes';
import { requestLogger } from './middleware/logger.middleware';

const app: Application = express();

/**
 * NOTE: helmet() is intentionally NOT used here.
 *
 * The /alexa endpoint receives requests from Amazon's Alexa Skills Kit service,
 * which is a server-to-server HTTP client — not a browser. Helmet injects browser
 * security headers including:
 *   - cross-origin-resource-policy: same-origin  ← blocks Alexa from reading the response
 *   - content-security-policy                    ← irrelevant for JSON APIs
 *   - x-frame-options, x-xss-protection, etc.   ← browser-only, ignored but add noise
 *
 * The `cross-origin-resource-policy: same-origin` header in particular causes the
 * Alexa service to reject our response body, resulting in Alexa saying "announcing"
 * instead of the actual speech text. Do not add helmet() back without disabling
 * crossOriginResourcePolicy first.
 */

const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*';

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  }),
);

app.use(requestLogger);

app.use(
  express.json({
    verify: (req: http.IncomingMessage & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    verify: (req: http.IncomingMessage & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Routes
app.use(healthRoutes);
app.use(alexaRoutes);
app.use(debugRoutes);

// Catch-all route for unmatched paths (404)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled Exception:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

export default app;
