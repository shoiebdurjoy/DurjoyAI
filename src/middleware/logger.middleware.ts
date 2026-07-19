import { Request, Response, NextFunction } from 'express';

/**
 * Custom request logging middleware.
 * Records IPs, request methods, response statuses, and durations.
 * Categorizes logs by severity (error, warn, log) depending on the HTTP status code.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    // Log format: [timestamp] IP - METHOD URL STATUS - DURATIONms
    const logLine = `[${new Date().toISOString()}] ${ip} - ${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error(logLine);
    } else if (statusCode >= 400) {
      // eslint-disable-next-line no-console
      console.warn(logLine);
    } else {
      // eslint-disable-next-line no-console
      console.log(logLine);
    }
  });

  next();
}
