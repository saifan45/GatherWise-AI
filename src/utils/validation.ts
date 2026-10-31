/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  EventGenerationRequest,
  EventRefineRequest,
  SpeechGenerationRequest,
  EventPlan,
  TimelineItem,
  BudgetItem,
  ChecklistItem,
  SpeechItem,
  EventOverview,
  EventType,
  EventSetting,
  TimelineCategory,
  BudgetCategory,
  ChecklistPhase,
  TaskPriority,
  SpeechType,
} from '../types/event.ts';
import { ALL_BUDGET_CATEGORIES } from './budget.ts';

export interface ValidationError {
  field: string;
  message: string;
}

export const VALID_EVENT_TYPES: EventType[] = ['wedding', 'birthday', 'community'];
export const VALID_SETTINGS: EventSetting[] = ['indoor', 'outdoor', 'hybrid'];
export const VALID_TIMELINE_CATEGORIES: TimelineCategory[] = [
  'ceremony',
  'reception',
  'logistics',
  'entertainment',
  'food_beverage',
  'speech',
  'photo',
];
export const VALID_CHECKLIST_PHASES: ChecklistPhase[] = [
  '12_months',
  '6_months',
  '3_months',
  '1_month',
  '1_week',
  'day_of',
  'post_event',
];
export const VALID_PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];
export const VALID_SPEECH_TYPES: SpeechType[] = [
  'vow',
  'welcome_toast',
  'keynote',
  'closing_thanks',
  'invitation_card',
];
export const VALID_SPEECH_TONES = ['heartfelt', 'joyful_witty', 'inspirational', 'formal_dignified'] as const;

/**
 * Returns today's calendar date string in YYYY-MM-DD format based on local time.
 * Avoids UTC rollover discrepancies for evening local timezones.
 */
export function getLocalTodayDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates calendar date string (YYYY-MM-DD), ensuring real days in month and leap year rules.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1900 || y > 2200) return false;
  if (m < 1 || m > 12) return false;

  const daysInMonth = new Date(y, m, 0).getDate();
  return d >= 1 && d <= daysInMonth;
}

/**
 * Checks if a given calendar date (YYYY-MM-DD) is today or in the future
 * relative to the user/event reference date string.
 */
export function isUpcomingOrTodayDate(dateStr: string, referenceDateStr?: string): boolean {
  if (!isValidCalendarDate(dateStr)) return false;
  const todayStr = referenceDateStr || getLocalTodayDateString();
  return dateStr >= todayStr;
}

/**
 * Validates 24-hour time string (HH:MM) from 00:00 to 23:59.
 */
export function isValidTimeFormat(timeStr: string): boolean {
  if (typeof timeStr !== 'string' || !/^\d{1,2}:\d{2}$/.test(timeStr)) return false;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return false;
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Validates event request strictly with dynamic past-date rejection.
 */
export function validateEventRequest(
  raw: unknown,
  referenceDateStr?: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!raw || typeof raw !== 'object') {
    return [{ field: 'request', message: 'Invalid payload: expected a JSON object.' }];
  }

  const req = raw as Partial<EventGenerationRequest>;

  // Title validation
  if (typeof req.title !== 'string' || req.title.trim().length < 3) {
    errors.push({ field: 'title', message: 'Event title must be at least 3 characters long.' });
  } else if (req.title.trim().length > 100) {
    errors.push({ field: 'title', message: 'Event title cannot exceed 100 characters.' });
  }

  // Type validation
  if (!req.type || !VALID_EVENT_TYPES.includes(req.type)) {
    errors.push({
      field: 'type',
      message: 'Please select a valid event category: wedding, birthday, or community.',
    });
  }

  // Target date validation with dynamic past-date check
  if (!req.targetDate || !isValidCalendarDate(req.targetDate)) {
    errors.push({
      field: 'targetDate',
      message: 'Please provide a valid calendar date in YYYY-MM-DD format.',
    });
  } else if (!isUpcomingOrTodayDate(req.targetDate, referenceDateStr)) {
    errors.push({
      field: 'targetDate',
      message: 'Event date must be today or in the future. Past dates cannot be scheduled for new events.',
    });
  }

  // Time validation
  if (!req.startTime || !isValidTimeFormat(req.startTime)) {
    errors.push({ field: 'startTime', message: 'Start time must be a valid 24h time in HH:MM format (00:00 to 23:59).' });
  }

  if (!req.endTime || !isValidTimeFormat(req.endTime)) {
    errors.push({ field: 'endTime', message: 'End time must be a valid 24h time in HH:MM format (00:00 to 23:59).' });
  }

  if (req.startTime && req.endTime && req.startTime === req.endTime) {
    errors.push({ field: 'endTime', message: 'Event start time and end time cannot be identical.' });
  }

  // Guest count boundary: must be an integer, reject fractional numbers (e.g. 15.5)
  if (typeof req.guestCount !== 'number' || isNaN(req.guestCount) || !Number.isInteger(req.guestCount) || req.guestCount < 1) {
    errors.push({ field: 'guestCount', message: 'Guest count must be a positive whole integer of at least 1 attendee.' });
  } else if (req.guestCount > 20000) {
    errors.push({ field: 'guestCount', message: 'Guest count exceeds maximum supported ceiling (20,000).' });
  }

  // Total budget boundary
  if (typeof req.totalBudget !== 'number' || isNaN(req.totalBudget) || !isFinite(req.totalBudget) || req.totalBudget < 50) {
    errors.push({ field: 'totalBudget', message: 'Total budget must be a positive number of at least $50.' });
  } else if (req.totalBudget > 5000000) {
    errors.push({ field: 'totalBudget', message: 'Total budget exceeds maximum supported ceiling ($5,000,000).' });
  }

  // Location city
  if (typeof req.locationCity !== 'string' || req.locationCity.trim().length < 2) {
    errors.push({ field: 'locationCity', message: 'City or Region is required (at least 2 characters).' });
  } else if (req.locationCity.trim().length > 100) {
    errors.push({ field: 'locationCity', message: 'Location city cannot exceed 100 characters.' });
  }

  // Setting
  if (req.setting && !VALID_SETTINGS.includes(req.setting)) {
    errors.push({ field: 'setting', message: 'Setting must be indoor, outdoor, or hybrid.' });
  }

  return errors;
}

