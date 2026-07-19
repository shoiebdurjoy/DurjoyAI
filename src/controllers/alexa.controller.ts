import { Request, Response } from 'express';
import { buildAlexaResponse, buildAlexaEmptyResponse } from '../utils/alexa-response';

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
            'Welcome to Durjoy AI. How can I help you today?',
            false,
          );
          res.status(200).json(response);
          break;
        }

        case 'IntentRequest': {
          const intentName = alexaRequest.request.intent?.name || 'UnknownIntent';
          // eslint-disable-next-line no-console
          console.log(`[Alexa Request] Intent Name: ${intentName}`);

          const response = buildAlexaResponse(
            'I heard your request. AI integration is coming soon.',
            false,
          );
          res.status(200).json(response);
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
