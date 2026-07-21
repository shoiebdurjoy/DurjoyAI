/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { validateCertUrl, validateTimestamp } from './verifier';
import { alexaVerificationMiddleware } from '../middleware/verification.middleware';
import * as verifier from './verifier';
import { Request, Response } from 'express';

describe('Alexa Request Verification Unit Tests', () => {
  describe('validateCertUrl', () => {
    it('should return true for a valid S3 URL', () => {
      assert.strictEqual(
        validateCertUrl('https://s3.amazonaws.com/echo.api/echo-api-cert.pem'),
        true,
      );
      assert.strictEqual(
        validateCertUrl('https://s3.amazonaws.com/echo.api/certs/echo-api-cert.pem'),
        true,
      );
    });

    it('should return false for invalid protocols', () => {
      assert.strictEqual(
        validateCertUrl('http://s3.amazonaws.com/echo.api/echo-api-cert.pem'),
        false,
      );
    });

    it('should return false for incorrect hostnames', () => {
      assert.strictEqual(
        validateCertUrl('https://dangerous-domain.com/echo.api/echo-api-cert.pem'),
        false,
      );
      assert.strictEqual(
        validateCertUrl('https://s3.amazonaws.com.fake/echo.api/echo-api-cert.pem'),
        false,
      );
    });

    it('should return false for incorrect paths', () => {
      assert.strictEqual(
        validateCertUrl('https://s3.amazonaws.com/echo.api-fake/echo-api-cert.pem'),
        false,
      );
      assert.strictEqual(
        validateCertUrl('https://s3.amazonaws.com/certs/echo-api-cert.pem'),
        false,
      );
    });

    it('should return false for invalid ports', () => {
      assert.strictEqual(
        validateCertUrl('https://s3.amazonaws.com:8443/echo.api/echo-api-cert.pem'),
        false,
      );
    });
  });

  describe('validateTimestamp', () => {
    it('should return true for a fresh timestamp within 150 seconds limit', () => {
      const nowStr = new Date().toISOString();
      assert.strictEqual(validateTimestamp(nowStr), true);

      const recentStr = new Date(Date.now() - 50000).toISOString(); // 50s ago
      assert.strictEqual(validateTimestamp(recentStr), true);
    });

    it('should return false for an expired timestamp', () => {
      const oldStr = new Date(Date.now() - 160000).toISOString(); // 160s ago
      assert.strictEqual(validateTimestamp(oldStr), false);

      const futureStr = new Date(Date.now() + 160000).toISOString(); // 160s in future
      assert.strictEqual(validateTimestamp(futureStr), false);
    });
  });
});

describe('Alexa Verification Middleware Integration Tests', () => {
  const createMockResponse = () => {
    const res = {} as Response;
    res.status = mock.fn((_code: number) => res);
    res.json = mock.fn((_body: any) => res);
    return res;
  };

  it('should return valid Alexa JSON (not raw error) when headers are missing', async () => {
    const req = {
      headers: {},
      body: {},
    } as unknown as Request;
    const res = createMockResponse();
    const next = mock.fn();

    await alexaVerificationMiddleware(req, res, next);

    // Must return HTTP 200 with valid Alexa JSON — NOT 400 with raw error
    assert.strictEqual((res.status as any).mock.calls[0].arguments[0], 200);
    const responseBody = (res.json as any).mock.calls[0].arguments[0];
    assert.strictEqual(responseBody.version, '1.0');
    assert.ok(responseBody.response.outputSpeech, 'Must have outputSpeech');
    assert.ok(
      responseBody.response.outputSpeech.text.length > 0,
      'outputSpeech.text must not be empty',
    );
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should return valid Alexa JSON when signature verification fails', async () => {
    // Mock verifyAlexaRequest to simulate signature validation failure
    const verifyMock = mock.method(verifier, 'verifyAlexaRequest', async () => false);

    const freshTimestamp = new Date().toISOString();
    const req = {
      headers: {
        signaturecertchainurl: 'https://s3.amazonaws.com/echo.api/cert.pem',
        'signature-256': 'invalid-signature',
      },
      body: {
        request: {
          timestamp: freshTimestamp,
        },
      },
      rawBody: Buffer.from('{"request":{"timestamp":"' + freshTimestamp + '"}}'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = mock.fn();

    await alexaVerificationMiddleware(req, res, next);

    // Must return HTTP 200 with valid Alexa JSON — NOT 400 with raw error
    assert.strictEqual((res.status as any).mock.calls[0].arguments[0], 200);
    const responseBody = (res.json as any).mock.calls[0].arguments[0];
    assert.strictEqual(responseBody.version, '1.0');
    assert.ok(responseBody.response.outputSpeech);
    assert.strictEqual(next.mock.calls.length, 0);

    verifyMock.mock.restore();
  });

  it('should accept signature-256 header (current Amazon spec)', async () => {
    const verifyMock = mock.method(verifier, 'verifyAlexaRequest', async () => true);

    const freshTimestamp = new Date().toISOString();
    const req = {
      headers: {
        signaturecertchainurl: 'https://s3.amazonaws.com/echo.api/cert.pem',
        'signature-256': 'valid-sha256-signature',
      },
      body: {
        request: {
          timestamp: freshTimestamp,
        },
      },
      rawBody: Buffer.from('{"request":{"timestamp":"' + freshTimestamp + '"}}'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = mock.fn();

    await alexaVerificationMiddleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);

    verifyMock.mock.restore();
  });

  it('should fall back to legacy signature header if signature-256 is not present', async () => {
    const verifyMock = mock.method(verifier, 'verifyAlexaRequest', async () => true);

    const freshTimestamp = new Date().toISOString();
    const req = {
      headers: {
        signaturecertchainurl: 'https://s3.amazonaws.com/echo.api/cert.pem',
        signature: 'valid-legacy-signature',
      },
      body: {
        request: {
          timestamp: freshTimestamp,
        },
      },
      rawBody: Buffer.from('{"request":{"timestamp":"' + freshTimestamp + '"}}'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = mock.fn();

    await alexaVerificationMiddleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);

    verifyMock.mock.restore();
  });

  it('should call next() if request is verified successfully', async () => {
    // Mock verifyAlexaRequest to simulate a valid request signature check
    const verifyMock = mock.method(verifier, 'verifyAlexaRequest', async () => true);

    const freshTimestamp = new Date().toISOString();
    const req = {
      headers: {
        signaturecertchainurl: 'https://s3.amazonaws.com/echo.api/cert.pem',
        'signature-256': 'valid-signature',
      },
      body: {
        request: {
          timestamp: freshTimestamp,
        },
      },
      rawBody: Buffer.from('{"request":{"timestamp":"' + freshTimestamp + '"}}'),
    } as unknown as Request;
    const res = createMockResponse();
    const next = mock.fn();

    await alexaVerificationMiddleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);

    verifyMock.mock.restore();
  });

  it('should skip verification and call next() if SKIP_ALEXA_VERIFICATION is true', async () => {
    process.env.SKIP_ALEXA_VERIFICATION = 'true';

    const req = {
      headers: {},
      body: {},
    } as unknown as Request;
    const res = createMockResponse();
    const next = mock.fn();

    await alexaVerificationMiddleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);

    // Clean up env
    process.env.SKIP_ALEXA_VERIFICATION = 'false';
  });
});
