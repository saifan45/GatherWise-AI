/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { calculateBudgetSummary, formatCurrency, roundCurrency, ALL_BUDGET_CATEGORIES } from '../utils/budget.ts';
import {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  getNormalizedMinutes,
  sortTimeline,
  detectTimelineConflicts,
  generateRunSheetText,
} from '../utils/timeline.ts';
import {
  validateEventRequest,
  validateEventRefineRequest,
  validateSpeechRequest,
  sanitizeInput,
  isValidCalendarDate,
  isValidTimeFormat,
  getLocalTodayDateString,
  isUpcomingOrTodayDate,
  validateAIEventPlanOutput,
  validateAndSanitizeAIPlan,
} from '../utils/validation.ts';
import {
  STARTER_TEMPLATES,
  isTemplatePlan,
  duplicateTemplateAsUserPlan,
} from '../utils/storage.ts';
import { BudgetItem, TimelineItem, EventGenerationRequest } from '../types/event.ts';

describe('Validation Engine — Valid Inputs', () => {
  it('validates a complete wedding blueprint request', () => {
    const validWedding: EventGenerationRequest = {
      type: 'wedding',
      title: 'Serenade Vineyard Wedding',
      theme: 'Botanical Romance with Candlelight',
      targetDate: '2027-09-20',
      startTime: '15:30',
      endTime: '23:00',
      locationName: 'Serenade Valley Estate',
      locationCity: 'Napa, CA',
      setting: 'hybrid',
      guestCount: 140,
      totalBudget: 45000,
      dietaryNotes: '10 Vegetarians, 2 Nut allergies',
      accessibilityNeeds: ['Ramp entrance', 'Golf cart shuttle'],
      specialRequests: 'Sunset vow exchange',
    };

    const errors = validateEventRequest(validWedding);
    expect(errors).toEqual([]);
  });

  it('validates a complete milestone birthday request', () => {
    const validBirthday: EventGenerationRequest = {
      type: 'birthday',
      title: 'Marcus 40th Rooftop Soirée',
      theme: 'Urban Velvet & Brass Lounge',
      targetDate: '2027-11-05',
      startTime: '19:00',
      endTime: '01:00',
      locationName: 'Skyline Terrace',
      locationCity: 'Austin, TX',
      setting: 'indoor',
      guestCount: 75,
      totalBudget: 9000,
    };

    const errors = validateEventRequest(validBirthday);
    expect(errors).toEqual([]);
  });

  it('validates a complete community gathering request', () => {
    const validCommunity: EventGenerationRequest = {
      type: 'community',
      title: 'Riverfront Green Fair & Maker Market',
      theme: 'Sustainable Living & Local Artisans',
      targetDate: '2027-10-12',
      startTime: '10:00',
      endTime: '17:00',
      locationName: 'Memorial Park Lawn',
      locationCity: 'Portland, OR',
      setting: 'outdoor',
      guestCount: 500,
      totalBudget: 12000,
      accessibilityNeeds: ['ASL Interpreter', 'Sensory Quiet Tent'],
    };

    const errors = validateEventRequest(validCommunity);
    expect(errors).toEqual([]);
  });

  it('accurately verifies valid and leap-year calendar dates', () => {
    expect(isValidCalendarDate('2026-06-15')).toBe(true);
    expect(isValidCalendarDate('2028-02-29')).toBe(true); // 2028 is a leap year
    expect(isValidCalendarDate('2026-12-31')).toBe(true);
  });

  it('accurately verifies valid 24-hour time strings', () => {
    expect(isValidTimeFormat('00:00')).toBe(true);
    expect(isValidTimeFormat('09:30')).toBe(true);
    expect(isValidTimeFormat('16:45')).toBe(true);
    expect(isValidTimeFormat('23:59')).toBe(true);
  });
});

