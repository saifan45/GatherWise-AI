/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type {
  EventGenerationRequest,
  EventPlan,
  EventRefineRequest,
  SpeechGenerationRequest,
  SpeechItem,
} from './src/types/event.ts';
import {
  validateEventRequest,
  validateEventRefineRequest,
  validateSpeechRequest,
  validateAndSanitizeAIPlan,
  sanitizeInput,
  VALID_TIMELINE_CATEGORIES,
  VALID_CHECKLIST_PHASES,
  VALID_PRIORITIES,
  VALID_SPEECH_TYPES,
  VALID_SPEECH_TONES,
} from './src/utils/validation.ts';
import { ALL_BUDGET_CATEGORIES, calculateBudgetSummary } from './src/utils/budget.ts';
import { sortTimeline } from './src/utils/timeline.ts';
import { executeWithRetry, classifyAiError, cleanAndParseJSON } from './src/utils/aiRetry.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable trust proxy for Cloud Run and reverse proxy environments to track client IPs accurately
app.set('trust proxy', 1);

// Performance & Efficiency: Enable Gzip / Deflate compression for all responses
app.use(compression({ threshold: 512 }));

// Security: limit JSON body payload size to 2MB to prevent payload flood attacks
app.use(express.json({ limit: '2mb' }));

// Security Headers: Hardened defense against clickjacking, sniffing, MIME confusion, injection and XSS
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:;"
  );
  next();
});

// Enable CORS & OPTIONS preflight for AI Studio preview iframe and cross-origin embedding
app.use((req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// In-memory sliding window rate limiter with auto-pruning to prevent memory growth
const requestRateMap = new Map<string, { count: number; resetTime: number }>();

// Periodic memory garbage collection: sweep expired rate limit tokens every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestRateMap.entries()) {
    if (now > entry.resetTime) {
      requestRateMap.delete(ip);
    }
  }
}, 120000).unref();

// High-speed In-Memory TTL Cache for AI event blueprints & speech generations
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const aiResponseCache = new Map<string, CacheEntry<unknown>>();

// Periodic cleanup for AI response cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of aiResponseCache.entries()) {
    if (now > entry.expiresAt) {
      aiResponseCache.delete(key);
    }
  }
}, 300000).unref();

