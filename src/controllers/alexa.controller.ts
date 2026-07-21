import { Request, Response } from 'express';
import { buildAlexaResponse, buildAlexaEmptyResponse } from '../utils/alexa-response';
import { aiService } from '../ai/ai.service';
import { Logger } from '../utils/logger';
import { isExitIntent, getRandomExitMessage } from '../utils/exit-detector';
import { getRandomReprompt } from '../utils/reprompt-rotator';

/**
 * Extracts user speech text from an Alexa IntentRequest.
 *
 * Priority order:
 *  1. slots.prompt.value  — populated by ChatIntent's AMAZON.SearchQuery slot
 *  2. slots.query.value   — alternate slot name some models use
 *  3. Any other populated slot value
 *
 * For AMAZON.FallbackIntent there are no slots; returns null so the caller
 * can ask the user to rephrase.
 *
 * @param alexaRequest The raw Alexa request body
 * @returns Trimmed user prompt string, or null if none found
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUserPrompt(alexaRequest: any): string | null {
  const slots = alexaRequest.request?.intent?.slots;
  if (!slots) return null;

  // Priority 1: named 'prompt' slot (ChatIntent)
  if (slots.prompt?.value?.trim().length > 0) {
    return slots.prompt.value.trim();
  }

  // Priority 2: named 'query' slot (alternative model naming)
  if (slots.query?.value?.trim().length > 0) {
    return slots.query.value.trim();
  }

  // Priority 3: any other populated slot
  for (const slotKey of Object.keys(slots)) {
    const val = slots[slotKey]?.value;
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  return null;
}

export class AlexaController {
  /**
   * Single entry point for ALL Alexa webhook requests.
   *
   * Pipeline:
   *  1. Inspect request type (LaunchRequest, IntentRequest, SessionEndedRequest)
   *  2. Handle SessionEndedRequest with an empty ASK-compliant response.
   *  3. Handle LaunchRequest with fast 3-word speech ("Durjoy AI ready.") and keep session alive.
   *  4. Extract prompt from IntentRequest.
   *  5. Handle natural exit phrases (bye, see you, talk later) with friendly goodbye and shouldEndSession = true.
   *  6. Forward prompt to AIService pipeline (Normalization -> Reasoning -> Tools -> Search -> Memory -> LLM).
   *  7. Return ASK-compliant JSON with outputSpeech, reprompt, and shouldEndSession = false.
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const alexaRequest = req.body;
      const requestType: string = alexaRequest?.request?.type;
      const sessionId: string = alexaRequest?.session?.sessionId || 'unknown-session';
      const userId: string = alexaRequest?.session?.user?.userId || 'alexa-user';

      Logger.info(
        'AlexaController',
        `Request received | Type: ${requestType} | SessionId: ${sessionId} | UserId: ${userId}`,
      );

      // ─── SessionEndedRequest ──────────────────────────────────────────────
      if (requestType === 'SessionEndedRequest') {
        const reason = alexaRequest?.request?.reason;
        const errDetails = alexaRequest?.request?.error;
        Logger.info(
          'AlexaController',
          `SessionEndedRequest received | Reason: ${reason} | Error: ${JSON.stringify(errDetails || {})}`,
        );
        res.status(200).json(buildAlexaEmptyResponse());
        return;
      }

      // ─── LaunchRequest ───────────────────────────────────────────────────
      if (requestType === 'LaunchRequest') {
        const launchSpeech = 'Durjoy AI ready.';
        const repromptText = getRandomReprompt();
        const shouldEndSession = false;

        Logger.info(
          'AlexaController',
          `RESPONSE | LaunchRequest | Speech: "${launchSpeech}" | Reprompt: "${repromptText}" | shouldEndSession: ${shouldEndSession}`,
        );

        res.status(200).json(buildAlexaResponse(launchSpeech, shouldEndSession, repromptText));
        return;
      }

      // ─── IntentRequest ────────────────────────────────────────────────────
      if (requestType === 'IntentRequest') {
        const intentName: string = alexaRequest.request.intent?.name || 'ChatIntent';

        Logger.info('AlexaController', `INTENT | Name: ${intentName} | SessionId: ${sessionId}`);

        // Built-in: Stop / Cancel — end session gracefully
        if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
          const exitMsg = getRandomExitMessage();
          const shouldEndSession = true;
          Logger.info(
            'AlexaController',
            `RESPONSE | ${intentName} | Speech: "${exitMsg}" | shouldEndSession: ${shouldEndSession}`,
          );
          res.status(200).json(buildAlexaResponse(exitMsg, shouldEndSession));
          return;
        }

        // Built-in: Help
        if (intentName === 'AMAZON.HelpIntent') {
          const shouldEndSession = false;
          const speech = 'Ask me anything — latest news, weather, scores, or reminders!';
          const repromptText = getRandomReprompt();
          Logger.info(
            'AlexaController',
            `RESPONSE | AMAZON.HelpIntent | Speech: "${speech}" | shouldEndSession: ${shouldEndSession}`,
          );
          res.status(200).json(buildAlexaResponse(speech, shouldEndSession, repromptText));
          return;
        }

        // Built-in: NavigateHome — re-open
        if (intentName === 'AMAZON.NavigateHomeIntent') {
          const shouldEndSession = false;
          const repromptText = getRandomReprompt();
          Logger.info(
            'AlexaController',
            `RESPONSE | AMAZON.NavigateHomeIntent | shouldEndSession: ${shouldEndSession}`,
          );
          res
            .status(200)
            .json(buildAlexaResponse('Durjoy AI ready.', shouldEndSession, repromptText));
          return;
        }

        // ── ChatIntent / AMAZON.FallbackIntent / any other custom intent ────
        let userPrompt = extractUserPrompt(alexaRequest);

        if (!userPrompt && intentName === 'AMAZON.FallbackIntent') {
          Logger.info(
            'AlexaController',
            `AMAZON.FallbackIntent triggered without slot value — routing to AIService with default conversational prompt. | SessionId: ${sessionId}`,
          );
          userPrompt = 'hello';
        }

        Logger.info(
          'AlexaController',
          `PROMPT EXTRACTED | Intent: ${intentName} | Prompt: "${userPrompt ?? '(empty)'}" | SessionId: ${sessionId}`,
        );

        if (!userPrompt) {
          const shouldEndSession = false;
          const speech = 'What would you like to know?';
          const repromptText = getRandomReprompt();
          Logger.warn(
            'AlexaController',
            `Empty prompt slot for intent "${intentName}". | shouldEndSession: ${shouldEndSession}`,
          );
          res.status(200).json(buildAlexaResponse(speech, shouldEndSession, repromptText));
          return;
        }

        // Check for natural exit phrases (bye, see you, talk later, good night)
        if (isExitIntent(userPrompt)) {
          const exitMsg = getRandomExitMessage();
          Logger.info(
            'AlexaController',
            `RESPONSE | Exit Intent Detected | Speech: "${exitMsg}" | shouldEndSession: true`,
          );
          res.status(200).json(buildAlexaResponse(exitMsg, true));
          return;
        }

        // ── Invoke full AIService pipeline ───────────────────────────────────
        try {
          const aiResponse = await aiService.generateResponse(userPrompt, { userId, sessionId });

          const speechOutput =
            !aiResponse || aiResponse.trim().length === 0
              ? 'I am right here. How can I help next?'
              : aiResponse;

          const shouldEndSession = false;
          const repromptText = getRandomReprompt();

          Logger.info(
            'AlexaController',
            `RESPONSE | Intent: ${intentName} | Prompt: "${userPrompt}" | Speech: "${speechOutput}" | Reprompt: "${repromptText}" | shouldEndSession: ${shouldEndSession}`,
          );

          res.status(200).json(buildAlexaResponse(speechOutput, shouldEndSession, repromptText));
        } catch (aiError) {
          Logger.error(
            'AlexaController',
            `AIService pipeline exception for intent "${intentName}" | Prompt: "${userPrompt}"`,
            aiError,
          );
          const shouldEndSession = false;
          const fallback = "I'm right here. What would you like to ask Durjoy AI?";
          const repromptText = getRandomReprompt();
          Logger.info(
            'AlexaController',
            `RESPONSE | FALLBACK | Speech: "${fallback}" | shouldEndSession: ${shouldEndSession}`,
          );
          res.status(200).json(buildAlexaResponse(fallback, shouldEndSession, repromptText));
        }
        return;
      }

      // ─── Unknown request type ─────────────────────────────────────────────
      Logger.warn(
        'AlexaController',
        `Unknown request type: "${requestType}". Returning ready state.`,
      );
      res.status(200).json(buildAlexaResponse('Durjoy AI ready.', false, getRandomReprompt()));
    } catch (error) {
      Logger.error('AlexaController', 'Unhandled exception in Alexa webhook handler', error);
      res
        .status(200)
        .json(
          buildAlexaResponse(
            'Durjoy AI is having a moment. Please try again.',
            false,
            getRandomReprompt(),
          ),
        );
    }
  };
}

export const alexaController = new AlexaController();
