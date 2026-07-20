import { Request, Response } from 'express';
import { buildAlexaResponse, buildAlexaEmptyResponse } from '../utils/alexa-response';
import { aiService } from '../ai/ai.service';
import { Logger } from '../utils/logger';

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
   *   Alexa → POST /alexa → alexaVerificationMiddleware → handleWebhook
   *        → AIService → (Memory | Tools | Search | LLM) → Alexa Response
   *
   * Every stage is logged:
   *   - Request type
   *   - Intent name
   *   - Extracted prompt
   *   - Session ID
   *   - shouldEndSession (on every outbound response)
   */
  public handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const alexaRequest = req.body;

      if (!alexaRequest || !alexaRequest.request) {
        Logger.warn('AlexaController', 'Malformed request — missing Alexa request body.');
        res.status(400).json({ status: 'error', message: 'Missing Alexa request body.' });
        return;
      }

      const requestType: string = alexaRequest.request.type;
      const requestId: string = alexaRequest.request.requestId || 'N/A';
      const sessionId: string = alexaRequest.session?.sessionId || 'N/A';
      const userId: string = alexaRequest.session?.user?.userId || 'alexa-user';

      Logger.info(
        'AlexaController',
        `━━━ ALEXA REQUEST ━━━ | Type: ${requestType} | Intent: ${alexaRequest.request.intent?.name || 'N/A'} | SessionId: ${sessionId} | RequestId: ${requestId}`,
      );

      // ─── LaunchRequest ────────────────────────────────────────────────────
      if (requestType === 'LaunchRequest') {
        const shouldEndSession = false;
        const speech = 'Durjoy AI ready.';
        const reprompt = 'How can I help?';

        Logger.info(
          'AlexaController',
          `RESPONSE | LaunchRequest | Speech: "${speech}" | shouldEndSession: ${shouldEndSession}`,
        );
        res.status(200).json(buildAlexaResponse(speech, shouldEndSession, reprompt));
        return;
      }

      // ─── SessionEndedRequest ──────────────────────────────────────────────
      if (requestType === 'SessionEndedRequest') {
        const reason = alexaRequest.request.reason || 'UNKNOWN';
        Logger.info('AlexaController', `Session ended. Reason: ${reason}`);
        res.status(200).json(buildAlexaEmptyResponse());
        return;
      }

      // ─── IntentRequest ────────────────────────────────────────────────────
      if (requestType === 'IntentRequest') {
        const intentName: string = alexaRequest.request.intent?.name || 'ChatIntent';

        Logger.info('AlexaController', `INTENT | Name: ${intentName} | SessionId: ${sessionId}`);

        // Built-in: Stop / Cancel — end session
        if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
          const shouldEndSession = true;
          Logger.info(
            'AlexaController',
            `RESPONSE | ${intentName} | Speech: "Goodbye!" | shouldEndSession: ${shouldEndSession}`,
          );
          res.status(200).json(buildAlexaResponse('Goodbye!', shouldEndSession));
          return;
        }

        // Built-in: Help
        if (intentName === 'AMAZON.HelpIntent') {
          const shouldEndSession = false;
          const speech = 'Ask me anything — latest news, weather, scores, or reminders!';
          Logger.info(
            'AlexaController',
            `RESPONSE | AMAZON.HelpIntent | Speech: "${speech}" | shouldEndSession: ${shouldEndSession}`,
          );
          res
            .status(200)
            .json(buildAlexaResponse(speech, shouldEndSession, 'What would you like to ask?'));
          return;
        }

        // Built-in: NavigateHome — re-open
        if (intentName === 'AMAZON.NavigateHomeIntent') {
          const shouldEndSession = false;
          Logger.info(
            'AlexaController',
            `RESPONSE | AMAZON.NavigateHomeIntent | shouldEndSession: ${shouldEndSession}`,
          );
          res
            .status(200)
            .json(buildAlexaResponse('Durjoy AI ready.', shouldEndSession, 'How can I help?'));
          return;
        }

        // ── ChatIntent / AMAZON.FallbackIntent / any other custom intent ────
        //
        // AMAZON.FallbackIntent arrives when the user says something Alexa cannot
        // map to any explicit utterance. There are NO slots on FallbackIntent.
        // We therefore prompt the user to rephrase so we can route to ChatIntent
        // which DOES carry the AMAZON.SearchQuery slot with the full free-form text.

        if (intentName === 'AMAZON.FallbackIntent') {
          const shouldEndSession = false;
          const speech = "I didn't catch that clearly. Could you rephrase your question?";
          Logger.warn(
            'AlexaController',
            `AMAZON.FallbackIntent triggered — no slot value available. Prompting user to rephrase. | SessionId: ${sessionId} | shouldEndSession: ${shouldEndSession}`,
          );
          res
            .status(200)
            .json(buildAlexaResponse(speech, shouldEndSession, 'What would you like to know?'));
          return;
        }

        // All remaining intents (ChatIntent and any future custom intents)
        const userPrompt = extractUserPrompt(alexaRequest);

        Logger.info(
          'AlexaController',
          `PROMPT EXTRACTED | Intent: ${intentName} | Prompt: "${userPrompt ?? '(empty)'}" | SessionId: ${sessionId}`,
        );

        if (!userPrompt) {
          const shouldEndSession = false;
          const speech = 'What would you like to know?';
          Logger.warn(
            'AlexaController',
            `Empty prompt slot for intent "${intentName}". | shouldEndSession: ${shouldEndSession}`,
          );
          res.status(200).json(buildAlexaResponse(speech, shouldEndSession, speech));
          return;
        }

        // ── Invoke full AIService pipeline ───────────────────────────────────
        //    Alexa → /alexa → AlexaController → AIService
        //         → (Normalization → Reasoning → Tools → Search → Memory → LLM)
        try {
          const aiResponse = await aiService.generateResponse(userPrompt, { userId, sessionId });

          const speechOutput =
            !aiResponse || aiResponse.trim().length === 0
              ? 'What else can I help you with?'
              : aiResponse;

          const shouldEndSession = false;

          Logger.info(
            'AlexaController',
            `RESPONSE | Intent: ${intentName} | Prompt: "${userPrompt}" | Speech: "${speechOutput}" | shouldEndSession: ${shouldEndSession}`,
          );

          res
            .status(200)
            .json(
              buildAlexaResponse(speechOutput, shouldEndSession, 'What else can I help you with?'),
            );
        } catch (aiError) {
          Logger.error(
            'AlexaController',
            `AIService pipeline exception for intent "${intentName}" | Prompt: "${userPrompt}"`,
            aiError,
          );
          const shouldEndSession = false;
          const fallback = "I couldn't get that. Please try asking again.";
          Logger.info(
            'AlexaController',
            `RESPONSE | FALLBACK | Speech: "${fallback}" | shouldEndSession: ${shouldEndSession}`,
          );
          res
            .status(200)
            .json(buildAlexaResponse(fallback, shouldEndSession, 'Please try asking again.'));
        }
        return;
      }

      // ─── Unknown request type ─────────────────────────────────────────────
      Logger.warn(
        'AlexaController',
        `Unknown request type: "${requestType}". Returning ready state.`,
      );
      res.status(200).json(buildAlexaResponse('Durjoy AI ready.', false, 'How can I help?'));
    } catch (error) {
      Logger.error('AlexaController', 'Unhandled exception in Alexa webhook handler', error);
      res
        .status(200)
        .json(
          buildAlexaResponse(
            'Durjoy AI is having a moment. Please try again.',
            false,
            'Try again?',
          ),
        );
    }
  };
}

export const alexaController = new AlexaController();