function getCached<T>(key: string): T | null {
  const entry = aiResponseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiResponseCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs = 15 * 60 * 1000): void {
  // Cap max entries to 200 to prevent heap exhaustion
  if (aiResponseCache.size > 200) {
    const oldestKey = aiResponseCache.keys().next().value;
    if (oldestKey) aiResponseCache.delete(oldestKey);
  }
  aiResponseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function createRateLimiter(maxRequests = 30, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const entry = requestRateMap.get(ip);

    if (!entry || now > entry.resetTime) {
      requestRateMap.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        error: 'Rate limit reached. Please wait a moment before sending another event request.',
        code: 'RATE_LIMITED',
        retryable: true,
        retryAfterSeconds: retryAfterSec,
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

// Initialize Google GenAI client securely on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
    timeout: 48000,
  },
});

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Health check endpoint
app.get(['/api/health', '/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// 1. Generate Complete Event Plan Endpoint
app.post(
  ['/api/events/generate-plan', '/events/generate-plan'],
  createRateLimiter(25, 60000),
  async (req: Request, res: Response) => {
    try {
      const body: EventGenerationRequest = req.body;
      const validationErrors = validateEventRequest(body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          retryable: false,
          details: validationErrors,
        });
      }

      // High-efficiency caching: check if identical request was generated recently
      const cacheKey = `plan:${body.type}:${body.title.trim().toLowerCase()}:${body.targetDate}:${body.startTime}:${body.endTime}:${body.guestCount}:${body.totalBudget}`;
      const cached = getCached<{ plan: EventPlan; budgetSummary: unknown }>(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json({
          success: true,
          plan: cached.plan,
          budgetSummary: cached.budgetSummary,
        });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in server environment. Please set up your key in AI Studio Secrets.',
          code: 'CONFIG_ERROR',
          retryable: false,
        });
      }

      const prompt = `
You are GatherWise AI, an expert event planner specializing in weddings, milestone birthdays, and community festivals.
Create an exhaustive, professional, and practical event plan for the following event:

EVENT DETAILS:
- Event Title: "${sanitizeInput(body.title)}"
- Event Type: ${body.type}
- Aesthetic Theme & Vibe: "${sanitizeInput(body.theme || 'Elegant and intentional')}"
- Target Date: ${body.targetDate}
- Window: ${body.startTime} to ${body.endTime}
- Location: "${sanitizeInput(body.locationName || 'Main Venue')}" in ${sanitizeInput(body.locationCity)} (${body.setting})
- Expected Guest Count: ${body.guestCount}
- Target Total Budget: $${body.totalBudget.toLocaleString()}
- Dietary Considerations: "${sanitizeInput(body.dietaryNotes || 'Standard accommodations')}"
- Accessibility Needs: ${(body.accessibilityNeeds || []).map(sanitizeInput).join(', ') || 'Standard ADA access'}
- Special Requests: "${sanitizeInput(body.specialRequests || 'None')}"

INSTRUCTIONS:
1. Schedule: Provide 6 to 8 realistic, chronologically ordered run-of-show milestones from prep to wrap-up. Realistic duration in minutes, buffer minutes, specific zone, assigned role, and milestone status. Keep milestone descriptions to 1 clear, punchy sentence.
2. Budget: Break down 7 to 9 realistic expense items across categories (Venue, Catering & Bar, Photography & Video, Entertainment & Sound, Decor & Floral, Logistics & Rentals, Permits & Insurance, Contingency). Sum of estimatedCost should roughly match the target budget $${body.totalBudget}. Keep notes concise. Include realistic actualCost estimates, and actionable cost-saving tips.
3. Checklist: Generate 6 essential planning tasks grouped by phase (12_months, 6_months, 3_months, 1_month, 1_week, day_of), assigned role, priority, and actionable 1-sentence description.
4. Speeches: Create 1 customized, touching speech or toast tailored specifically to this event (100-150 words).
5. Overview: Provide a compelling 2-sentence summary, 3 key highlights, 4 vibe keywords, practical weather contingency instructions, and accessibility accommodations.

Return strictly valid JSON matching the schema.
`;

      const { fullPlan, budgetSummary } = await executeWithRetry(
        async ({ timeoutMs }) => {
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
              abortSignal: AbortSignal.timeout(timeoutMs),
              systemInstruction:
                'You are GatherWise AI, a meticulous, world-class event planner. Produce structured, professional event blueprints with realistic budgets, timelines, and logistics. Keep responses focused, practical, and concise.',
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  overview: {
                    type: Type.OBJECT,
                    properties: {
                      summary: { type: Type.STRING },
                      keyHighlights: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      vibeKeywords: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      weatherContingencyPlan: { type: Type.STRING },
                      accessibilityNotes: { type: Type.STRING },
                    },
                    required: [
                      'summary',
                      'keyHighlights',
                      'vibeKeywords',
                      'weatherContingencyPlan',
                      'accessibilityNotes',
                    ],
                  },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.STRING, description: '24-hour time HH:MM' },
                        durationMinutes: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category: {
                          type: Type.STRING,
                          enum: [
                            'ceremony',
                            'reception',
                            'logistics',
                            'entertainment',
                            'food_beverage',
                            'speech',
                            'photo',
                          ],
                        },
                        assignedRole: { type: Type.STRING },
                        locationZone: { type: Type.STRING },
                        bufferMinutes: { type: Type.INTEGER },
                        isKeyMilestone: { type: Type.BOOLEAN },
                      },
                      required: [
                        'time',
                        'durationMinutes',
                        'title',
                        'description',
                        'category',
                        'assignedRole',
                        'locationZone',
                        'bufferMinutes',
                        'isKeyMilestone',
                      ],
                    },
                  },
                  budget: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: {
                          type: Type.STRING,
                          enum: [
                            'Venue',
                            'Catering & Bar',
                            'Photography & Video',
                            'Entertainment & Sound',
                            'Decor & Floral',
                            'Logistics & Rentals',
                            'Permits & Insurance',
                            'Contingency',
                          ],
                        },
                        name: { type: Type.STRING },
                        estimatedCost: { type: Type.NUMBER },
                        actualCost: { type: Type.NUMBER },
                        paidCost: { type: Type.NUMBER },
                        notes: { type: Type.STRING },
                        costSavingTip: { type: Type.STRING },
                      },
                      required: ['category', 'name', 'estimatedCost', 'actualCost', 'paidCost', 'notes'],
                    },
                  },
                  checklist: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        phase: {
                          type: Type.STRING,
                          enum: [
                            '12_months',
                            '6_months',
                            '3_months',
                            '1_month',
                            '1_week',
                            'day_of',
                            'post_event',
                          ],
                        },
                        title: { type: Type.STRING },
                        details: { type: Type.STRING },
                        category: { type: Type.STRING },
                        priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                        completed: { type: Type.BOOLEAN },
                        assignee: { type: Type.STRING },
                      },
                      required: ['phase', 'title', 'details', 'category', 'priority', 'completed'],
                    },
                  },
                  speeches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: {
                          type: Type.STRING,
                          enum: [
                            'vow',
                            'welcome_toast',
                            'keynote',
                            'closing_thanks',
                            'invitation_card',
                          ],
                        },
                        title: { type: Type.STRING },
                        speaker: { type: Type.STRING },
                        tone: {
                          type: Type.STRING,
                          enum: ['heartfelt', 'joyful_witty', 'inspirational', 'formal_dignified'],
                        },
                        content: { type: Type.STRING },
                        keyPoints: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ['type', 'title', 'speaker', 'tone', 'content', 'keyPoints'],
                    },
                  },
                },
                required: ['title', 'overview', 'schedule', 'budget', 'checklist', 'speeches'],
              },
            },
          });

          const parsedData = cleanAndParseJSON<unknown>(response.text);
          const plan: EventPlan = validateAndSanitizeAIPlan(parsedData, body);
          plan.schedule = sortTimeline(plan.schedule);
          const summary = calculateBudgetSummary(plan.budget, plan.totalBudget);

          return { fullPlan: plan, budgetSummary: summary };
        },
        {
          maxRetries: 1,
          baseDelayMs: 800,
          maxDelayMs: 2500,
          totalDeadlineMs: 55000,
          perAttemptTimeoutMs: 48000,
        }
      );

      setCached(cacheKey, { plan: fullPlan, budgetSummary });
      res.setHeader('X-Cache', 'MISS');

      return res.json({
        success: true,
        plan: fullPlan,
        budgetSummary,
      });
    } catch (err: unknown) {
      console.error('[Generate Plan Error]', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      const classified = classifyAiError(err);
      return res.status(classified.statusCode).json({
        error: classified.message,
        code: classified.code,
        retryable: classified.retryable,
        retryAfterSeconds: classified.retryAfterSeconds,
        attempts: classified.attempts,
      });
    }
  }
);

