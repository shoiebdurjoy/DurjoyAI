import { Router, Request, Response } from 'express';

const router = Router();

const healthCheckHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Durjoy AI backend is running',
  });
};

// Support both /health and /api/health endpoints
router.get('/health', healthCheckHandler);
router.get('/api/health', healthCheckHandler);

export default router;
