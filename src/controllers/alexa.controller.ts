import { Request, Response } from 'express';
import { buildAlexaResponse, buildAlexaEmptyResponse } from '../utils/alexa-response';
import { aiService } from '../ai/ai.service';

/**
 * Helper to extract user input from slots in an Alexa IntentRequest.
 * It searches through all slots and returns the value of the first populated slot.
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
   * Logs interaction meta-data safely and returns the structured JSON responses.
   *
   * @param req Express Request object
   * @param res Express Response object
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const alexaRequest = req.body;

      // Validate the basic request structure
      if (!alexaRequest || !alexaRequest.request) {
        res.status(400).json({
          status: 'error',
          message: 'Malformed request. Missing Alexa request body.',
        });
        return;
      }

      const requestType = alexaRequest.request.type;
      const requestId = alexaRequest.request.requestId;
      const sessionId = alexaRequest.session?.sessionId || 'N/A';

      // Safe logging (excludes user access tokens / user-specific identifiers)
      // eslint-disable-next-line no-console
      console.log(
        `[Alexa Request] Type: ${requestType} | RequestId: ${requestId} | SessionId: ${sessionId}`,
      );

      switch (requestType) {
        case 'LaunchRequest': {
          const response = buildAlexaResponse(
            "Yo! I'm Durjoy AI. What's up? What can I help you with today?",
            false,
            'What can I help you with today?',
          );
          res.status(200).json(response);
          break;
        }

        case 'IntentRequest': {
          const intentName = alexaRequest.request.intent?.name || 'UnknownIntent';
          // eslint-disable-next-line no-console
          console.log(`[Alexa Request] Intent Name: ${intentName}`);

          const userPrompt = extractUserPrompt(alexaRequest);
          if (!userPrompt) {
            // eslint-disable-next-line no-console
            console.log('[Alexa Request] Empty or missing user prompt.');
            const response = buildAlexaResponse(
              'Yo, say that again, man.',
              false,
              'Yo, say that again, man.',
            );
            res.status(200).json(response);
            break;
          }

          // eslint-disable-next-line no-console
          console.log(`[Alexa Request] Extracted prompt: "${userPrompt}"`);

          try {
            const aiResponse = await aiService.generateResponse(userPrompt);

            if (!aiResponse || aiResponse.trim().length === 0) {
              // eslint-disable-next-line no-console
              console.warn('[Alexa Request] AI service returned an empty response.');
              const response = buildAlexaResponse(
                'Yo, say that again, man.',
                false,
                'Yo, say that again, man.',
              );
              res.status(200).json(response);
            } else {
              const response = buildAlexaResponse(
                aiResponse,
                false,
                'What else can I help you with?',
              );
              res.status(200).json(response);
            }
          } catch (aiError) {
            // eslint-disable-next-line no-console
            console.error('[Alexa Request] Error invoking AI service:', aiError);
            const response = buildAlexaResponse(
              'Yo, something went wrong. Give me another shot in a moment.',
              false,
              'Give me another shot in a moment.',
            );
            res.status(200).json(response);
          }
          break;
        }

        case 'SessionEndedRequest': {
          const reason = alexaRequest.request.reason || 'UNKNOWN';
          // eslint-disable-next-line no-console
          console.log(`[Alexa Request] Session Ended. Reason: ${reason}`);

          const response = buildAlexaEmptyResponse();
          res.status(200).json(response);
          break;
        }

        default: {
          // eslint-disable-next-line no-console
          console.warn(`[Alexa Request] Unhandled request type: ${requestType}`);

          const response = buildAlexaResponse(
            'Sorry, I am not sure how to process that request.',
            true,
          );
          res.status(200).json(response);
          break;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in Alexa webhook handler:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error processing Alexa request.',
      });
    }
  };
}

export const alexaController = new AlexaController();
