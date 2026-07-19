export interface AlexaResponse {
  version: string;
  response: {
    outputSpeech?: {
      type: 'PlainText' | 'SSML';
      text?: string;
      ssml?: string;
    };
    shouldEndSession?: boolean;
  };
}

/**
 * Builds a standard plaintext response for Alexa.
 *
 * @param speechText The text Alexa should speak back.
 * @param shouldEndSession Whether Alexa should close the session.
 * @returns A formatted AlexaResponse object.
 */
export function buildAlexaResponse(speechText: string, shouldEndSession = false): AlexaResponse {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText,
      },
      shouldEndSession,
    },
  };
}

/**
 * Builds an empty response, which is standard for SessionEndedRequest.
 *
 * @returns An empty object as required.
 */
export function buildAlexaEmptyResponse(): Record<string, never> {
  return {};
}