describe('Validation Engine — Rejection of Malformed Values', () => {
  it('rejects titles that are too short, empty, or whitespace only', () => {
    expect(validateEventRequest({ title: '' }).some((e) => e.field === 'title')).toBe(true);
    expect(validateEventRequest({ title: 'ab' }).some((e) => e.field === 'title')).toBe(true);
    expect(validateEventRequest({ title: '   ' }).some((e) => e.field === 'title')).toBe(true);
  });

  it('rejects non-integer fractional guest counts (e.g. 15.5 guests)', () => {
    const result = validateEventRequest({ guestCount: 15.5 });
    expect(result.some((e) => e.field === 'guestCount')).toBe(true);
    expect(result.find((e) => e.field === 'guestCount')?.message).toContain('whole integer');
  });

  it('rejects identical start and end times', () => {
    const result = validateEventRequest({
      startTime: '18:00',
      endTime: '18:00',
    });
    expect(result.some((e) => e.field === 'endTime')).toBe(true);
    expect(result.find((e) => e.field === 'endTime')?.message).toContain('cannot be identical');
  });

  it('rejects invalid or non-existent calendar dates', () => {
    expect(isValidCalendarDate('2026-02-29')).toBe(false); // 2026 is NOT a leap year
    expect(isValidCalendarDate('2026-02-30')).toBe(false);
    expect(isValidCalendarDate('2026-04-31')).toBe(false); // April has 30 days
    expect(isValidCalendarDate('2026-13-10')).toBe(false); // Month 13
    expect(isValidCalendarDate('2026-00-10')).toBe(false); // Month 0
    expect(isValidCalendarDate('1850-05-10')).toBe(false); // Out of supported calendar span (< 1900)
    expect(isValidCalendarDate('2350-05-10')).toBe(false); // Out of supported calendar span (> 2200)
    expect(isValidCalendarDate('not-a-date')).toBe(false);
  });

  it('rejects invalid time formats and out-of-range times', () => {
    expect(isValidTimeFormat('24:00')).toBe(false);
    expect(isValidTimeFormat('12:60')).toBe(false);
    expect(isValidTimeFormat('25:10')).toBe(false);
    expect(isValidTimeFormat('noon')).toBe(false);
    expect(isValidTimeFormat('')).toBe(false);
  });

  it('enforces guest count boundaries', () => {
    expect(validateEventRequest({ guestCount: 0 }).some((e) => e.field === 'guestCount')).toBe(true);
    expect(validateEventRequest({ guestCount: -15 }).some((e) => e.field === 'guestCount')).toBe(true);
    expect(validateEventRequest({ guestCount: 25000 }).some((e) => e.field === 'guestCount')).toBe(true);
    expect(validateEventRequest({ guestCount: NaN }).some((e) => e.field === 'guestCount')).toBe(true);
  });

  it('enforces total budget ceiling and floor boundaries', () => {
    expect(validateEventRequest({ totalBudget: 40 }).some((e) => e.field === 'totalBudget')).toBe(true);
    expect(validateEventRequest({ totalBudget: -1000 }).some((e) => e.field === 'totalBudget')).toBe(true);
    expect(validateEventRequest({ totalBudget: 6000000 }).some((e) => e.field === 'totalBudget')).toBe(true);
    expect(validateEventRequest({ totalBudget: NaN }).some((e) => e.field === 'totalBudget')).toBe(true);
  });

  it('validates event refine requests strictly', () => {
    const invalidRefine = validateEventRefineRequest({});
    expect(invalidRefine.length).toBeGreaterThan(0);

    const emptyInstruction = validateEventRefineRequest({
      currentPlan: { id: 'p1', schedule: [], budget: [] } as any,
      instruction: '  ',
    });
    expect(emptyInstruction.some((e) => e.field === 'instruction')).toBe(true);
  });

  it('validates speech requests strictly', () => {
    const invalidSpeech = validateSpeechRequest({ speaker: '', type: 'vow' });
    expect(invalidSpeech.some((e) => e.field === 'speaker')).toBe(true);
  });

  it('sanitizes script tags, html tags, event handlers, and control characters from inputs', () => {
    expect(sanitizeInput('<script>alert("xss")</script>Grand Gala Dinner')).toBe('Grand Gala Dinner');
    expect(sanitizeInput('<img src="x" onerror="alert(1)">Birthday Party')).toBe('Birthday Party');
    expect(sanitizeInput('<svg onload="stealData()">Community Festival')).toBe('Community Festival');
    expect(sanitizeInput('javascript:doBadThings()')).toBe('doBadThings()');
    expect(sanitizeInput('Title\x00\x08With\x1FControl\x7FChars')).toBe('TitleWithControlChars');
  });
});

