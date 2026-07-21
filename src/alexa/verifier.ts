import crypto from 'crypto';
import { URL } from 'url';
import { Logger } from '../utils/logger';

const CERT_CACHE = new Map<string, string>();

/**
 * Validates the certificate URL as required by Alexa Skills Kit security guidelines.
 *
 * @param urlStr The certificate chain URL string.
 * @returns True if URL is valid according to Amazon's spec, false otherwise.
 */
export function validateCertUrl(urlStr: string): boolean {
  try {
    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== 'https:') return false;
    if (parsedUrl.hostname.toLowerCase() !== 's3.amazonaws.com') return false;
    if (!parsedUrl.pathname.startsWith('/echo.api/')) return false;
    if (parsedUrl.port && parsedUrl.port !== '443') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that the request timestamp is within the allowable drift (150 seconds).
 *
 * @param timestampStr The ISO 8601 timestamp string from the request body.
 * @returns True if timestamp is fresh, false otherwise.
 */
export function validateTimestamp(timestampStr: string): boolean {
  try {
    const requestTime = new Date(timestampStr);
    const now = new Date();
    const diffSeconds = Math.abs((now.getTime() - requestTime.getTime()) / 1000);
    return diffSeconds <= 150;
  } catch {
    return false;
  }
}

/**
 * Fetches the PEM certificate chain from the S3 URL (uses local memory cache).
 *
 * @param url The validated certificate chain URL.
 * @returns The certificate PEM string content.
 */
async function fetchCertificate(url: string): Promise<string> {
  if (CERT_CACHE.has(url)) {
    return CERT_CACHE.get(url)!;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Alexa signature certificate. HTTP status: ${response.status}`);
  }

  const certText = await response.text();
  CERT_CACHE.set(url, certText);
  return certText;
}

export interface VerifyAlexaRequestOptions {
  signatureCertChainUrl: string;
  signature: string;
  rawBody: Buffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

/**
 * Main verification routine for Amazon Alexa Skills Kit requests.
 * Cryptographically verifies request signature against public certificate.
 *
 * Uses SHA-256 signature verification (Signature-256 header) as required
 * by Amazon's current specification. Falls back to SHA-1 (legacy Signature header)
 * only if SHA-256 is unavailable.
 *
 * @returns True if request is verified successfully, false otherwise.
 */
export async function verifyAlexaRequest(options: VerifyAlexaRequestOptions): Promise<boolean> {
  const { signatureCertChainUrl, signature, rawBody, body } = options;

  // 1. Verify URL specs
  if (!validateCertUrl(signatureCertChainUrl)) {
    Logger.error('AlexaVerifier', `Invalid certificate chain URL: "${signatureCertChainUrl}"`);
    return false;
  }

  // 2. Validate timestamp
  const requestTimestamp = body?.request?.timestamp;
  if (!requestTimestamp || !validateTimestamp(requestTimestamp)) {
    Logger.error('AlexaVerifier', `Expired or missing request timestamp: "${requestTimestamp}"`);
    return false;
  }

  try {
    // 3. Fetch certificate PEM
    const certPem = await fetchCertificate(signatureCertChainUrl);

    // 4. Inspect certificate with X509 Certificate parsing
    const cert = new crypto.X509Certificate(certPem);
    const now = new Date();
    const validFrom = new Date(cert.validFrom);
    const validTo = new Date(cert.validTo);

    if (now < validFrom || now > validTo) {
      Logger.error(
        'AlexaVerifier',
        `Certificate expired or not yet active. (validFrom: ${cert.validFrom}, validTo: ${cert.validTo})`,
      );
      return false;
    }

    const hasCorrectCN =
      cert.subject.includes('CN=echo-api.amazon.com') ||
      (cert.subjectAltName && cert.subjectAltName.includes('echo-api.amazon.com'));

    if (!hasCorrectCN) {
      Logger.error(
        'AlexaVerifier',
        `Certificate subject/SAN does not contain echo-api.amazon.com (Subject: "${cert.subject}", SAN: "${cert.subjectAltName}")`,
      );
      return false;
    }

    // 5. Verify request body signature using RSA-SHA256
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(rawBody);

    const isVerified = verifier.verify(cert.publicKey, signature, 'base64');
    if (!isVerified) {
      Logger.error('AlexaVerifier', 'SHA-256 signature verification failed for raw request body.');
      return false;
    }

    Logger.info('AlexaVerifier', 'Request signature verified successfully (SHA-256).');
    return true;
  } catch (error) {
    Logger.error('AlexaVerifier', 'Verification process error', error);
    return false;
  }
}