export function validateEventRefineRequest(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!raw || typeof raw !== 'object') {
    return [{ field: 'request', message: 'Invalid payload: expected an object.' }];
  }

  const req = raw as Partial<EventRefineRequest>;
  if (!req.currentPlan || typeof req.currentPlan !== 'object') {
    errors.push({ field: 'currentPlan', message: 'currentPlan object is required.' });
  } else {
    if (!req.currentPlan.id || typeof req.currentPlan.id !== 'string') {
      errors.push({ field: 'currentPlan.id', message: 'currentPlan must have a valid id.' });
    }
    if (!Array.isArray(req.currentPlan.schedule)) {
      errors.push({ field: 'currentPlan.schedule', message: 'currentPlan must contain a schedule array.' });
    }
    if (!Array.isArray(req.currentPlan.budget)) {
      errors.push({ field: 'currentPlan.budget', message: 'currentPlan must contain a budget array.' });
    }
  }

  if (typeof req.instruction !== 'string' || req.instruction.trim().length < 3) {
    errors.push({ field: 'instruction', message: 'Instruction must be at least 3 characters long.' });
  } else if (req.instruction.trim().length > 1000) {
    errors.push({ field: 'instruction', message: 'Instruction cannot exceed 1000 characters.' });
  }

  if (req.aspect && !['all', 'schedule', 'budget', 'checklist', 'speeches'].includes(req.aspect)) {
    errors.push({ field: 'aspect', message: 'Aspect must be all, schedule, budget, checklist, or speeches.' });
  }

  return errors;
}

export function validateSpeechRequest(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!raw || typeof raw !== 'object') {
    return [{ field: 'request', message: 'Invalid payload: expected an object.' }];
  }

  const req = raw as Partial<SpeechGenerationRequest>;

  if (typeof req.speaker !== 'string' || req.speaker.trim().length < 2) {
    errors.push({ field: 'speaker', message: 'Speaker or role name is required (at least 2 characters).' });
  }

  if (!req.type || !VALID_SPEECH_TYPES.includes(req.type)) {
    errors.push({ field: 'type', message: 'Please select a valid speech or invitation type.' });
  }

  if (req.tone && !VALID_SPEECH_TONES.includes(req.tone)) {
    errors.push({ field: 'tone', message: 'Please select a valid tone.' });
  }

  return errors;
}

/**
 * Sanitizes raw text strictly against HTML injection, script tags, event handlers,
 * and dangerous control characters, ensuring safe plain-text storage.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    // Strip script and style blocks including their inner text/code
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip all remaining HTML tag envelopes (<img ...>, <svg ...>, <a>, etc.)
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Strip javascript: pseudo-protocol strings
    .replace(/javascript:/gi, '')
    // Strip invisible non-printable control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Validates AI output structure strictly. Identifies missing or broken elements
 * without masking errors silently.
 */