describe('AI Output Validation & Rejection of Corrupt Structures', () => {
  const baseReq: EventGenerationRequest = {
    type: 'wedding',
    title: 'Test Wedding',
    theme: 'Romantic',
    targetDate: '2026-09-18',
    startTime: '16:00',
    endTime: '23:00',
    locationName: 'The Estate',
    locationCity: 'Sonoma, CA',
    setting: 'indoor',
    guestCount: 100,
    totalBudget: 25000,
  };

  it('strictly rejects AI responses missing schedule or budget arrays instead of silently fabricating fake data', () => {
    const missingSchedule = {
      title: 'Some Event',
      overview: { summary: 'A nice event' },
      budget: [{ category: 'Venue', name: 'Hall', estimatedCost: 1000, actualCost: 1000, paidCost: 0 }],
      checklist: [] as unknown[],
    };

    const result = validateAIEventPlanOutput(missingSchedule);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'schedule')).toBe(true);

    expect(() => validateAndSanitizeAIPlan(missingSchedule, baseReq)).toThrow(/structural validation/);
  });

  it('strictly rejects AI responses with malformed time format or non-positive durations', () => {
    const malformedAI = {
      title: 'AI Output Wedding',
      overview: { summary: 'Custom summary', keyHighlights: ['Highlight 1'] },
      schedule: [
        {
          time: 'invalid-time',
          durationMinutes: -100,
          title: 'Cocktails',
          category: 'reception',
          bufferMinutes: 10,
        },
      ],
      budget: [
        {
          category: 'Venue',
          name: 'Decor',
          estimatedCost: 1000,
          actualCost: 1000,
          paidCost: 0,
        },
      ],
      checklist: [] as unknown[],
      speeches: [] as unknown[],
    };

    expect(() => validateAndSanitizeAIPlan(malformedAI, baseReq)).toThrow(/Invalid milestone time/);
  });

  it('strictly rejects AI responses with negative budget costs', () => {
    const negativeBudgetAI = {
      title: 'AI Output Wedding',
      overview: { summary: 'Custom summary', keyHighlights: ['Highlight 1'] },
      schedule: [
        {
          time: '16:00',
          durationMinutes: 45,
          title: 'Ceremony',
          category: 'ceremony',
          bufferMinutes: 10,
        },
      ],
      budget: [
        {
          category: 'Venue',
          name: 'Main Hall',
          estimatedCost: -500, // Negative cost!
          actualCost: 1000,
          paidCost: 0,
        },
      ],
      checklist: [] as unknown[],
      speeches: [] as unknown[],
    };

    expect(() => validateAndSanitizeAIPlan(negativeBudgetAI, baseReq)).toThrow(/Invalid estimated cost/);
  });
});

