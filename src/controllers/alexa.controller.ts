import { Request, Response } from 'express';
import { buildAlexaResponse, buildAlexaEmptyResponse } from '../utils/alexa-response';
import { aiService } from '../ai/ai.service';
import { Logger } from '../utils/logger';

/**
 * Helper to extract user input from slots in an Alexa IntentRequest.
 * It checks the `prompt` slot first, then falls back to any other populated slot.
 *
 * @param alexaRequest The incoming Alexa request body
 * @returns The user prompt text if found, or null otherwise
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUserPrompt(alexaRequest: any): string | null {
  const slots = alexaRequest.request?.intent?.slots;
  if (!slots) {
    return null;
  }

  // Check prompt slot specifically if present
  if (
    slots.prompt &&
    typeof slots.prompt.value === 'string' &&
    slots.prompt.value.trim().length > 0
  ) {
    return slots.prompt.value.trim();
  }

  // Fallback to any populated slot
  for (const slotKey in slots) {
    if (Object.prototype.hasOwnProperty.call(slots, slotKey)) {
      const slot = slots[slotKey];
      if (slot && typeof slot.value === 'string' && slot.value.trim().length > 0) {
        return slot.value.trim();
      }
    }
  }

  return null;
}

export class AlexaController {
  /**
   * Handles incoming HTTP POST requests from Amazon Alexa Skills Kit.
   * Logs interaction meta-data safely and returns structured JSON responses.
   *
   * @param req Express Request object
   * @param res Express Response object
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const alexaRequest = req.body;

      if (!alexaRequest || !alexaRequest.request) {
        Logger.warn('AlexaController', 'Malformed request. Missing Alexa request body.');
        res.status(400).json({
          status: 'error',
          message: 'Malformed request. Missing Alexa request body.',
        });
        return;
      }

      const requestType = alexaRequest.request.type;
      const requestId = alexaRequest.request.requestId;
      const sessionId = alexaRequest.session?.sessionId || 'N/A';
      const userId = alexaRequest.session?.user?.userId || 'alexa-user';

      Logger.info(
        'AlexaController',
        `Incoming Alexa Request | Type: ${requestType} | RequestId: ${requestId} | SessionId: ${sessionId}`,
      );

      switch (requestType) {
        case 'LaunchRequest': {
          // Part 2: Fast launch speech (3 words max)
          const response = buildAlexaResponse('Durjoy AI ready.', false, 'How can I help?');
          Logger.info(
            'AlexaController',
            'Alexa response sent for LaunchRequest: "Durjoy AI ready."',
          );
          res.status(200).json(response);
          break;
        }

        case 'IntentRequest': {
          const intentName = alexaRequest.request.intent?.name || 'UnknownIntent';
          Logger.info('AlexaController', `Intent Name: ${intentName}`);

          // Handle built-in stop/cancel intents
          if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
            const response = buildAlexaResponse('Goodbye!', true);
            Logger.info('AlexaController', 'Alexa response sent for Stop/CancelIntent: "Goodbye!"');
            res.status(200).json(response);
            break;
          }

          if (intentName === 'AMAZON.HelpIntent') {
            const response = buildAlexaResponse(
              'Ask me anything, like latest news, weather, or reminders!',
              false,
              'What would you like to ask?',
            );
            Logger.info('AlexaController', 'Alexa response sent for HelpIntent.');
            res.status(200).json(response);
            break;
          }

          // Handle ChatIntent and custom intents
          const userPrompt = extractUserPrompt(alexaRequest);
          if (!userPrompt) {
            Logger.warn('AlexaController', 'Empty or missing user prompt slot.');
            const response = buildAlexaResponse(
              'How can I help you today?',
              false,
              'How can I help you today?',
            );
            Logger.info('AlexaController', 'Alexa response sent for empty slot prompt.');
            res.status(200).json(response);
            break;
          }

          Logger.info('AlexaController', `Extracted prompt: "${userPrompt}"`);

          try {
            const aiResponse = await aiService.generateResponse(userPrompt, {
              userId,
              sessionId,
            });

            const speechOutput =
              !aiResponse || aiResponse.trim().length === 0
                ? 'How can I help you today?'
                : aiResponse;

            const response = buildAlexaResponse(
              speechOutput,
              false,
              'What else can I help you with?',
            );

            Logger.info('AlexaController', `Alexa response sent: "${speechOutput}"`);
            res.status(200).json(response);
          } catch (aiError) {
            Logger.error('AlexaController', 'Error invoking AIService pipeline', aiError);
            const fallbackSpeech = "I didn't quite catch that. Could you try asking again?";
            const response = buildAlexaResponse(
              fallbackSpeech,
              false,
              'Could you try asking again?',
            );
            Logger.info('AlexaController', `Alexa fallback response sent: "${fallbackSpeech}"`);
            res.status(200).json(response);
          }
          break;
        }

        case 'SessionEndedRequest': {
          const reason = alexaRequest.request.reason || 'UNKNOWN';
          Logger.info('AlexaController', `Session Ended. Reason: ${reason}`);

          const response = buildAlexaEmptyResponse();
          res.status(200).json(response);
          break;
        }

        default: {
          Logger.warn('AlexaController', `Unhandled request type: ${requestType}`);

          const response = buildAlexaResponse('Durjoy AI ready.', false, 'How can I help?');
          Logger.info('AlexaController', 'Alexa response sent for unhandled request type.');
          res.status(200).json(response);
          break;
        }
      }
    } catch (error) {
      Logger.error('AlexaController', 'Unhandled exception in Alexa webhook handler', error);
      const errorResponse = buildAlexaResponse(
        'Durjoy AI is ready. What can I help you with?',
        false,
        'What can I help you with?',
      );
      res.status(200).json(errorResponse);
    }
  };
}

export const alexaController = new AlexaController();