export function validateAIEventPlanOutput(raw: unknown): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: [{ field: 'ai_response', message: 'AI response was not a valid object.' }] };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== 'string' || obj.title.trim().length < 2) {
    errors.push({ field: 'title', message: 'AI output missing valid title string.' });
  }

  if (!obj.overview || typeof obj.overview !== 'object') {
    errors.push({ field: 'overview', message: 'AI output missing overview object.' });
  }

  if (!Array.isArray(obj.schedule) || obj.schedule.length === 0) {
    errors.push({ field: 'schedule', message: 'AI output missing schedule milestone array.' });
  }

  if (!Array.isArray(obj.budget) || obj.budget.length === 0) {
    errors.push({ field: 'budget', message: 'AI output missing budget array.' });
  }

  if (!Array.isArray(obj.checklist)) {
    errors.push({ field: 'checklist', message: 'AI output missing checklist array.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates and safely sanitizes conforming AI output into a guaranteed conforming EventPlan.
 * Rejects corrupt input rather than silently converting invalid input into plausible data.
 */
export function validateAndSanitizeAIPlan(
  raw: unknown,
  baseReq: EventGenerationRequest
): EventPlan {
  const validation = validateAIEventPlanOutput(raw);
  if (!validation.isValid) {
    throw new Error(`AI generated plan failed structural validation: ${validation.errors.map((e) => e.message).join('; ')}`);
  }

  const planObj = raw as Record<string, unknown>;
  const rawOverview = planObj.overview as Record<string, unknown>;

  const overview: EventOverview = {
    summary: sanitizeInput(rawOverview.summary || `A tailored ${baseReq.type} gathering curated for ${baseReq.guestCount} guests.`),
    keyHighlights: Array.isArray(rawOverview.keyHighlights)
      ? rawOverview.keyHighlights.map((h) => sanitizeInput(String(h))).filter(Boolean)
      : ['Personalized guest experience', 'Structured vendor timeline', 'Dedicated milestone moments'],
    vibeKeywords: Array.isArray(rawOverview.vibeKeywords)
      ? rawOverview.vibeKeywords.map((k) => sanitizeInput(String(k))).filter(Boolean)
      : ['Celebratory', 'Seamless', 'Intentional', 'Warm'],
    weatherContingencyPlan: sanitizeInput(rawOverview.weatherContingencyPlan || 'Indoor standby protocol ready.'),
    accessibilityNotes: sanitizeInput(rawOverview.accessibilityNotes || 'Standard accessibility accommodations arranged.'),
  };

  const rawSchedule = planObj.schedule as Array<Record<string, unknown>>;
  const schedule: TimelineItem[] = rawSchedule.map((sObj, idx) => {
    const rawTime = String(sObj.time || '');
    if (!isValidTimeFormat(rawTime)) {
      throw new Error(`Invalid milestone time at index ${idx}: "${rawTime}" is not a valid 24h HH:MM time.`);
    }

    const duration = Number(sObj.durationMinutes);
    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid milestone duration at index ${idx}: duration must be a positive number of minutes.`);
    }

    const category = sObj.category as TimelineCategory;
    if (!VALID_TIMELINE_CATEGORIES.includes(category)) {
      throw new Error(`Invalid milestone category at index ${idx}: "${category}" is not recognized.`);
    }

    return {
      id: `t-${idx + 1}-${Date.now()}`,
      time: rawTime,
      durationMinutes: Math.min(480, duration),
      title: sanitizeInput(String(sObj.title || `Milestone ${idx + 1}`)),
      description: sanitizeInput(String(sObj.description || '')),
      category,
      assignedRole: sanitizeInput(String(sObj.assignedRole || 'Event Coordinator')),
      locationZone: sanitizeInput(String(sObj.locationZone || 'Main Zone')),
      bufferMinutes: Math.max(0, Number(sObj.bufferMinutes) || 0),
      isKeyMilestone: Boolean(sObj.isKeyMilestone),
    };
  });

  const rawBudget = planObj.budget as Array<Record<string, unknown>>;
  const budget: BudgetItem[] = rawBudget.map((bObj, idx) => {
    const category = bObj.category as BudgetCategory;
    if (!ALL_BUDGET_CATEGORIES.includes(category)) {
      throw new Error(`Invalid budget category at index ${idx}: "${category}" is not recognized.`);
    }

    const estCost = Number(bObj.estimatedCost);
    const actCost = Number(bObj.actualCost);
    const paidCost = Number(bObj.paidCost);

    if (isNaN(estCost) || estCost < 0) {
      throw new Error(`Invalid estimated cost at budget item index ${idx}: must be non-negative.`);
    }
    if (isNaN(actCost) || actCost < 0) {
      throw new Error(`Invalid actual cost at budget item index ${idx}: must be non-negative.`);
    }

    return {
      id: `b-${idx + 1}-${Date.now()}`,
      category,
      name: sanitizeInput(String(bObj.name || `Budget Item ${idx + 1}`)),
      estimatedCost: estCost,
      actualCost: actCost,
      paidCost: isNaN(paidCost) || paidCost < 0 ? 0 : paidCost,
      notes: sanitizeInput(String(bObj.notes || '')),
      costSavingTip: bObj.costSavingTip ? sanitizeInput(String(bObj.costSavingTip)) : undefined,
    };
  });

  const rawChecklist = Array.isArray(planObj.checklist) ? (planObj.checklist as Array<Record<string, unknown>>) : [];
  const checklist: ChecklistItem[] = rawChecklist.map((cObj, idx) => {
    const phase = VALID_CHECKLIST_PHASES.includes(cObj.phase as ChecklistPhase)
      ? (cObj.phase as ChecklistPhase)
      : '1_month';
    const priority = VALID_PRIORITIES.includes(cObj.priority as TaskPriority)
      ? (cObj.priority as TaskPriority)
      : 'medium';

    return {
      id: `c-${idx + 1}-${Date.now()}`,
      phase,
      title: sanitizeInput(String(cObj.title || `Task ${idx + 1}`)),
      details: sanitizeInput(String(cObj.details || '')),
      category: sanitizeInput(String(cObj.category || 'General')),
      priority,
      completed: Boolean(cObj.completed),
      assignee: cObj.assignee ? sanitizeInput(String(cObj.assignee)) : 'Lead Planner',
    };
  });

  const rawSpeeches = Array.isArray(planObj.speeches) ? (planObj.speeches as Array<Record<string, unknown>>) : [];
  const speeches: SpeechItem[] = rawSpeeches.map((spObj, idx) => {
    const spType = VALID_SPEECH_TYPES.includes(spObj.type as SpeechType)
      ? (spObj.type as SpeechType)
      : 'welcome_toast';
    const toneValue = typeof spObj.tone === 'string' ? spObj.tone : '';
    const tone: SpeechItem['tone'] = (VALID_SPEECH_TONES as readonly string[]).includes(toneValue)
      ? (toneValue as SpeechItem['tone'])
      : 'heartfelt';

    return {
      id: `s-${idx + 1}-${Date.now()}`,
      type: spType,
      title: sanitizeInput(String(spObj.title || 'Welcome Remarks')),
      speaker: sanitizeInput(String(spObj.speaker || 'Host')),
      tone,
      content: sanitizeInput(String(spObj.content || '')),
      keyPoints: Array.isArray(spObj.keyPoints)
        ? spObj.keyPoints.map((k) => sanitizeInput(String(k))).filter(Boolean)
        : [],
    };
  });

  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: sanitizeInput(String(planObj.title || baseReq.title)),
    type: baseReq.type,
    theme: sanitizeInput(baseReq.theme || 'Elegant and intentional'),
    targetDate: baseReq.targetDate,
    startTime: baseReq.startTime,
    endTime: baseReq.endTime,
    location: {
      name: sanitizeInput(baseReq.locationName || 'Main Venue'),
      city: sanitizeInput(baseReq.locationCity),
      setting: baseReq.setting || 'indoor',
    },
    guestCount: baseReq.guestCount,
    totalBudget: baseReq.totalBudget,
    currency: '$',
    dietaryNotes: sanitizeInput(baseReq.dietaryNotes || ''),
    accessibilityNeeds: (baseReq.accessibilityNeeds || []).map(sanitizeInput),
    specialRequests: sanitizeInput(baseReq.specialRequests || ''),
    overview,
    schedule,
    budget,
    checklist,
    guests: [
      {
        id: `g-1-${Date.now()}`,
        name: 'Primary Hosts / VIP Group',
        group: 'Hosts & Organizers',
        rsvpStatus: 'attending',
        plusOnes: 1,
        dietary: 'none',
        tableNumber: 1,
      },
    ],
    speeches,
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