describe('Budget Utilities — Arithmetic, Precision & Boundaries', () => {
  it('eliminates IEEE-754 floating point imprecision when summing item costs', () => {
    const items: BudgetItem[] = [
      { id: '1', category: 'Venue', name: 'Deposit', estimatedCost: 149.99, actualCost: 149.99, paidCost: 0, notes: '' },
      { id: '2', category: 'Decor & Floral', name: 'Ribbons', estimatedCost: 25.50, actualCost: 25.50, paidCost: 0, notes: '' },
      { id: '3', category: 'Permits & Insurance', name: 'Filing fee', estimatedCost: 0.01, actualCost: 0.01, paidCost: 0, notes: '' },
    ];

    const summary = calculateBudgetSummary(items, 200);
    // In naive JS: 149.99 + 25.50 + 0.01 = 175.50000000000003
    expect(summary.totalEstimated).toBe(175.50);
    expect(summary.totalActual).toBe(175.50);
    expect(summary.remainingActual).toBe(24.50);
  });

  it('correctly calculates zero budget and exact matching spend', () => {
    const items: BudgetItem[] = [
      {
        id: '1',
        category: 'Venue',
        name: 'Park Pavilion',
        estimatedCost: 1500,
        actualCost: 1500,
        paidCost: 1500,
        notes: '',
      },
    ];

    const exactSummary = calculateBudgetSummary(items, 1500);
    expect(exactSummary.totalActual).toBe(1500);
    expect(exactSummary.remainingActual).toBe(0);
    expect(exactSummary.overBudgetAmount).toBe(0);
    expect(exactSummary.percentSpent).toBe(100);
  });

  it('accurately reports over-budget variance when expenses exceed allocation', () => {
    const items: BudgetItem[] = [
      {
        id: '1',
        category: 'Venue',
        name: 'Hall',
        estimatedCost: 4000,
        actualCost: 5500,
        paidCost: 3000,
        notes: '',
      },
    ];

    const overSummary = calculateBudgetSummary(items, 4000);
    expect(overSummary.overBudgetAmount).toBe(1500);
    expect(overSummary.remainingActual).toBe(-1500);
    expect(overSummary.percentSpent).toBe(137.5);
  });

  it('aggregates category totals across all defined budget categories', () => {
    const items: BudgetItem[] = [
      { id: '1', category: 'Catering & Bar', name: 'Bar', estimatedCost: 2000, actualCost: 1800, paidCost: 900, notes: '' },
      { id: '2', category: 'Catering & Bar', name: 'Food', estimatedCost: 3000, actualCost: 3100, paidCost: 1500, notes: '' },
      { id: '3', category: 'Entertainment & Sound', name: 'DJ', estimatedCost: 1000, actualCost: 950, paidCost: 950, notes: '' },
    ];

    const summary = calculateBudgetSummary(items, 10000);
    expect(summary.categoryTotals['Catering & Bar'].actual).toBe(4900);
    expect(summary.categoryTotals['Catering & Bar'].count).toBe(2);
    expect(summary.categoryTotals['Entertainment & Sound'].actual).toBe(950);
    expect(summary.categoryTotals['Venue'].actual).toBe(0);
  });

  it('formats positive, negative, zero, and decimal currencies safely without displaying NaN', () => {
    expect(formatCurrency(12500)).toBe('$12,500');
    expect(formatCurrency(12500.50)).toBe('$12,500.50');
    expect(formatCurrency(-750)).toBe('-$750');
    expect(formatCurrency(0)).toBe('$0');
    expect(formatCurrency(NaN)).toBe('$0');
    expect(formatCurrency(Infinity)).toBe('$0');
    expect(formatCurrency(500, '€')).toBe('€500');
  });
});

describe('Timeline Utilities — Midnight Rollover & Conflict Preservation', () => {
  it('converts between time and minutes accurately', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('18:45')).toBe(1125);
    expect(minutesToTime(1125)).toBe('18:45');
  });

  it('correctly handles midnight rollover for evening events without placing 00:30 at the start', () => {
    const eveningStartTime = '18:00'; // 6 PM
    const items: TimelineItem[] = [
      { id: '3', time: '00:30', durationMinutes: 45, title: 'Late Night Sliders', category: 'food_beverage', description: '', assignedRole: '', locationZone: '', bufferMinutes: 10, isKeyMilestone: false },
      { id: '1', time: '18:30', durationMinutes: 60, title: 'Welcome Toast', category: 'reception', description: '', assignedRole: '', locationZone: '', bufferMinutes: 10, isKeyMilestone: false },
      { id: '2', time: '21:00', durationMinutes: 90, title: 'Dance Floor', category: 'entertainment', description: '', assignedRole: '', locationZone: '', bufferMinutes: 10, isKeyMilestone: true },
    ];

    const sorted = sortTimeline(items, eveningStartTime);
    // 18:30 must be first, 21:00 second, and 00:30 (Day 2) MUST be last!
    expect(sorted[0].id).toBe('1');
    expect(sorted[1].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('detects both direct overlaps and tight buffer warnings across midnight', () => {
    const eveningStartTime = '22:00';
    const items: TimelineItem[] = [
      { id: '1', time: '23:30', durationMinutes: 60, title: 'Midnight Count', category: 'entertainment', description: '', assignedRole: '', locationZone: '', bufferMinutes: 15, isKeyMilestone: true },
      { id: '2', time: '00:15', durationMinutes: 30, title: 'Champagne Toast', category: 'reception', description: '', assignedRole: '', locationZone: '', bufferMinutes: 10, isKeyMilestone: false },
    ];

    // Item 1 starts at 23:30 and lasts 60m -> ends at 00:30!
    // Item 2 starts at 00:15 -> overlaps with Item 1!
    const conflicts = detectTimelineConflicts(items, eveningStartTime);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].conflictType).toBe('overlap');
    expect(conflicts[0].description).toContain('directly overlapping');
  });

  it('never alters or mutates original user timeline items when detecting conflicts', () => {
    const items: TimelineItem[] = [
      { id: 'a', time: '16:00', durationMinutes: 60, title: 'A', category: 'ceremony', description: 'Original A', assignedRole: 'Lead', locationZone: 'Hall', bufferMinutes: 10, isKeyMilestone: false },
      { id: 'b', time: '16:30', durationMinutes: 45, title: 'B', category: 'photo', description: 'Original B', assignedRole: 'Photo', locationZone: 'Lawn', bufferMinutes: 10, isKeyMilestone: false },
    ];

    const conflicts = detectTimelineConflicts(items);
    expect(conflicts.length).toBe(1);

    // Items should retain exact original time and description
    expect(items[0].time).toBe('16:00');
    expect(items[0].durationMinutes).toBe(60);
    expect(items[1].time).toBe('16:30');
    expect(items[1].durationMinutes).toBe(45);
  });
});