// 2. Refine Existing Plan Endpoint
app.post(
  ['/api/events/refine-plan', '/events/refine-plan'],
  createRateLimiter(30, 60000),
  async (req: Request, res: Response) => {
    try {
      const validationErrors = validateEventRefineRequest(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          retryable: false,
          details: validationErrors,
        });
      }

      const { currentPlan, instruction, aspect }: EventRefineRequest = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in server environment.',
          code: 'CONFIG_ERROR',
          retryable: false,
        });
      }

      const prompt = `
You are GatherWise AI assistant. The user wants to adjust an existing event plan for "${currentPlan.title}" (${currentPlan.type}).
User instruction: "${sanitizeInput(instruction)}"
Target aspect to modify: "${aspect || 'all'}"

Current Plan Context:
- Guest Count: ${currentPlan.guestCount}
- Total Budget: $${currentPlan.totalBudget}
- Date & Time: ${currentPlan.targetDate} from ${currentPlan.startTime} to ${currentPlan.endTime}
- Setting: ${currentPlan.location.setting} in ${currentPlan.location.city}
- Schedule Items Count: ${currentPlan.schedule.length}
- Budget Items Count: ${currentPlan.budget.length}

Update the relevant sections of the plan while keeping existing IDs intact where applicable.
Return the updated schedule, budget, checklist, speeches, and overview.
`;

      const { updatedPlan, feedback } = await executeWithRetry(
        async ({ timeoutMs }) => {
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
              abortSignal: AbortSignal.timeout(timeoutMs),
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overview: {
                    type: Type.OBJECT,
                    properties: {
                      summary: { type: Type.STRING },
                      keyHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                      vibeKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                      weatherContingencyPlan: { type: Type.STRING },
                      accessibilityNotes: { type: Type.STRING },
                    },
                    required: [
                      'summary',
                      'keyHighlights',
                      'vibeKeywords',
                      'weatherContingencyPlan',
                      'accessibilityNotes',
                    ],
                  },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        time: { type: Type.STRING },
                        durationMinutes: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        category: {
                          type: Type.STRING,
                          enum: [
                            'ceremony',
                            'reception',
                            'logistics',
                            'entertainment',
                            'food_beverage',
                            'speech',
                            'photo',
                          ],
                        },
                        assignedRole: { type: Type.STRING },
                        locationZone: { type: Type.STRING },
                        bufferMinutes: { type: Type.INTEGER },
                        isKeyMilestone: { type: Type.BOOLEAN },
                      },
                      required: [
                        'time',
                        'durationMinutes',
                        'title',
                        'description',
                        'category',
                        'assignedRole',
                        'locationZone',
                        'bufferMinutes',
                        'isKeyMilestone',
                      ],
                    },
                  },
                  budget: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        category: {
                          type: Type.STRING,
                          enum: [
                            'Venue',
                            'Catering & Bar',
                            'Photography & Video',
                            'Entertainment & Sound',
                            'Decor & Floral',
                            'Logistics & Rentals',
                            'Permits & Insurance',
                            'Contingency',
                          ],
                        },
                        name: { type: Type.STRING },
                        estimatedCost: { type: Type.NUMBER },
                        actualCost: { type: Type.NUMBER },
                        paidCost: { type: Type.NUMBER },
                        notes: { type: Type.STRING },
                        costSavingTip: { type: Type.STRING },
                      },
                      required: ['category', 'name', 'estimatedCost', 'actualCost', 'paidCost', 'notes'],
                    },
                  },
                  checklist: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        phase: {
                          type: Type.STRING,
                          enum: [
                            '12_months',
                            '6_months',
                            '3_months',
                            '1_month',
                            '1_week',
                            'day_of',
                            'post_event',
                          ],
                        },
                        title: { type: Type.STRING },
                        details: { type: Type.STRING },
                        category: { type: Type.STRING },
                        priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                        completed: { type: Type.BOOLEAN },
                        assignee: { type: Type.STRING },
                      },
                      required: ['phase', 'title', 'details', 'category', 'priority', 'completed'],
                    },
                  },
                  aiFeedback: {
                    type: Type.STRING,
                    description:
                      'Clear, concise explanation of the adjustments made according to the user instruction.',
                  },
                },
                required: ['overview', 'schedule', 'budget', 'checklist', 'aiFeedback'],
              },
            },
          });

          const parsed = cleanAndParseJSON<{
            overview: EventPlan['overview'];
            schedule: EventPlan['schedule'];
            budget: EventPlan['budget'];
            checklist: EventPlan['checklist'];
            aiFeedback: string;
          }>(response.text);

          const sanitizedSchedule = sortTimeline(
            (parsed.schedule || currentPlan.schedule).map((s, idx) => ({
              id: s.id || `t-${idx}-${Date.now()}`,
              time: s.time || '16:00',
              durationMinutes: Math.max(5, Math.min(480, Number(s.durationMinutes) || 30)),
              title: sanitizeInput(s.title || `Milestone ${idx + 1}`),
              description: sanitizeInput(s.description || 'Milestone activity.'),
              category: VALID_TIMELINE_CATEGORIES.includes(s.category) ? s.category : 'reception',
              assignedRole: sanitizeInput(s.assignedRole || 'Coordinator'),
              locationZone: sanitizeInput(s.locationZone || 'Main Zone'),
              bufferMinutes: Math.max(0, Math.min(120, Number(s.bufferMinutes) || 5)),
              isKeyMilestone: Boolean(s.isKeyMilestone),
            }))
          );

          const sanitizedBudget = (parsed.budget || currentPlan.budget).map((b, idx) => ({
            id: b.id || `b-${idx}-${Date.now()}`,
            category: ALL_BUDGET_CATEGORIES.includes(b.category) ? b.category : 'Logistics & Rentals',
            name: sanitizeInput(b.name || `Budget Item ${idx + 1}`),
            estimatedCost: Math.max(0, Number(b.estimatedCost) || 0),
            actualCost: Math.max(0, Number(b.actualCost) || 0),
            paidCost: Math.max(0, Number(b.paidCost) || 0),
            notes: sanitizeInput(b.notes || ''),
            costSavingTip: b.costSavingTip ? sanitizeInput(b.costSavingTip) : undefined,
          }));

          const sanitizedChecklist = (parsed.checklist || currentPlan.checklist).map((c, idx) => ({
            id: c.id || `c-${idx}-${Date.now()}`,
            phase: VALID_CHECKLIST_PHASES.includes(c.phase) ? c.phase : '1_month',
            title: sanitizeInput(c.title || `Task ${idx + 1}`),
            details: sanitizeInput(c.details || ''),
            category: sanitizeInput(c.category || 'General'),
            priority: VALID_PRIORITIES.includes(c.priority) ? c.priority : 'medium',
            completed: Boolean(c.completed),
            assignee: c.assignee ? sanitizeInput(c.assignee) : 'Lead Planner',
          }));

          const updated: EventPlan = {
            ...currentPlan,
            overview: parsed.overview || currentPlan.overview,
            schedule: sanitizedSchedule,
            budget: sanitizedBudget,
            checklist: sanitizedChecklist,
            isTemplate: false,
            updatedAt: new Date().toISOString(),
          };

          return { updatedPlan: updated, feedback: parsed.aiFeedback || 'Plan successfully adjusted.' };
        },
        {
          maxRetries: 1,
          baseDelayMs: 800,
          maxDelayMs: 2500,
          totalDeadlineMs: 55000,
          perAttemptTimeoutMs: 48000,
        }
      );

      return res.json({
        success: true,
        plan: updatedPlan,
        feedback,
      });
    } catch (err: unknown) {
      console.error('[Refine Plan Error]', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      const classified = classifyAiError(err);
      return res.status(classified.statusCode).json({
        error: classified.message,
        code: classified.code,
        retryable: classified.retryable,
        retryAfterSeconds: classified.retryAfterSeconds,
        attempts: classified.attempts,
      });
    }
  }
);

