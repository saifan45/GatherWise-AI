/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AiErrorCode =
  | 'UPSTREAM_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'CONFIG_ERROR'
  | 'MALFORMED_AI_RESPONSE'
  | 'INTERNAL_ERROR';

export interface AiServiceErrorOptions {
  code: AiErrorCode;
  statusCode: number;
  retryable: boolean;
  retryAfterSeconds?: number;
  attempts?: number;
  cause?: unknown;
}

export class AiServiceError extends Error {
  public readonly code: AiErrorCode;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly retryAfterSeconds?: number;
  public readonly attempts: number;

  public override readonly cause?: unknown;

  constructor(message: string, options: AiServiceErrorOptions) {
    super(message);
    this.name = 'AiServiceError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.attempts = options.attempts || 1;
    this.cause = options.cause;
  }
}

/**
 * Robust helper to clean and parse JSON responses from AI models.
 * Handles markdown fences, preambles, and extracts valid JSON objects.
 * Throws a retryable AiServiceError if response is unparseable.
 */
export function cleanAndParseJSON<T>(rawText: string | undefined): T {
  if (!rawText || !rawText.trim()) {
    throw new AiServiceError(
      'Received empty response from AI model. Click Retry to try again.',
      {
        code: 'MALFORMED_AI_RESPONSE',
        statusCode: 502,
        retryable: true,
      }
    );
  }

  let clean = rawText.trim();

  // Extract contents inside ```json ... ``` or ``` ... ```
  const markdownMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    clean = markdownMatch[1].trim();
  } else {
    // If no code block, try finding the first '{' or '[' and last '}' or ']'
    const firstBrace = clean.search(/[\{\[]/);
    const lastBrace = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    return JSON.parse(clean) as T;
  } catch (cause) {
    throw new AiServiceError(
      'The AI model generated a response that could not be parsed as JSON. Please click Retry to generate a new blueprint.',
      {
        code: 'MALFORMED_AI_RESPONSE',
        statusCode: 502,
        retryable: true,
        cause,
      }
    );
  }
}

/**
 * Extracts Retry-After from response headers, error object properties, or error message.
 */
export function extractRetryAfterSeconds(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const anyErr = err as Record<string, any>;

  // Check response headers if present (e.g. Fetch response or gRPC metadata)
  const header =
    anyErr.response?.headers?.get?.('retry-after') ||
    anyErr.response?.headers?.['retry-after'] ||
    anyErr.headers?.['retry-after'] ||
    anyErr.headers?.get?.('retry-after') ||
    anyErr.retryAfter ||
    anyErr.retryAfterSeconds;

  if (typeof header === 'number' && Number.isFinite(header)) {
    return Math.max(1, Math.round(header));
  }

  if (typeof header === 'string') {
    const parsedSec = parseInt(header, 10);
    if (!isNaN(parsedSec) && parsedSec > 0) {
      return parsedSec;
    }
    const parsedDate = Date.parse(header);
    if (!isNaN(parsedDate)) {
      const diffSec = Math.ceil((parsedDate - Date.now()) / 1000);
      return diffSec > 0 ? diffSec : undefined;
    }
  }

  // Check error message string for patterns like "retry after 5 seconds" or "retry in 3s"
  const message = typeof anyErr.message === 'string' ? anyErr.message : '';
  if (message) {
    const match = message.match(/retry(?:-after|\s+in|\s+after)?\s*:?\s*(\d+)\s*(?:s|sec|seconds)?/i);
    if (match && match[1]) {
      const sec = parseInt(match[1], 10);
      if (!isNaN(sec) && sec > 0) return sec;
    }
  }

  return undefined;
}

/**
 * Checks whether an error is transient and retryable (503, 429, 502, 504, network reset, timeout, malformed AI response).
 * Explicitly rejects 400 Bad Request, schema validation, and config errors.
 */
export function isRetryableError(err: unknown): boolean {
  if (err instanceof AiServiceError) {
    return err.retryable;
  }

  const anyErr = (err && typeof err === 'object') ? (err as Record<string, any>) : {};
  const status = anyErr.status || anyErr.statusCode;
  const message = err instanceof Error ? err.message : String(err || '');

  // Check explicit code if set
  if (anyErr.code === 'MALFORMED_AI_RESPONSE' || status === 502) {
    return true;
  }

  // Non-retryable: 400 Bad Request, explicit validation errors, or API key config errors
  if (
    status === 400 ||
    /validation failed|invalid argument|apikey not valid|unregistered project|gemini_api_key/i.test(message)
  ) {
    return false;
  }

  // Malformed AI output or JSON syntax error in AI output -> retryable!
  if (
    /malformed|cannot be parsed|received empty response|unexpected token|unexpected end of json|syntaxerror/i.test(message)
  ) {
    return true;
  }

  // 503 Service Unavailable / Overloaded
  if (
    status === 503 ||
    /503|unavailable|overloaded|high demand|temporarily unavailable/i.test(message)
  ) {
    return true;
  }

  // 429 Rate Limited / Resource Exhausted
  if (
    status === 429 ||
    /429|resource_exhausted|quota|rate limit|too many requests/i.test(message)
  ) {
    return true;
  }

  // 504 Timeout / 502 Bad Gateway / Network Reset / Abort timeout
  if (
    status === 504 ||
    status === 502 ||
    anyErr.name === 'AbortError' ||
    anyErr.name === 'TimeoutError' ||
    /timeout|timed out|deadline_exceeded|504|502|bad gateway|econnreset|etimedout|socket hang up|aborted|aborterror/i.test(message)
  ) {
    return true;
  }

  return false;
}

/**
 * Categorizes an unknown error into a structured AiServiceError.
 */
export function classifyAiError(err: unknown, attempts = 1): AiServiceError {
  if (err instanceof AiServiceError) {
    return new AiServiceError(err.message, {
      code: err.code,
      statusCode: err.statusCode,
      retryable: err.retryable,
      retryAfterSeconds: err.retryAfterSeconds,
      attempts: attempts > 1 ? attempts : err.attempts,
      cause: err.cause,
    });
  }

  const anyErr = (err && typeof err === 'object') ? (err as Record<string, any>) : {};
  const status = anyErr.status || anyErr.statusCode;
  const message =
    err instanceof Error
      ? err.message
      : typeof anyErr.message === 'string'
      ? anyErr.message
      : String(err || '');
  const retryAfterSec = extractRetryAfterSeconds(err);

  // CONFIG_ERROR: Missing API key
  if (
    anyErr.code === 'CONFIG_ERROR' ||
    /gemini_api_key|api key is not configured/i.test(message)
  ) {
    return new AiServiceError(
      'GEMINI_API_KEY is not configured in server environment. Please set up your key in AI Studio Secrets.',
      {
        code: 'CONFIG_ERROR',
        statusCode: 503,
        retryable: false,
        attempts,
        cause: err,
      }
    );
  }

  // MALFORMED_AI_RESPONSE: json parse error or structural malformation
  if (
    status === 502 ||
    anyErr.code === 'MALFORMED_AI_RESPONSE' ||
    /malformed|cannot be parsed|received empty response|unexpected token|unexpected end of json|syntaxerror/i.test(message)
  ) {
    return new AiServiceError(
      'The AI model generated a response that could not be parsed as JSON. Please click Retry to generate a new blueprint.',
      {
        code: 'MALFORMED_AI_RESPONSE',
        statusCode: 502,
        retryable: true,
        attempts,
        cause: err,
      }
    );
  }

  // 503: High demand / upstream unavailable
  if (
    status === 503 ||
    /503|unavailable|overloaded|high demand|temporarily unavailable/i.test(message)
  ) {
    return new AiServiceError(
      'Gemini AI is experiencing high demand right now. Please click Retry to try again.',
      {
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 503,
        retryable: true,
        retryAfterSeconds: retryAfterSec || 3,
        attempts,
        cause: err,
      }
    );
  }

  // 429: Rate limit / resource exhausted
  if (
    status === 429 ||
    /429|resource_exhausted|quota|rate limit|too many requests/i.test(message)
  ) {
    return new AiServiceError(
      'AI request rate limit reached. Please wait a brief moment and retry.',
      {
        code: 'RATE_LIMITED',
        statusCode: 429,
        retryable: true,
        retryAfterSeconds: retryAfterSec || 5,
        attempts,
        cause: err,
      }
    );
  }

  // 504: Timeout / deadline exceeded / Aborted
  if (
    status === 504 ||
    anyErr.name === 'AbortError' ||
    anyErr.name === 'TimeoutError' ||
    /timeout|timed out|deadline_exceeded|504|aborted|aborterror/i.test(message)
  ) {
    return new AiServiceError(
      'AI generation timed out after retries. The model may be running slowly under peak load. Please try again.',
      {
        code: 'TIMEOUT',
        statusCode: 504,
        retryable: true,
        attempts,
        cause: err,
      }
    );
  }

  // 400: Validation error
  if (
    status === 400 ||
    /validation failed|invalid argument/i.test(message)
  ) {
    return new AiServiceError(
      message || 'Request validation failed.',
      {
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        retryable: false,
        attempts,
        cause: err,
      }
    );
  }

  // 500 / other unexpected
  return new AiServiceError(
    'Failed to complete AI event planning request due to an unexpected server error.',
    {
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      retryable: false,
      attempts,
      cause: err,
    }
  );
}

/**
 * Calculates exponential backoff delay with jitter, respecting Retry-After.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterSec?: number,
  randomJitterFn = Math.random
): number {
  if (retryAfterSec && retryAfterSec > 0) {
    return Math.min(maxDelayMs, retryAfterSec * 1000);
  }
  const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  const jitter = Math.floor(randomJitterFn() * 400); // 0-400ms jitter
  return Math.min(maxDelayMs, expDelay + jitter);
}

/**
 * Races an async operation against a timeout.
 */
export async function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface RetryPolicyOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  totalDeadlineMs?: number;
  perAttemptTimeoutMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
  randomJitterFn?: () => number;
}

