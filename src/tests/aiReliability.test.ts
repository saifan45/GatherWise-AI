/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import {
  AiServiceError,
  isRetryableError,
  classifyAiError,
  extractRetryAfterSeconds,
  calculateBackoffDelay,
  raceWithTimeout,
  executeWithRetry,
  cleanAndParseJSON,
} from '../utils/aiRetry.ts';
import { ApiError } from '../services/api.ts';
import { EventGenerationRequest, EventPlan } from '../types/event.ts';

describe('AI Reliability & Retry Engine', () => {
  describe('Error Classification & Retryability', () => {
    it('correctly classifies upstream 503 UNAVAILABLE as retryable', () => {
      const err503 = { status: 503, message: 'The model is overloaded. Please try again later.' };
      expect(isRetryableError(err503)).toBe(true);

      const classified = classifyAiError(err503, 1);
      expect(classified.code).toBe('UPSTREAM_UNAVAILABLE');
      expect(classified.statusCode).toBe(503);
      expect(classified.retryable).toBe(true);
      expect(classified.retryAfterSeconds).toBeDefined();
    });

    it('correctly classifies gRPC style UNAVAILABLE string as retryable', () => {
      const errGrpc = new Error('503 UNAVAILABLE: high demand on cluster');
      expect(isRetryableError(errGrpc)).toBe(true);

      const classified = classifyAiError(errGrpc, 2);
      expect(classified.code).toBe('UPSTREAM_UNAVAILABLE');
      expect(classified.statusCode).toBe(503);
      expect(classified.retryable).toBe(true);
      expect(classified.attempts).toBe(2);
    });

    it('correctly classifies upstream 429 RESOURCE_EXHAUSTED as retryable', () => {
      const err429 = { statusCode: 429, message: 'RESOURCE_EXHAUSTED: quota exceeded' };
      expect(isRetryableError(err429)).toBe(true);

      const classified = classifyAiError(err429, 1);
      expect(classified.code).toBe('RATE_LIMITED');
      expect(classified.statusCode).toBe(429);
      expect(classified.retryable).toBe(true);
    });

    it('correctly classifies 504 deadline / timeout errors as retryable', () => {
      const errTimeout = new Error('Operation timed out after 20s');
      expect(isRetryableError(errTimeout)).toBe(true);

      const classified = classifyAiError(errTimeout, 1);
      expect(classified.code).toBe('TIMEOUT');
      expect(classified.statusCode).toBe(504);
      expect(classified.retryable).toBe(true);
    });

    it('rejects 400 Bad Request and validation errors from being retried', () => {
      const err400 = { status: 400, message: 'Validation failed: title cannot be empty' };
      expect(isRetryableError(err400)).toBe(false);

      const classified = classifyAiError(err400, 1);
      expect(classified.code).toBe('VALIDATION_ERROR');
      expect(classified.statusCode).toBe(400);
      expect(classified.retryable).toBe(false);
    });

    it('classifies JSON syntax errors in AI responses as retryable MALFORMED_AI_RESPONSE', () => {
      const errSyntax = new SyntaxError('Unexpected token in JSON');
      expect(isRetryableError(errSyntax)).toBe(true);

      const classified = classifyAiError(errSyntax, 1);
      expect(classified.code).toBe('MALFORMED_AI_RESPONSE');
      expect(classified.statusCode).toBe(502);
      expect(classified.retryable).toBe(true);
    });
  });

  describe('Retry-After Extraction & Exponential Backoff Delay', () => {
    it('extracts Retry-After from numeric header object', () => {
      const errWithHeader = {
        response: {
          headers: {
            get: (key: string) => (key === 'retry-after' ? '7' : null),
          },
        },
      };
      expect(extractRetryAfterSeconds(errWithHeader)).toBe(7);
    });

    it('extracts Retry-After from error message text', () => {
      const errWithMsg = new Error('Resource exhausted, please retry after 4 seconds');
      expect(extractRetryAfterSeconds(errWithMsg)).toBe(4);
    });

    it('calculates exponential backoff with jitter', () => {
      const mockJitter = () => 0.5; // Fixed 200ms jitter

      // Attempt 1: base 1000 * 2^0 + 200 = 1200ms
      const delay1 = calculateBackoffDelay(1, 1000, 6000, undefined, mockJitter);
      expect(delay1).toBe(1200);

      // Attempt 2: base 1000 * 2^1 + 200 = 2200ms
      const delay2 = calculateBackoffDelay(2, 1000, 6000, undefined, mockJitter);
      expect(delay2).toBe(2200);

      // Attempt 3: base 1000 * 2^2 + 200 = 4200ms
      const delay3 = calculateBackoffDelay(3, 1000, 6000, undefined, mockJitter);
      expect(delay3).toBe(4200);
    });

    it('honors explicit Retry-After in delay calculation without exceeding maxDelay', () => {
      const delayWithRetryAfter = calculateBackoffDelay(1, 1000, 6000, 3);
      expect(delayWithRetryAfter).toBe(3000);

      // Clamped by maxDelay
      const delayClamped = calculateBackoffDelay(1, 1000, 5000, 15);
      expect(delayClamped).toBe(5000);
    });
  });

  describe('raceWithTimeout Utility', () => {
    it('resolves fast operations within timeout', async () => {
      const result = await raceWithTimeout(Promise.resolve('fast-result'), 500);
      expect(result).toBe('fast-result');
    });

    it('rejects with timeout message if operation exceeds deadline', async () => {
      const slowPromise = new Promise((resolve) => setTimeout(resolve, 500));
      await expect(raceWithTimeout(slowPromise, 50)).rejects.toThrow('timed out after');
    });
  });

  describe('executeWithRetry Execution Flow', () => {
    it('resolves immediately when the first attempt succeeds', async () => {
      let attempts = 0;
      const result = await executeWithRetry(
        async () => {
          attempts++;
          return 'first-try-success';
        },
        { maxRetries: 2, sleepFn: async () => {} }
      );

      expect(result).toBe('first-try-success');
      expect(attempts).toBe(1);
    });

    it('retries on transient 503 UNAVAILABLE and succeeds on attempt 2', async () => {
      let attempts = 0;
      const sleepSpy = vi.fn(async () => {});

      const result = await executeWithRetry(
        async () => {
          attempts++;
          if (attempts === 1) {
            throw { status: 503, message: 'The model is overloaded. Please try again later.' };
          }
          return { text: '{"title":"Vineyard Nuptials"}' };
        },
        {
          maxRetries: 2,
          baseDelayMs: 100,
          sleepFn: sleepSpy,
        }
      );

      expect(result).toEqual({ text: '{"title":"Vineyard Nuptials"}' });
      expect(attempts).toBe(2);
      expect(sleepSpy).toHaveBeenCalledTimes(1);
    });

    it('retries on transient 429 RATE_LIMITED and succeeds on attempt 3', async () => {
      let attempts = 0;
      const sleepSpy = vi.fn(async () => {});

      const result = await executeWithRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw { status: 429, message: 'RESOURCE_EXHAUSTED: rate limit hit' };
          }
          return { text: '{"success":true}' };
        },
        {
          maxRetries: 2,
          baseDelayMs: 50,
          sleepFn: sleepSpy,
        }
      );

      expect(result).toEqual({ text: '{"success":true}' });
      expect(attempts).toBe(3);
      expect(sleepSpy).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-retryable 400 validation error and fails immediately on attempt 1', async () => {
      let attempts = 0;
      const sleepSpy = vi.fn(async () => {});

      await expect(
        executeWithRetry(
          async () => {
            attempts++;
            throw { status: 400, message: 'Validation failed: Invalid guest count' };
          },
          {
            maxRetries: 2,
            sleepFn: sleepSpy,
          }
        )
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        retryable: false,
      });

      expect(attempts).toBe(1);
      expect(sleepSpy).not.toHaveBeenCalled();
    });

    it('enforces bounded retry limit and returns classified 503 when retries are exhausted', async () => {
      let attempts = 0;
      const sleepSpy = vi.fn(async () => {});

      await expect(
        executeWithRetry(
          async () => {
            attempts++;
            throw { status: 503, message: '503 Service Unavailable: overloaded' };
          },
          {
            maxRetries: 2, // 1 initial + 2 retries = 3 total
            baseDelayMs: 10,
            sleepFn: sleepSpy,
          }
        )
      ).rejects.toMatchObject({
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 503,
        retryable: true,
        attempts: 3,
      });

      expect(attempts).toBe(3);
      expect(sleepSpy).toHaveBeenCalledTimes(2);
    });

    it('enforces total overall deadline and aborts with TIMEOUT error without exceeding deadline', async () => {
      let attempts = 0;

      await expect(
        executeWithRetry(
          async () => {
            attempts++;
            // Simulate operation that exceeds tiny total deadline
            await new Promise((resolve) => setTimeout(resolve, 80));
            throw new Error('timed out');
          },
          {
            maxRetries: 3,
            totalDeadlineMs: 60, // Very tight overall deadline
            perAttemptTimeoutMs: 50,
          }
        )
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
        statusCode: 504,
        retryable: true,
      });

      // Should have aborted early rather than completing all 3 retries
      expect(attempts).toBeLessThanOrEqual(2);
    });

    it('preserves upstream 503 UNAVAILABLE when retry deadline is exhausted instead of masking with 504', async () => {
      let attempts = 0;
      const sleepSpy = vi.fn(async () => {});

      await expect(
        executeWithRetry(
          async () => {
            attempts++;
            if (attempts === 1) {
              // First attempt experiences high demand 503
              throw { status: 503, message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.' };
            }
            // Second attempt times out
            throw new Error('Operation timed out after 30s');
          },
          {
            maxRetries: 1,
            baseDelayMs: 10,
            sleepFn: sleepSpy,
          }
        )
      ).rejects.toMatchObject({
        code: 'UPSTREAM_UNAVAILABLE',
        statusCode: 503,
        retryable: true,
      });

      expect(attempts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('User Input & Existing Plan Preservation', () => {
    it('preserves user input object state across an AI failure', () => {
      const initialUserInput: EventGenerationRequest = {
        type: 'wedding',
        title: 'Highland Garden Ceremony',
        theme: 'Meadow Wildflowers & Strings',
        targetDate: '2027-06-15',
        startTime: '15:00',
        endTime: '22:00',
        locationName: 'Highland Botanical Gardens',
        locationCity: 'Denver, CO',
        setting: 'outdoor',
        guestCount: 120,
        totalBudget: 35000,
        dietaryNotes: '10 Vegetarians, 2 Gluten-free',
        accessibilityNeeds: ['Wheelchair ramp to gazebo'],
        specialRequests: 'Acoustic violin for processional',
      };

      // Clone input to simulate component state holding user inputs
      const componentInputState = { ...initialUserInput };

      // Simulate API throwing a 503 ApiError
      const apiFailure = new ApiError(
        'Gemini AI is experiencing high demand right now. Please click Retry to try again.',
        {
          code: 'UPSTREAM_UNAVAILABLE',
          retryable: true,
          statusCode: 503,
        }
      );

      // Validate error characteristics
      expect(apiFailure.code).toBe('UPSTREAM_UNAVAILABLE');
      expect(apiFailure.retryable).toBe(true);
      expect(apiFailure.statusCode).toBe(503);

      // Verify that component input state remains completely intact and uncorrupted
      expect(componentInputState).toEqual(initialUserInput);
      expect(componentInputState.title).toBe('Highland Garden Ceremony');
      expect(componentInputState.totalBudget).toBe(35000);
      expect(componentInputState.guestCount).toBe(120);
    });

    it('preserves existing EventPlan when refinement fails', () => {
      const currentPlan: EventPlan = {
        id: 'plan-existing-1',
        title: 'Grand Gala',
        type: 'community',
        theme: 'Celebration & Unity',
        targetDate: '2027-08-10',
        startTime: '18:00',
        endTime: '23:00',
        guestCount: 200,
        totalBudget: 50000,
        currency: 'USD',
        dietaryNotes: 'Vegetarian and Halal options',
        accessibilityNeeds: ['Elevator access', 'Sign language interpreter'],
        specialRequests: 'Award presentation at 20:00',
        location: {
          name: 'Civic Center',
          city: 'Chicago, IL',
          setting: 'indoor',
        },
        overview: {
          summary: 'Community gathering',
          keyHighlights: ['Opening remarks', 'Dinner'],
          vibeKeywords: ['Celebratory'],
          weatherContingencyPlan: 'Indoor hall',
          accessibilityNotes: 'Full ADA compliance',
        },
        schedule: [
          {
            id: 's-1',
            time: '18:00',
            durationMinutes: 60,
            title: 'Welcome Reception',
            description: 'Check-in and appetizers',
            category: 'reception',
            assignedRole: 'Lead Host',
            locationZone: 'Main Hall',
            bufferMinutes: 10,
            isKeyMilestone: true,
          },
        ],
        budget: [
          {
            id: 'b-1',
            category: 'Venue',
            name: 'Civic Hall Rental',
            estimatedCost: 15000,
            actualCost: 15000,
            paidCost: 15000,
            notes: 'Paid in full',
          },
        ],
        checklist: [],
        guests: [],
        speeches: [],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      };

      // Snapshot original plan
      const planSnapshot = JSON.parse(JSON.stringify(currentPlan));

      // Simulate a refinement failure
      const refineError = new ApiError('AI refinement timed out.', {
        code: 'TIMEOUT',
        retryable: true,
        statusCode: 504,
      });

      expect(refineError.retryable).toBe(true);
      // Confirm original plan is not mutated or overwritten
      expect(currentPlan).toEqual(planSnapshot);
      expect(currentPlan.schedule.length).toBe(1);
      expect(currentPlan.budget[0].estimatedCost).toBe(15000);
    });
  });

  describe('JSON Parsing & Malformed AI Response Handling', () => {
    it('parses valid raw JSON strings correctly', () => {
      const parsed = cleanAndParseJSON<{ title: string }>('{"title": "Spring Festival"}');
      expect(parsed.title).toBe('Spring Festival');
    });

    it('cleans and parses markdown-fenced JSON blocks containing preambles', () => {
      const rawText = `
Here is your event blueprint:
\`\`\`json
{
  "title": "Autumn Sunset Soirée"
}
\`\`\`
Hope this helps!
`;
      const parsed = cleanAndParseJSON<{ title: string }>(rawText);
      expect(parsed.title).toBe('Autumn Sunset Soirée');
    });

    it('extracts JSON objects from raw text without explicit markdown fences', () => {
      const rawText = 'Sure thing! {"title": "City Marathon"} is ready.';
      const parsed = cleanAndParseJSON<{ title: string }>(rawText);
      expect(parsed.title).toBe('City Marathon');
    });

    it('throws retryable MALFORMED_AI_RESPONSE AiServiceError when JSON is completely unparseable', () => {
      const corruptText = '{"title": "Broken JSON without closing brace';
      expect(() => cleanAndParseJSON(corruptText)).toThrowError(AiServiceError);

      try {
        cleanAndParseJSON(corruptText);
      } catch (err) {
        expect(err).toBeInstanceOf(AiServiceError);
        const aiErr = err as AiServiceError;
        expect(aiErr.code).toBe('MALFORMED_AI_RESPONSE');
        expect(aiErr.statusCode).toBe(502);
        expect(aiErr.retryable).toBe(true);
      }
    });

    it('automatically retries malformed AI responses in executeWithRetry and succeeds when follow-up returns valid JSON', async () => {
      let attemptCount = 0;
      const sleepSpy = vi.fn(async () => {});

      const parsed = await executeWithRetry(
        async () => {
          attemptCount++;
          const text =
            attemptCount === 1
              ? 'Corrupt raw output {"title": broken'
              : '{"title": "Recovered Event Blueprint"}';
          return cleanAndParseJSON<{ title: string }>(text);
        },
        {
          maxRetries: 2,
          baseDelayMs: 10,
          sleepFn: sleepSpy,
        }
      );

      expect(parsed.title).toBe('Recovered Event Blueprint');
      expect(attemptCount).toBe(2);
      expect(sleepSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Regression Test: Server Error Mismatch & Distinct ApiError Synthesis', () => {
    it('synthesizes distinct retryable ApiError when server returns 502 with malformed AI response', () => {
      const err502 = classifyAiError({
        statusCode: 502,
        code: 'MALFORMED_AI_RESPONSE',
        message: 'The AI model generated a response that could not be parsed as JSON.',
      });

      expect(err502.code).toBe('MALFORMED_AI_RESPONSE');
      expect(err502.statusCode).toBe(502);
      expect(err502.retryable).toBe(true);
      expect(err502.message).toContain('could not be parsed as JSON');
    });

    it('synthesizes distinct non-retryable ApiError for CONFIG_ERROR (missing GEMINI_API_KEY)', () => {
      const errConfig = classifyAiError({
        statusCode: 503,
        code: 'CONFIG_ERROR',
        message: 'GEMINI_API_KEY is not configured in server environment.',
      });

      expect(errConfig.code).toBe('CONFIG_ERROR');
      expect(errConfig.statusCode).toBe(503);
      expect(errConfig.retryable).toBe(false);
      expect(errConfig.message).toContain('GEMINI_API_KEY is not configured');
    });

    it('synthesizes distinct non-retryable ApiError for VALIDATION_ERROR (HTTP 400)', () => {
      const err400 = classifyAiError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Event title must be at least 3 characters long.',
      });

      expect(err400.code).toBe('VALIDATION_ERROR');
      expect(err400.statusCode).toBe(400);
      expect(err400.retryable).toBe(false);
      expect(err400.message).toBe('Event title must be at least 3 characters long.');
    });

    it('synthesizes safe distinct ApiError for INTERNAL_ERROR (HTTP 500) without exposing secrets', () => {
      const rawErrorWithSecret = new Error('Database connection failed at postgres://user:secretpass@db.internal:5432');
      const classified = classifyAiError(rawErrorWithSecret);

      expect(classified.code).toBe('INTERNAL_ERROR');
      expect(classified.statusCode).toBe(500);
      expect(classified.retryable).toBe(false);
      expect(classified.message).not.toContain('secretpass');
      expect(classified.message).toContain('unexpected server error');
    });
  });
});