// 3. Speech & Invitation Generator Endpoint
app.post(
  ['/api/events/generate-speech', '/events/generate-speech'],
  createRateLimiter(25, 60000),
  async (req: Request, res: Response) => {
    try {
      const body: SpeechGenerationRequest = req.body;
      const errors = validateSpeechRequest(body);
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          retryable: false,
          details: errors,
        });
      }

      const speechCacheKey = `speech:${body.type}:${body.speaker.trim().toLowerCase()}:${body.tone}:${body.eventTitle.trim().toLowerCase()}`;
      const cachedSpeech = getCached<SpeechItem>(speechCacheKey);
      if (cachedSpeech) {
        res.setHeader('X-Cache', 'HIT');
        return res.json({ success: true, speech: cachedSpeech });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in server environment.',
          code: 'CONFIG_ERROR',
          retryable: false,
        });
      }

      const prompt = `
Create a compelling, beautifully written ${body.type.replace('_', ' ')} for an upcoming ${body.eventType}:
- Event: "${sanitizeInput(body.eventTitle)}"
- Speaker / Role: "${sanitizeInput(body.speaker)}"
- Tone: ${body.tone}
- Audience Details: "${sanitizeInput(body.audienceDetails || 'Guests, family and community')}"
- Key Memories / Themes: "${sanitizeInput(body.memoriesOrThemes || 'Celebration, unity, joy, gratitude')}"

Deliver a complete, ready-to-deliver speech or invitation copy with key speaking notes/bullet points.
`;

      const speechItem = await executeWithRetry(
        async ({ timeoutMs }) => {
          const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
              abortSignal: AbortSignal.timeout(timeoutMs),
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.LOW,
              },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  keyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  deliveryTips: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'content', 'keyPoints', 'deliveryTips'],
              },
            },
          });

          const parsed = cleanAndParseJSON<{
            title: string;
            content: string;
            keyPoints: string[];
            deliveryTips: string[];
          }>(response.text);

          const item: SpeechItem = {
            id: `speech-${Date.now()}`,
            type: VALID_SPEECH_TYPES.includes(body.type) ? body.type : 'welcome_toast',
            title: sanitizeInput(parsed.title || `${body.speaker}'s ${body.type}`),
            speaker: sanitizeInput(body.speaker),
            tone: VALID_SPEECH_TONES.includes(body.tone) ? body.tone : 'heartfelt',
            content: sanitizeInput(parsed.content || 'Thank you everyone for joining us.'),
            keyPoints: Array.isArray(parsed.keyPoints)
              ? parsed.keyPoints.map((k) => sanitizeInput(String(k))).filter(Boolean)
              : [],
          };

          return item;
        },
        {
          maxRetries: 1,
          baseDelayMs: 800,
          maxDelayMs: 2500,
          totalDeadlineMs: 55000,
          perAttemptTimeoutMs: 48000,
        }
      );

      setCached(speechCacheKey, speechItem);
      res.setHeader('X-Cache', 'MISS');

      return res.json({ success: true, speech: speechItem });
    } catch (err: unknown) {
      console.error('[Generate Speech Error]', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      const classified = classifyAiError(err);
      return res.status(classified.statusCode).json({
        error: classified.message,
        code: classified.code,
        retryable: classified.retryable,
        retryAfterSeconds: classified.retryAfterSeconds,
        attempts: classified.attempts,
      });
    }
  }
);

// Global Express error handler to guarantee JSON error response format without any
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Express Error]', err);
  const status = typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number'
    ? (err as { status: number }).status
    : 500;
  const code = typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code: unknown }).code === 'string'
    ? (err as { code: string }).code
    : 'INTERNAL_ERROR';
  res.status(status).json({
    error: 'An unexpected server error occurred. Please try again.',
    code,
    retryable: false,
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GatherWise AI server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Server failed to start:', err);
  });
}

export default app;
