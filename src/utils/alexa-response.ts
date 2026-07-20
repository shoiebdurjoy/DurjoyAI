export interface AlexaResponse {
  version: string;
  sessionAttributes: Record<string, unknown>;
  response: {
    outputSpeech?: {
      type: 'PlainText' | 'SSML';
      text?: string;
      ssml?: string;
    };
    reprompt?: {
      outputSpeech: {
        type: 'PlainText' | 'SSML';
        text?: string;
        ssml?: string;
      };
    };
    shouldEndSession?: boolean;
  };
}

/**
 * Builds a standard plaintext response for Alexa adhering to the ASK JSON schema specification.
 *
 * @param speechText The text Alexa should speak back.
 * @param shouldEndSession Whether Alexa should close the session.
 * @param repromptText Optional reprompt text when keeping session open. Defaults to speechText.
 * @param sessionAttributes Optional session attributes dictionary. Defaults to {}.
 * @returns A formatted AlexaResponse object.
 */
export function buildAlexaResponse(
  speechText: string,
  shouldEndSession = false,
  repromptText?: string,
  sessionAttributes: Record<string, unknown> = {},
): AlexaResponse {
  const reprompt = repromptText || (shouldEndSession ? undefined : speechText);

  return {
    version: '1.0',
    sessionAttributes,
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speechText,
      },
      ...(shouldEndSession === false && reprompt
        ? {
            reprompt: {
              outputSpeech: {
                type: 'PlainText',
                text: reprompt,
              },
            },
          }
        : {}),
      shouldEndSession,
    },
  };
}

/**
 * Builds an empty response for SessionEndedRequest adhering to ASK schema specification.
 *
 * @returns A formatted AlexaResponse object for session termination.
 */
export function buildAlexaEmptyResponse(): AlexaResponse {
  return {
    version: '1.0',
    sessionAttributes: {},
    response: {
      shouldEndSession: true,
    },
  };
}