describe('Template Isolation & Separation', () => {
  it('correctly flags showcase starter templates as templates', () => {
    expect(isTemplatePlan(STARTER_TEMPLATES.wedding)).toBe(true);
    expect(isTemplatePlan(STARTER_TEMPLATES.birthday)).toBe(true);
    expect(isTemplatePlan(STARTER_TEMPLATES.community)).toBe(true);
  });

  it('duplicates template into a separate, editable user plan without mutating original', () => {
    const originalWedding = STARTER_TEMPLATES.wedding;
    const userClone = duplicateTemplateAsUserPlan(originalWedding, 'My Dream Sonoma Wedding');

    expect(userClone.id).not.toBe(originalWedding.id);
    expect(userClone.title).toBe('My Dream Sonoma Wedding');
    expect(userClone.isTemplate).toBe(false);
    expect(userClone.schedule.length).toBe(originalWedding.schedule.length);
    expect(originalWedding.isTemplate).toBe(true);
  });
});

describe('Dynamic Date Validation & Timezone Handling', () => {
  it('correctly compares dynamic today, yesterday, and tomorrow dates relative to local time', () => {
    const now = new Date();
    const todayStr = getLocalTodayDateString(now);

    const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = getLocalTodayDateString(yDate);

    const tDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowStr = getLocalTodayDateString(tDate);

    // Dynamic past date check: yesterday must be rejected
    expect(isUpcomingOrTodayDate(yesterdayStr)).toBe(false);

    // Today must be accepted
    expect(isUpcomingOrTodayDate(todayStr)).toBe(true);

    // Tomorrow must be accepted
    expect(isUpcomingOrTodayDate(tomorrowStr)).toBe(true);
  });

  it('rejects past dates in validateEventRequest while accepting today and future dates', () => {
    const now = new Date();
    const todayStr = getLocalTodayDateString(now);
    const yesterdayStr = getLocalTodayDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const tomorrowStr = getLocalTodayDateString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    const baseEvent: EventGenerationRequest = {
      type: 'birthday',
      title: 'Celebration Day',
      theme: 'Modern Festive',
      targetDate: yesterdayStr,
      startTime: '14:00',
      endTime: '18:00',
      locationName: 'City Loft',
      locationCity: 'Chicago, IL',
      setting: 'indoor',
      guestCount: 50,
      totalBudget: 5000,
    };

    // Past date should fail validation with specific message
    const yesterdayErrors = validateEventRequest(baseEvent);
    expect(yesterdayErrors.some((e) => e.field === 'targetDate')).toBe(true);
    expect(yesterdayErrors.find((e) => e.field === 'targetDate')?.message).toContain('today or in the future');

    // Today should pass
    const todayErrors = validateEventRequest({ ...baseEvent, targetDate: todayStr });
    expect(todayErrors.some((e) => e.field === 'targetDate')).toBe(false);

    // Tomorrow should pass
    const tomorrowErrors = validateEventRequest({ ...baseEvent, targetDate: tomorrowStr });
    expect(tomorrowErrors.some((e) => e.field === 'targetDate')).toBe(false);
  });

  it('accurately verifies leap-year calendar dates across standard and century years', () => {
    // Standard leap years (divisible by 4)
    expect(isValidCalendarDate('2024-02-29')).toBe(true);
    expect(isValidCalendarDate('2028-02-29')).toBe(true);
    expect(isValidCalendarDate('2032-02-29')).toBe(true);

    // Non-leap years
    expect(isValidCalendarDate('2025-02-29')).toBe(false);
    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('2027-02-29')).toBe(false);

    // Century leap year (divisible by 400)
    expect(isValidCalendarDate('2000-02-29')).toBe(true);

    // Century non-leap year (divisible by 100 but not 400)
    expect(isValidCalendarDate('1900-02-29')).toBe(false);
    expect(isValidCalendarDate('2100-02-29')).toBe(false);
  });
});

