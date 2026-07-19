import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import healthRoutes from './routes/health.routes';
import alexaRoutes from './routes/alexa.routes';

const app: Application = express();

// Global Middleware
app.use(helmet());
app.use(cors());
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
