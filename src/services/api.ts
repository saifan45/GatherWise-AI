/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EventGenerationRequest,
  EventPlan,
  EventRefineRequest,
  SpeechGenerationRequest,
  SpeechItem,
} from '../types/event.ts';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
  feedback?: string;
}

export class ApiError extends Error {
  public readonly code?: string;
  public readonly retryable: boolean;
  public readonly retryAfterSeconds?: number;
  public readonly statusCode: number;
  public readonly details?: unknown[];

  constructor(
    message: string,
    options: {
      code?: string;
      retryable?: boolean;
      retryAfterSeconds?: number;
      statusCode?: number;
      details?: unknown[];
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
  }
}

interface ApiServerEnvelope {
  success?: boolean;
  error?: string;
  code?: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
  details?: unknown[];
  plan?: EventPlan;
  speech?: SpeechItem;
  feedback?: string;
}

async function handleApiResponse<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  let body: ApiServerEnvelope = {};
  try {
    body = (await res.json()) as ApiServerEnvelope;
  } catch {
    body = {};
  }

  if (!res.ok || !body.success) {
    const isRetryableStatus = res.status === 503 || res.status === 429 || res.status === 504 || res.status === 502;
    const retryable = body.retryable ?? isRetryableStatus;

    let code = body.code;
    let errorMessage = body.error;

    if (!code) {
      if (res.status === 503) code = 'UPSTREAM_UNAVAILABLE';
      else if (res.status === 429) code = 'RATE_LIMITED';
      else if (res.status === 504) code = 'TIMEOUT';
      else if (res.status === 502) code = 'MALFORMED_AI_RESPONSE';
      else if (res.status === 400) code = 'VALIDATION_ERROR';
      else code = 'INTERNAL_ERROR';
    }

    if (!errorMessage || !errorMessage.trim()) {
      if (code === 'CONFIG_ERROR') {
        errorMessage = 'GEMINI_API_KEY is not configured in server environment. Please set up your key in AI Studio Secrets.';
      } else if (code === 'UPSTREAM_UNAVAILABLE') {
        errorMessage = 'Gemini AI service is temporarily unavailable due to high demand. Please click Retry to try again.';
      } else if (code === 'RATE_LIMITED') {
        errorMessage = 'AI request rate limit reached. Please wait a brief moment and retry.';
      } else if (code === 'TIMEOUT') {
        errorMessage = 'AI generation timed out after retries. Please click Retry to try again.';
      } else if (code === 'MALFORMED_AI_RESPONSE') {
        errorMessage = 'The AI model generated a response that could not be parsed as JSON. Please click Retry.';
      } else if (code === 'VALIDATION_ERROR') {
        errorMessage = 'Request validation failed. Please check your inputs.';
      } else {
        errorMessage = defaultErrorMessage || 'Failed to complete AI event planning request on server.';
      }
    }

    throw new ApiError(errorMessage, {
      code,
      retryable,
      retryAfterSeconds: body.retryAfterSeconds,
      statusCode: res.status,
      details: body.details,
    });
  }

  return body as T;
}

export async function checkServerHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch {
    return { status: 'offline', geminiConfigured: false };
  }
}

export async function generateEventPlanApi(req: EventGenerationRequest): Promise<EventPlan> {
  const res = await fetch('/api/events/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const body = await handleApiResponse<{ success: boolean; plan: EventPlan }>(
    res,
    'Failed to generate event plan from server'
  );

  return body.plan;
}

export async function refineEventPlanApi(
  req: EventRefineRequest
): Promise<{ plan: EventPlan; feedback: string }> {
  const res = await fetch('/api/events/refine-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const body = await handleApiResponse<{ success: boolean; plan: EventPlan; feedback?: string }>(
    res,
    'Failed to refine plan with AI'
  );

  return { plan: body.plan, feedback: body.feedback || 'Plan adjusted.' };
}

export async function generateSpeechApi(req: SpeechGenerationRequest): Promise<SpeechItem> {
  const res = await fetch('/api/events/generate-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const body = await handleApiResponse<{ success: boolean; speech: SpeechItem }>(
    res,
    'Failed to generate speech'
  );

  return body.speech;
}