describe('Run Sheet & Plan Export Integrity', () => {
  it('generates a formatted plain-text vendor run sheet with all operational sections', () => {
    const plan = {
      title: 'Solstice Botanical Wedding',
      type: 'wedding',
      targetDate: '2027-06-21',
      startTime: '16:00',
      endTime: '23:30',
      location: { name: 'Conservatory Hall', city: 'Seattle, WA', setting: 'indoor' },
      guestCount: 120,
      totalBudget: 35000,
      overview: {
        weatherContingencyPlan: 'Covered glass atrium standby protocol ready.',
        accessibilityNotes: 'Wheelchair ramp at East entrance; low-sensory lounge provided.',
      },
      schedule: [
        {
          id: '1',
          time: '16:00',
          durationMinutes: 45,
          title: 'Guest Arrival & Welcome Spritz',
          description: 'Acoustic duo performs in Courtyard',
          assignedRole: 'Maître d',
          locationZone: 'Courtyard',
          bufferMinutes: 15,
          isKeyMilestone: false,
          category: 'reception' as const,
        },
        {
          id: '2',
          time: '17:00',
          durationMinutes: 30,
          title: 'Vow Ceremony',
          description: 'Processional and exchange of vows',
          assignedRole: 'Officiant',
          locationZone: 'Main Chapel',
          bufferMinutes: 10,
          isKeyMilestone: true,
          category: 'ceremony' as const,
        },
      ],
      budgetActualTotal: 34200,
    };

    const runSheet = generateRunSheetText(plan);

    expect(runSheet).toContain('GATHERWISE AI EVENT RUN SHEET');
    expect(runSheet).toContain('EVENT: Solstice Botanical Wedding');
    expect(runSheet).toContain('TYPE: WEDDING');
    expect(runSheet).toContain('DATE: 2027-06-21 (16:00 - 23:30)');
    expect(runSheet).toContain('LOCATION: Conservatory Hall, Seattle, WA (indoor)');
    expect(runSheet).toContain('GUEST CAPACITY: 120');
    expect(runSheet).toContain('TOTAL BUDGET: $35,000 (Actual: $34,200)');
    expect(runSheet).toContain('[16:00 - 16:45] Guest Arrival & Welcome Spritz (45m)');
    expect(runSheet).toContain('Role: Maître d | Zone: Courtyard');
    expect(runSheet).toContain('[17:00 - 17:30] Vow Ceremony (30m)');
    expect(runSheet).toContain('Covered glass atrium standby protocol ready.');
    expect(runSheet).toContain('Wheelchair ramp at East entrance; low-sensory lounge provided.');
  });

  it('preserves midnight rollover in exported run sheet ordering', () => {
    const eveningPlan = {
      title: 'Midnight Soirée',
      type: 'birthday',
      targetDate: '2027-10-31',
      startTime: '20:00',
      endTime: '02:00',
      location: { name: 'Penthouse', city: 'Miami, FL', setting: 'indoor' },
      guestCount: 80,
      totalBudget: 15000,
      overview: {
        weatherContingencyPlan: 'Valet awning standby.',
        accessibilityNotes: 'Elevator access only.',
      },
      schedule: [
        {
          id: '1',
          time: '01:00',
          durationMinutes: 45,
          title: 'Late Night Gelato Bar',
          description: 'Artisanal cart arrives',
          assignedRole: 'Catering Lead',
          locationZone: 'Dining Deck',
          bufferMinutes: 10,
          isKeyMilestone: false,
          category: 'food_beverage' as const,
        },
        {
          id: '2',
          time: '20:30',
          durationMinutes: 60,
          title: 'Welcome Cocktails',
          description: 'Live DJ set begins',
          assignedRole: 'Host',
          locationZone: 'Main Lounge',
          bufferMinutes: 15,
          isKeyMilestone: true,
          category: 'reception' as const,
        },
      ],
    };

    const text = generateRunSheetText(eveningPlan);
    const pos2030 = text.indexOf('20:30');
    const pos0100 = text.indexOf('01:00');

    // 20:30 must appear BEFORE 01:00 in the chronological run of show
    expect(pos2030).toBeGreaterThan(-1);
    expect(pos0100).toBeGreaterThan(-1);
    expect(pos2030).toBeLessThan(pos0100);
  });
});

