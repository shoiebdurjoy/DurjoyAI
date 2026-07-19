import { Router } from 'express';
import { alexaController } from '../controllers/alexa.controller';
import { alexaVerificationMiddleware } from '../middleware/verification.middleware';

const router = Router();

// Endpoint for Amazon Alexa webhook verification
router.post('/alexa', alexaVerificationMiddleware, alexaController.handleWebhook);

export default router;
