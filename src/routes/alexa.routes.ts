import { Router } from 'express';
import { alexaController } from '../controllers/alexa.controller';

const router = Router();

// Endpoint for Amazon Alexa webhook verification
router.post('/alexa', alexaController.handleWebhook);

export default router;