describe('End-to-End User Plan Mutation & Deterministic Calculations', () => {
  it('updates deterministic budget summary and category metrics without state pollution', () => {
    const initialBudget: BudgetItem[] = [
      { id: 'b1', category: 'Venue', name: 'Estate Rental', estimatedCost: 10000, actualCost: 9500, paidCost: 5000, notes: '' },
      { id: 'b2', category: 'Catering & Bar', name: 'Plated Dinner', estimatedCost: 8000, actualCost: 8200, paidCost: 4000, notes: '' },
    ];

    const initialSummary = calculateBudgetSummary(initialBudget, 20000);
    expect(initialSummary.totalEstimated).toBe(18000);
    expect(initialSummary.totalActual).toBe(17700);
    expect(initialSummary.remainingActual).toBe(2300);

    // Add a new expense item
    const updatedBudget: BudgetItem[] = [
      ...initialBudget,
      { id: 'b3', category: 'Photography & Video', name: 'Documentary Photo', estimatedCost: 3000, actualCost: 3100, paidCost: 1500, notes: '' },
    ];

    const updatedSummary = calculateBudgetSummary(updatedBudget, 20000);
    // 17,700 + 3,100 = 20,800 (over budget by 800)
    expect(updatedSummary.totalActual).toBe(20800);
    expect(updatedSummary.overBudgetAmount).toBe(800);
    expect(updatedSummary.remainingActual).toBe(-800);
    expect(updatedSummary.percentSpent).toBe(104);
  });

  it('detects timeline overlaps immediately when a user shifts a milestone start time', () => {
    const items: TimelineItem[] = [
      { id: 't1', time: '14:00', durationMinutes: 60, title: 'Ceremony', category: 'ceremony', description: '', assignedRole: 'Lead', locationZone: 'Hall', bufferMinutes: 15, isKeyMilestone: true },
      { id: 't2', time: '15:30', durationMinutes: 60, title: 'Cocktails', category: 'reception', description: '', assignedRole: 'Bar Lead', locationZone: 'Lawn', bufferMinutes: 10, isKeyMilestone: false },
    ];

    // Initially 14:00 (ends 15:00) with desired 15m buffer. Gap to 15:30 is 30m -> no conflict!
    expect(detectTimelineConflicts(items)).toHaveLength(0);

    // User shifts Cocktails 45 minutes earlier to 14:45
    const shiftedItems: TimelineItem[] = [
      items[0],
      { ...items[1], time: '14:45' },
    ];

    // Now Ceremony ends at 15:00 while Cocktails starts at 14:45 -> direct overlap conflict!
    const conflicts = detectTimelineConflicts(shiftedItems);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictType).toBe('overlap');
    expect(conflicts[0].description).toContain('directly overlapping');
  });
});
