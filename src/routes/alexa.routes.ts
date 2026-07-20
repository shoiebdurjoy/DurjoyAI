import { Router } from 'express';
import { alexaController } from '../controllers/alexa.controller';
import { alexaVerificationMiddleware } from '../middleware/verification.middleware';

/**
 * Alexa webhook route.
 *
 * Single entry point for all Alexa Skill requests:
 *   POST /alexa
 *     → alexaVerificationMiddleware  (validates Amazon signature in production)
 *     → alexaController.handleWebhook
 *         → AIService pipeline (Normalization → Reasoning → Tools → Search → Memory → LLM)
 *
 * There are NO other Alexa routes. All request types (LaunchRequest, IntentRequest,
 * SessionEndedRequest) are handled inside handleWebhook.
 */
const router = Router();

router.post('/alexa', alexaVerificationMiddleware, alexaController.handleWebhook);

export default router;