/**
 * Executes an async task with a bounded retry policy for transient failures.
 * Ensures total duration never exceeds totalDeadlineMs.
 */
export async function executeWithRetry<T>(
  action: (info: { attempt: number; timeoutMs: number }) => Promise<T>,
  options: RetryPolicyOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2; // 1 initial + 2 retries = 3 attempts max
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 6000;
  const totalDeadlineMs = options.totalDeadlineMs ?? 45000; // Safe under Cloud Run 60s
  const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? 20000;
  const sleep = options.sleepFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const jitterFn = options.randomJitterFn ?? Math.random;

  const startTime = Date.now();
  let attempt = 0;
  let lastError: unknown;
  let primaryUpstreamError: unknown;

  while (attempt <= maxRetries) {
    attempt++;
    const elapsed = Date.now() - startTime;
    const remainingTime = totalDeadlineMs - elapsed;

    if (remainingTime <= 1500) {
      if (primaryUpstreamError) {
        throw classifyAiError(primaryUpstreamError, attempt - 1);
      }
      throw new AiServiceError(
        'AI generation exceeded the total request deadline before starting attempt.',
        {
          code: 'TIMEOUT',
          statusCode: 504,
          retryable: true,
          attempts: attempt - 1,
        }
      );
    }

    const currentTimeoutMs = Math.min(perAttemptTimeoutMs, remainingTime);

    try {
      return await raceWithTimeout(
        action({ attempt, timeoutMs: currentTimeoutMs }),
        currentTimeoutMs
      );
    } catch (err: unknown) {
      lastError = err;

      // Track if we encountered a specific upstream API error (503/429) rather than a local timeout
      const anyErr = (err && typeof err === 'object') ? (err as Record<string, any>) : {};
      const status = anyErr.status || anyErr.statusCode;
      const msg = err instanceof Error ? err.message : String(err || '');
      if (status === 503 || status === 429 || /503|unavailable|overloaded|429|resource_exhausted/i.test(msg)) {
        primaryUpstreamError = err;
      }

      // Check if the error is retryable
      const retryable = isRetryableError(err);
      if (!retryable || attempt > maxRetries) {
        throw classifyAiError(primaryUpstreamError || err, attempt);
      }

      const retryAfterSec = extractRetryAfterSeconds(err);
      const backoffMs = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs, retryAfterSec, jitterFn);

      const remainingAfterBackoff = totalDeadlineMs - (Date.now() - startTime + backoffMs);
      if (remainingAfterBackoff < 4000) {
        // Not enough time left within overall deadline to perform another attempt
        throw classifyAiError(primaryUpstreamError || err, attempt);
      }

      await sleep(backoffMs);
    }
  }

  throw classifyAiError(primaryUpstreamError || lastError, attempt);
}
